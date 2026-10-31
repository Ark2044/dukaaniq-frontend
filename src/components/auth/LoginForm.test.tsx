import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";
import { fail, mockApi, ok, renderWithProviders, session, unauthenticated } from "@/test/utils";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/login" }));

beforeEach(() => router.replace.mockClear());
afterEach(() => vi.unstubAllGlobals());

describe("LoginForm", () => {
  it("validates email and password before calling the API", async () => {
    const fetchFn = mockApi({ "GET /api/v1/auth/me": unauthenticated });
    renderWithProviders(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("signs in and navigates to the dashboard", async () => {
    const bodies: string[] = [];
    mockApi({
      "GET /api/v1/auth/me": unauthenticated,
      "POST /api/v1/auth/login": ({ init }) => {
        bodies.push(String(init.body));
        return ok(session());
      },
    });
    renderWithProviders(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "asha@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Passw0rd!x");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(bodies).toEqual([JSON.stringify({ email: "asha@example.com", password: "Passw0rd!x" })]);
  });

  it("shows the backend message for INVALID_CREDENTIALS", async () => {
    mockApi({
      "GET /api/v1/auth/me": unauthenticated,
      "POST /api/v1/auth/login": () => fail(401, "INVALID_CREDENTIALS", "Email or password is incorrect"),
    });
    renderWithProviders(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "asha@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrongpass1");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("maps VALIDATION_FAILED details onto fields", async () => {
    mockApi({
      "GET /api/v1/auth/me": unauthenticated,
      "POST /api/v1/auth/login": () =>
        fail(400, "VALIDATION_FAILED", "Validation failed", [{ field: "email", message: "must be a well-formed email address" }]),
    });
    renderWithProviders(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "asha@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "Passw0rd!x");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("must be a well-formed email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });
});
