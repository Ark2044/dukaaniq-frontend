import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScanFlow } from "./ScanFlow";
import { SIZE_ERROR, TYPE_ERROR } from "@/lib/scan/image";
import { mixedResult, scanLine, scanResult } from "@/test/billScanFixtures";
import { fail, mockApi, ok, renderWithProviders } from "@/test/utils";

const FAST = { intervalMs: 5, timeoutMs: 2000, maxTransientErrors: 3 };
const png = () => new File([new Uint8Array(2000)], "bill.png", { type: "image/png" });
const processing = () => ok({ scanId: "s-1", status: "PROCESSING" });
const completed = (result = scanResult([scanLine()])) => ok({ scanId: "s-1", status: "COMPLETED", error: null, result });

const objectUrls = { create: vi.fn(() => "blob:preview"), revoke: vi.fn() };

beforeEach(() => {
  objectUrls.create.mockClear();
  objectUrls.revoke.mockClear();
  // jsdom does not implement object URLs.
  Object.assign(URL, { createObjectURL: objectUrls.create, revokeObjectURL: objectUrls.revoke });
});
afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
});

async function chooseAndScan(file = png()) {
  await userEvent.upload(screen.getByLabelText("Upload from gallery/files"), file);
  await userEvent.click(await screen.findByRole("button", { name: "Scan this bill" }));
}

const startRoute = { "POST /api/v1/products/bill-scan": () => ok({ scanId: "s-1", status: "PROCESSING" }, 202) };

