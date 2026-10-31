import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicOnly, RequireAuth } from "./AuthGuard";
import { useAuth } from "./AuthProvider";
import { createTestClient, fail, mockApi, ok, renderWithProviders, session, unauthenticated } from "@/test/utils";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

beforeEach(() => router.replace.mockClear());
afterEach(() => vi.unstubAllGlobals());

describe("RequireAuth", () => {
  it("shows a skeleton while loading, then redirects unauthenticated users to /login", async () => {
    mockApi({ "GET /api/v1/auth/me": unauthenticated });
    renderWithProviders(
      <RequireAuth>
        <p>secret</p>
      </RequireAuth>,
    );
    expect(screen.getByTestId("auth-loading")).toBeInTheDocument();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("renders children for an authenticated session", async () => {
    mockApi({ "GET /api/v1/auth/me": () => ok(session()) });
    renderWithProviders(
      <RequireAuth>
        <p>secret</p>
      </RequireAuth>,
    );
    expect(await screen.findByText("secret")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("does not log the user out on a server error; offers a retry", async () => {
    mockApi({ "GET /api/v1/auth/me": () => fail(500, "INTERNAL_ERROR", "Server exploded") });
    renderWithProviders(
      <RequireAuth>
        <p>secret</p>
      </RequireAuth>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Server exploded");
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("PublicOnly", () => {
  it("redirects authenticated users to the dashboard", async () => {
    mockApi({ "GET /api/v1/auth/me": () => ok(session()) });
    renderWithProviders(
      <PublicOnly>
        <p>login form</p>
      </PublicOnly>,
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("login form")).not.toBeInTheDocument();
  });

  it("shows the form to visitors", async () => {
    mockApi({ "GET /api/v1/auth/me": unauthenticated });
    renderWithProviders(
      <PublicOnly>
        <p>login form</p>
      </PublicOnly>,
    );
    expect(await screen.findByText("login form")).toBeInTheDocument();
  });
});

describe("logout", () => {
  function Probe() {
    const { logout, status } = useAuth();
    return (
      <>
        <p>status: {status}</p>
        <button onClick={() => void logout()}>logout</button>
      </>
    );
  }

  it("calls the API, clears the query cache and becomes unauthenticated", async () => {
    const logoutCalls = vi.fn();
    mockApi({
      "GET /api/v1/auth/me": () => ok(session()),
      "POST /api/v1/auth/logout": () => {
        logoutCalls();
        return Response.json({ success: true });
      },
    });
    const client = createTestClient();
    client.setQueryData(["products", "list", {}], ["cached"]);
    renderWithProviders(<Probe />, client);
    expect(await screen.findByText("status: authenticated")).toBeInTheDocument();
    expect(client.getQueryData(["products", "list", {}])).toEqual(["cached"]);

    await userEvent.click(screen.getByText("logout"));

    expect(await screen.findByText("status: unauthenticated")).toBeInTheDocument();
    expect(logoutCalls).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(["products", "list", {}])).toBeUndefined();
  });
});
