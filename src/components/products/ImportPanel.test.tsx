import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportPanel, validateImportFile } from "./ImportPanel";
import { fail, mockApi, ok, renderWithProviders, unauthenticated } from "@/test/utils";

afterEach(() => vi.unstubAllGlobals());

const csv = (name = "products.csv") => new File(["name,unit,selling_price\nTata Salt,KG,28"], name, { type: "text/csv" });

const result = (dryRun: boolean) => ({
  dryRun,
  totalRows: 2,
  importedCount: 1,
  skippedCount: 1,
  rows: [
    { row: 2, name: "Tata Salt", status: dryRun ? "VALID" : "IMPORTED", errors: [] },
    { row: 3, name: "", status: "SKIPPED", errors: ["name is required"] },
  ],
});

describe("validateImportFile", () => {
  it("accepts csv files and rejects other types or files over 5 MB", () => {
    expect(validateImportFile(csv())).toBeNull();
    expect(validateImportFile(csv("PRODUCTS.CSV"))).toBeNull();
    expect(validateImportFile(csv("products.xlsx"))).toMatch(/\.csv/);
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.csv", { type: "text/csv" });
    expect(validateImportFile(big)).toMatch(/5 MB/);
  });
});

describe("ImportPanel", () => {
  it("links to the CSV template and keeps actions disabled until a file is chosen", () => {
    renderWithProviders(<ImportPanel />);
    expect(screen.getByRole("link", { name: /Download CSV template/ })).toHaveAttribute("href", "/api/v1/products/import/template");
    expect(screen.getByRole("button", { name: "Preview (dry run)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });

  it("rejects a non-csv file client-side without calling the API", async () => {
    const fetchFn = mockApi({ "GET /api/v1/auth/me": unauthenticated });
    renderWithProviders(<ImportPanel />);
    fireEvent.change(screen.getByLabelText("CSV file"), { target: { files: [csv("products.xlsx")] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("Please choose a .csv file.");
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
    expect(fetchFn.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("runs a dry run, sending multipart form data without a manual content type", async () => {
    const seen: Array<{ url: URL; init: RequestInit }> = [];
    mockApi({
      "POST /api/v1/products/import": (req) => {
        seen.push(req);
        return ok(result(true));
      },
    });
    renderWithProviders(<ImportPanel />);
    await userEvent.upload(screen.getByLabelText("CSV file"), csv());
    await userEvent.click(screen.getByRole("button", { name: "Preview (dry run)" }));

    expect(await screen.findByText("Preview (nothing was saved)")).toBeInTheDocument();
    expect(seen[0].url.searchParams.get("dryRun")).toBe("true");
    expect(seen[0].init.body).toBeInstanceOf(FormData);
    expect((seen[0].init.body as FormData).get("file")).toBeInstanceOf(File);
    expect(Object.keys(seen[0].init.headers as Record<string, string>)).not.toContain("Content-Type");
    expect(screen.getByText("Valid")).toBeInTheDocument();
  });

  it("imports for real and lists per-row status and errors", async () => {
    const dryRuns: string[] = [];
    mockApi({
      "POST /api/v1/products/import": ({ url }) => {
        dryRuns.push(String(url.searchParams.get("dryRun")));
        return ok(result(false));
      },
    });
    renderWithProviders(<ImportPanel />);
    await userEvent.upload(screen.getByLabelText("CSV file"), csv());
    await userEvent.click(screen.getByRole("button", { name: "Import" }));

    expect(await screen.findByText("Import complete")).toBeInTheDocument();
    expect(dryRuns).toEqual(["false"]);
    expect(screen.getByText("Imported")).toBeInTheDocument();
    expect(screen.getByText("Skipped")).toBeInTheDocument();
    expect(screen.getByText("name is required")).toBeInTheDocument();
    expect(screen.getByText(/Row 3/)).toBeInTheDocument();
    expect(await screen.findByText("1 product imported.")).toBeInTheDocument();
  });

  it("shows INVALID_CSV errors from the server", async () => {
    mockApi({ "POST /api/v1/products/import": () => fail(400, "INVALID_CSV", "Missing required column: unit") });
    renderWithProviders(<ImportPanel />);
    await userEvent.upload(screen.getByLabelText("CSV file"), csv());
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Missing required column: unit"));
  });
});