describe("ScanFlow: capture", () => {
  it("offers a camera input and a separate gallery input", () => {
    mockApi({});
    renderWithProviders(<ScanFlow polling={FAST} />);
    const camera = screen.getByLabelText("Take a photo");
    const gallery = screen.getByLabelText("Upload from gallery/files");
    expect(camera).toHaveAttribute("capture", "environment");
    expect(camera).toHaveAttribute("accept", "image/jpeg,image/png,application/pdf");
    expect(gallery).not.toHaveAttribute("capture");
    expect(gallery).toHaveAttribute("accept", "image/jpeg,image/png,application/pdf");
  });

  it("rejects an unsupported file type without uploading", async () => {
    const fetchFn = mockApi({});
    renderWithProviders(<ScanFlow polling={FAST} />);
    const gif = new File(["x"], "bill.gif", { type: "image/gif" });
    fireEvent.change(screen.getByLabelText("Upload from gallery/files"), { target: { files: [gif] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(TYPE_ERROR);
    expect(screen.queryByRole("button", { name: "Scan this bill" })).not.toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("rejects a file over 10 MB", async () => {
    mockApi({});
    renderWithProviders(<ScanFlow polling={FAST} />);
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "huge.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Take a photo"), { target: { files: [big] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(SIZE_ERROR);
    expect(screen.queryByRole("button", { name: "Scan this bill" })).not.toBeInTheDocument();
  });

  it("previews an image and revokes the object URL on unmount", async () => {
    mockApi({});
    const { unmount } = renderWithProviders(<ScanFlow polling={FAST} />);
    await userEvent.upload(screen.getByLabelText("Upload from gallery/files"), png());
    expect(await screen.findByAltText("Preview of your bill")).toHaveAttribute("src", "blob:preview");
    unmount();
    expect(objectUrls.revoke).toHaveBeenCalledWith("blob:preview");
  });
});

describe("ScanFlow: processing", () => {
  it("uploads multipart, polls PROCESSING -> COMPLETED, then shows the review", async () => {
    const uploads: FormData[] = [];
    let polls = 0;
    mockApi({
      "POST /api/v1/products/bill-scan": ({ init }) => {
        uploads.push(init.body as FormData);
        return ok({ scanId: "s-1", status: "PROCESSING" }, 202);
      },
      "GET /api/v1/products/bill-scan/s-1": () => {
        polls += 1;
        return polls < 3 ? processing() : completed();
      },
      "GET /api/v1/products/categories": () => ok([]),
    });
    renderWithProviders(<ScanFlow polling={FAST} />);
    await chooseAndScan();

    expect(await screen.findByText("Reading your bill…")).toBeInTheDocument();
    expect(await screen.findByText("Sharma Traders")).toBeInTheDocument();
    expect(polls).toBe(3);
    expect(uploads[0]).toBeInstanceOf(FormData);
    expect((uploads[0].get("file") as File).name).toBe("bill.png");
    expect(screen.getByRole("group", { name: /Line 1: Tata Salt/ })).toBeInTheDocument();
  });

  it("can be cancelled and returns to the capture step", async () => {
    mockApi({
      ...startRoute,
      "GET /api/v1/products/bill-scan/s-1": processing,
    });
    renderWithProviders(<ScanFlow polling={FAST} />);
    await chooseAndScan();
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("Scan a supplier bill")).toBeInTheDocument();
  });

  it("explains AI_NOT_CONFIGURED and offers the manual alternatives", async () => {
    mockApi({
      "POST /api/v1/products/bill-scan": () => fail(503, "AI_NOT_CONFIGURED", "AI is not configured"),
    });
    renderWithProviders(<ScanFlow polling={FAST} />);
    await chooseAndScan();

    expect(await screen.findByRole("alert")).toHaveTextContent(/Sarvam API key to be configured on the server/);
    expect(screen.getByRole("link", { name: "Add a product manually" })).toHaveAttribute("href", "/inventory/new");
    expect(screen.getByRole("link", { name: "Import a CSV" })).toHaveAttribute("href", "/inventory/import");
  });

  it("shows FAILED scans with the reason and tips for a clearer photo", async () => {
    mockApi({
      ...startRoute,
      "GET /api/v1/products/bill-scan/s-1": () =>
        ok({ scanId: "s-1", status: "FAILED", error: { code: "EXTRACTION_FAILED", message: "The page was unreadable" } }),
    });
    renderWithProviders(<ScanFlow polling={FAST} />);
    await chooseAndScan();

    expect(await screen.findByText("We couldn't read this bill")).toBeInTheDocument();
    expect(screen.getByText("The page was unreadable")).toBeInTheDocument();
    expect(screen.getByText("Try a clearer photo")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Scan a supplier bill")).toBeInTheDocument();
  });

  it("tolerates three consecutive transient poll errors", async () => {
    let polls = 0;
    mockApi({
      ...startRoute,
      "GET /api/v1/products/bill-scan/s-1": () => {
        polls += 1;
        return polls <= 3 ? fail(502, "UPSTREAM_ERROR", "Upstream hiccup") : completed();
      },
      "GET /api/v1/products/categories": () => ok([]),
    });
    renderWithProviders(<ScanFlow polling={FAST} />);
    await chooseAndScan();
    expect(await screen.findByText("Sharma Traders")).toBeInTheDocument();
  });

  it("fails after the fourth consecutive transient error", async () => {
    mockApi({
      ...startRoute,
      "GET /api/v1/products/bill-scan/s-1": () => fail(504, "UPSTREAM_TIMEOUT", "Upstream timed out"),
    });
    renderWithProviders(<ScanFlow polling={FAST} />);
    await chooseAndScan();
    expect(await screen.findByRole("alert")).toHaveTextContent("Upstream timed out");
  });

  it("does not retry non-transient poll errors", async () => {
    let polls = 0;
    mockApi({
      ...startRoute,
      "GET /api/v1/products/bill-scan/s-1": () => {
        polls += 1;
        return fail(404, "NOT_FOUND", "Scan not found");
      },
    });
    renderWithProviders(<ScanFlow polling={FAST} />);
    await chooseAndScan();
    expect(await screen.findByRole("alert")).toHaveTextContent("Scan not found");
    expect(polls).toBe(1);
  });

  it("gives up after the timeout with a friendly message", async () => {
    mockApi({ ...startRoute, "GET /api/v1/products/bill-scan/s-1": processing });
    renderWithProviders(<ScanFlow polling={{ intervalMs: 5, timeoutMs: 40, maxTransientErrors: 3 }} />);
    await chooseAndScan();
    expect(await screen.findByText("This is taking too long")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows a helpful message when the bill has no items", async () => {
    mockApi({ ...startRoute, "GET /api/v1/products/bill-scan/s-1": () => completed(scanResult([])) });
    renderWithProviders(<ScanFlow polling={FAST} />);
    await chooseAndScan();
    expect(await screen.findByText("No items found")).toBeInTheDocument();
  });
});

describe("ScanFlow: confirm to result", () => {
  it("reviews, confirms and shows per-line outcomes with navigation actions", async () => {
    const bodies: unknown[] = [];
    mockApi({
      ...startRoute,
      "GET /api/v1/products/bill-scan/s-1": () => completed(mixedResult()),
      "GET /api/v1/products/categories": () => ok(["Staples"]),
      "POST /api/v1/products/bill-scan/s-1/confirm": ({ init }) => {
        bodies.push(JSON.parse(String(init.body)));
        return ok({
          created: 1,
          restocked: 1,
          skipped: 1,
          failed: 0,
          lines: [
            { index: 0, action: "RESTOCK", status: "RESTOCKED", name: "Tata Salt", productId: "p-1", error: null },
            { index: 1, action: "CREATE", status: "FAILED", name: "Parle-G", productId: null, error: "A product like this already exists" },
            { index: 2, action: "SKIP", status: "SKIPPED", name: null, productId: null, error: null },
          ],
        });
      },
    });
    renderWithProviders(<ScanFlow polling={FAST} />);
    await chooseAndScan();
    await screen.findByText("Sharma Traders");
    await userEvent.click(screen.getByRole("button", { name: "Confirm and update inventory" }));

    expect(await screen.findByText("Bill applied to your inventory")).toBeInTheDocument();
    expect(bodies).toHaveLength(1);
    expect(screen.getByText("A product like this already exists")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View inventory" })).toHaveAttribute("href", "/inventory");

    await userEvent.click(screen.getByRole("button", { name: /Scan another bill/ }));
    expect(await screen.findByText("Scan a supplier bill")).toBeInTheDocument();
    expect(screen.queryByText("Sharma Traders")).not.toBeInTheDocument();
  });
});
