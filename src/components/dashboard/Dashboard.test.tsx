import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dashboard } from "./Dashboard";
import { fail, mockApi, ok, renderWithProviders } from "@/test/utils";
import { analytics } from "@/test/m3Fixtures";

afterEach(() => vi.unstubAllGlobals());

const SUMMARY = "GET /api/v1/analytics/summary";

describe("Dashboard", () => {
  it("renders today's sales, growth, period stats, credit, low stock and data notes", async () => {
    mockApi({ [SUMMARY]: () => ok(analytics()) });
    renderWithProviders(<Dashboard />);
    expect(screen.getByTestId("dashboard-loading")).toBeInTheDocument();

    expect(await screen.findByTestId("today-sales")).toHaveTextContent("₹4,850");
    expect(screen.getByText(/12\.8% up vs yesterday/)).toBeInTheDocument();
    expect(screen.getByText("▲")).toBeInTheDocument();
    expect(screen.getByText("Transactions", { selector: "dt" }).nextSibling).toHaveTextContent("18");
    expect(screen.getByText("Average order value").nextSibling).toHaveTextContent("₹269.44");
    expect(screen.getByText("₹31,200")).toBeInTheDocument();
    expect(screen.getByText("₹98,000")).toBeInTheDocument();

    expect(screen.getByText("Credit given today").nextSibling).toHaveTextContent("₹450");
    expect(screen.getByText("Outstanding credit")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Outstanding credit/ })).not.toBeInTheDocument();
    expect(screen.getByText("Outstanding credit").parentElement).toHaveTextContent("₹6,200");
    expect(screen.getByText("Outstanding credit").parentElement).toHaveTextContent("7 customers owe you");
    expect(screen.getByRole("link", { name: /Low stock/ })).toHaveAttribute("href", "/inventory/overview");

    const notes = screen.getByRole("complementary", { name: "About these numbers" });
    expect(within(notes).getByText("Sales are net of returns and exclude cancelled sales.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Bar chart of daily sales/ })).toBeInTheDocument();
  });

  it("shows a down arrow for negative growth", async () => {
    mockApi({ [SUMMARY]: () => ok(analytics({ growthVsYesterdayPercent: -8.25 })) });
    renderWithProviders(<Dashboard />);
    expect(await screen.findByText(/8\.3% down vs yesterday/)).toBeInTheDocument();
    expect(screen.getByText("▼")).toBeInTheDocument();
  });

  it("hides growth entirely when it is null", async () => {
    mockApi({ [SUMMARY]: () => ok(analytics({ growthVsYesterdayPercent: null })) });
    renderWithProviders(<Dashboard />);
    await screen.findByTestId("today-sales");
    expect(screen.queryByText(/vs yesterday/)).not.toBeInTheDocument();
    expect(screen.queryByText("▲")).not.toBeInTheDocument();
    expect(screen.queryByText("▼")).not.toBeInTheDocument();
  });

  it("shows simulated Paytm separately with a SIMULATED label, only when greater than zero", async () => {
    mockApi({
      [SUMMARY]: () =>
        ok(analytics({ collectionsToday: { cash: 100, upi: 200, card: 0, paytmVerified: 0, paytmSimulated: 350, refunds: 40 } })),
    });
    renderWithProviders(<Dashboard />);
    const collections = within((await screen.findByRole("heading", { name: "Collections today" })).closest("section") as HTMLElement);
    const simulatedRow = collections.getByText("Simulated").closest("div") as HTMLElement;
    expect(simulatedRow).toHaveTextContent("Paytm (demo)");
    expect(simulatedRow).toHaveTextContent("₹350");
    expect(collections.queryByText("Paytm (verified)")).not.toBeInTheDocument();
    expect(collections.getByText("Refunds")).toBeInTheDocument();
    expect(collections.getByText("recorded by you")).toBeInTheDocument();
  });

  it("omits the Paytm rows when both are zero", async () => {
    mockApi({ [SUMMARY]: () => ok(analytics()) });
    renderWithProviders(<Dashboard />);
    const collections = within((await screen.findByRole("heading", { name: "Collections today" })).closest("section") as HTMLElement);
    expect(collections.queryByText("Simulated")).not.toBeInTheDocument();
    expect(collections.queryByText(/Paytm/)).not.toBeInTheDocument();
    expect(collections.queryByText("Refunds")).not.toBeInTheDocument();
  });

  it("shows verified Paytm in its own row", async () => {
    mockApi({
      [SUMMARY]: () => ok(analytics({ collectionsToday: { cash: 0, upi: 0, card: 0, paytmVerified: 900, paytmSimulated: 0, refunds: 0 } })),
    });
    renderWithProviders(<Dashboard />);
    expect(await screen.findByText("Paytm (verified)")).toBeInTheDocument();
    expect(screen.queryByText("Simulated")).not.toBeInTheDocument();
  });

  it("shows verified and demo Paytm as two separate rows", async () => {
    mockApi({
      [SUMMARY]: () =>
        ok(analytics({ collectionsToday: { cash: 0, upi: 0, card: 0, paytmVerified: 900, paytmSimulated: 350, refunds: 0 } })),
    });
    renderWithProviders(<Dashboard />);
    const collections = within((await screen.findByRole("heading", { name: "Collections today" })).closest("section") as HTMLElement);
    const verifiedRow = collections.getByText("Paytm (verified)").closest("div") as HTMLElement;
    const demoRow = collections.getByText("Paytm (demo)").closest("div") as HTMLElement;
    expect(verifiedRow).not.toBe(demoRow);
    expect(verifiedRow).toHaveTextContent("₹900");
    expect(verifiedRow).not.toHaveTextContent("Simulated");
    expect(demoRow).toHaveTextContent("₹350");
    expect(demoRow).toHaveTextContent("Simulated");
  });

  it("invites the first sale when there is no sales data", async () => {
    mockApi({
      [SUMMARY]: () =>
        ok(
          analytics({
            todayStats: { salesAmount: 0, transactions: 0, averageOrderValue: 0 },
            last7DaysStats: { salesAmount: 0, transactions: 0, averageOrderValue: 0 },
            monthToDateStats: { salesAmount: 0, transactions: 0, averageOrderValue: 0 },
            growthVsYesterdayPercent: null,
            dailySales: [{ date: "2026-10-31", salesAmount: 0, transactions: 0 }],
          }),
        ),
    });
    renderWithProviders(<Dashboard />);
    expect(await screen.findByRole("link", { name: /Record your first sale/ })).toHaveAttribute("href", "/sales/new");
    expect(screen.queryByTestId("today-sales")).not.toBeInTheDocument();
  });

  it("shows an error state with retry", async () => {
    let failing = true;
    mockApi({ [SUMMARY]: () => (failing ? fail(500, "INTERNAL_ERROR", "Analytics unavailable") : ok(analytics())) });
    renderWithProviders(<Dashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Analytics unavailable");
    failing = false;
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByTestId("today-sales")).toBeInTheDocument();
  });

  it("keeps system status collapsed and only requests it when opened", async () => {
    const fn = mockApi({
      [SUMMARY]: () => ok(analytics()),
      "GET /api/v1/system/info": () =>
        ok({ name: "DukaanIQ", version: "0.1.0", environment: "local", payments: { provider: "MOCK", simulated: true }, ai: { sarvamConfigured: false } }),
    });
    renderWithProviders(<Dashboard />);
    await screen.findByTestId("today-sales");
    const toggle = screen.getByRole("button", { name: "System status" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(fn.mock.calls.some(([url]) => String(url).includes("/system/info"))).toBe(false);
    await userEvent.click(toggle);
    expect(await screen.findByText("Connected")).toBeInTheDocument();
  });
});
