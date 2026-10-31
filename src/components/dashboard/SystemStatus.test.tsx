import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SystemStatus } from "./SystemStatus";

function renderStatus() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SystemStatus />
    </QueryClientProvider>,
  );
}

const info = (overrides: object = {}) => ({
  success: true,
  data: {
    name: "DukaanIQ",
    version: "0.1.0",
    environment: "local",
    payments: { provider: "MOCK", simulated: true },
    ai: { sarvamConfigured: false },
    ...overrides,
  },
});

afterEach(() => vi.unstubAllGlobals());

describe("SystemStatus", () => {
  it("shows a loading state, then connected status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(info())));
    renderStatus();
    expect(screen.getByTestId("system-status-loading")).toBeInTheDocument();
    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0 · local")).toBeInTheDocument();
  });

  it("labels mock payments as SIMULATED, never as live", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(info())));
    renderStatus();
    expect(await screen.findByText("Simulated")).toBeInTheDocument();
    expect(screen.queryByText("Live integration")).not.toBeInTheDocument();
  });

  it("shows live only when the backend reports a non-simulated provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(info({ payments: { provider: "PAYTM_SANDBOX", simulated: false } })),
      ),
    );
    renderStatus();
    expect(await screen.findByText("Live integration")).toBeInTheDocument();
    expect(screen.queryByText("Simulated")).not.toBeInTheDocument();
  });

  it("shows an error state and recovers on retry", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(Response.json(info()));
    vi.stubGlobal("fetch", fetchFn);
    renderStatus();
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot reach the server/i);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Connected")).toBeInTheDocument();
  });
});
