import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SalesHistory } from "./SalesHistory";
import { fail, mockApi, ok, page, renderWithProviders } from "@/test/utils";
import { customer, saleSummary } from "@/test/m3Fixtures";

afterEach(() => vi.unstubAllGlobals());

describe("SalesHistory", () => {
  it("lists sales with status badges, voice badge, dues and links", async () => {
    mockApi({
      "GET /api/v1/sales": () =>
        ok(
          page([
            saleSummary({ id: "s-1", saleNumber: "S-000001", paymentStatus: "PAID" }),
            saleSummary({ id: "s-2", saleNumber: "S-000002", paymentStatus: "PARTIAL", dueAmount: 120, source: "VOICE" }),
            saleSummary({ id: "s-3", saleNumber: "S-000003", paymentStatus: "UNPAID", dueAmount: 500, customerName: null }),
            saleSummary({ id: "s-4", saleNumber: "S-000004", status: "CANCELLED", paymentStatus: null }),
          ]),
        ),
    });
    renderWithProviders(<SalesHistory />);
    expect(screen.getByTestId("sales-loading")).toBeInTheDocument();
    expect((await screen.findAllByText("S-000001")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Paid").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Partial").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unpaid").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Voice").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Due ₹120").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /S-000002/ })[0]).toHaveAttribute("href", "/sales/s-2");
  });

  it("sends filters as query parameters and resets to the first page", async () => {
    const urls: URL[] = [];
    mockApi({
      "GET /api/v1/customers": () => ok(page([customer()])),
      "GET /api/v1/sales": ({ url }) => {
        urls.push(url);
        return ok(page([saleSummary()]));
      },
    });
    renderWithProviders(<SalesHistory />);
    await screen.findAllByText("S-000123");
    expect(urls[0].searchParams.get("sort")).toBe("createdAt,desc");
    expect(urls[0].searchParams.get("size")).toBe("20");

    await userEvent.type(screen.getByLabelText("From"), "2026-10-01");
    await userEvent.type(screen.getByLabelText("To"), "2026-10-31");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "COMPLETED");
    await userEvent.selectOptions(screen.getByLabelText("Payment"), "PARTIAL");
    await userEvent.type(screen.getByLabelText("Search by sale number"), "S-000123");
    await userEvent.type(screen.getByLabelText("Customer"), "Ram");
    await userEvent.click(await screen.findByRole("button", { name: /Ramesh Kulkarni/ }));

    await waitFor(() => {
      const last = urls[urls.length - 1].searchParams;
      expect(last.get("from")).toBe("2026-10-01");
      expect(last.get("to")).toBe("2026-10-31");
      expect(last.get("status")).toBe("COMPLETED");
      expect(last.get("paymentStatus")).toBe("PARTIAL");
      expect(last.get("q")).toBe("S-000123");
      expect(last.get("customerId")).toBe("c-1");
      expect(last.get("page")).toBe("0");
    });
  });

  it("shows empty, filtered-empty and error states", async () => {
    let fails = true;
    mockApi({
      "GET /api/v1/sales": ({ url }) => {
        if (fails) return fail(500, "INTERNAL_ERROR", "Database is down");
        return ok(page(url.searchParams.get("status") ? [] : []));
      },
    });
    renderWithProviders(<SalesHistory />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Database is down");
    fails = false;
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("No sales yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Record your first sale/ })).toHaveAttribute("href", "/sales/new");

    await userEvent.selectOptions(screen.getByLabelText("Status"), "CANCELLED");
    expect(await screen.findByText("No sales match your filters")).toBeInTheDocument();
  });

  it("paginates", async () => {
    const pages: string[] = [];
    mockApi({
      "GET /api/v1/sales": ({ url }) => {
        pages.push(url.searchParams.get("page") ?? "");
        return ok(page([saleSummary()], { totalPages: 2, totalItems: 30, page: Number(url.searchParams.get("page")) }));
      },
    });
    renderWithProviders(<SalesHistory />);
    await screen.findAllByText("S-000123");
    await userEvent.click(screen.getByRole("button", { name: /Next/ }));
    await waitFor(() => expect(pages).toContain("1"));
  });
});
