import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "./RegisterForm";
import { fail, mockApi, ok, renderWithProviders, session, unauthenticated } from "@/test/utils";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/register" }));

beforeEach(() => router.replace.mockClear());
afterEach(() => vi.unstubAllGlobals());

async function fillValid(password = "Passw0rd!x") {
  await userEvent.type(screen.getByLabelText("Your name"), "Asha Patil");
  await userEvent.type(screen.getByLabelText("Email"), "asha@example.com");
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.type(screen.getByLabelText("Shop name"), "Shree General Store");
}

describe("RegisterForm", () => {
  it("rejects a weak password without calling the API", async () => {
    const fetchFn = mockApi({ "GET /api/v1/auth/me": unauthenticated });
    renderWithProviders(<RegisterForm />);
    await fillValid("password");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Password must include at least one digit")).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("validates required fields and the phone format", async () => {
    mockApi({ "GET /api/v1/auth/me": unauthenticated });
    renderWithProviders(<RegisterForm />);
    await userEvent.type(screen.getByLabelText("Mobile number"), "1234567890");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText(/Your name must be at least 2 characters/)).toBeInTheDocument();
    expect(screen.getByText(/Shop name must be at least 2 characters/)).toBeInTheDocument();
    expect(screen.getByText(/valid 10-digit Indian mobile number/)).toBeInTheDocument();
  });

  it("submits the onboarding payload and redirects", async () => {
    const bodies: unknown[] = [];
    mockApi({
      "GET /api/v1/auth/me": unauthenticated,
      "POST /api/v1/auth/register": ({ init }) => {
        bodies.push(JSON.parse(String(init.body)));
        return ok(session(), 201);
      },
    });
    renderWithProviders(<RegisterForm />);
    await fillValid();
    await userEvent.type(screen.getByLabelText("Mobile number"), "9876543210");
    await userEvent.selectOptions(screen.getByLabelText("Preferred language"), "HI");
    await userEvent.type(screen.getByLabelText("City"), "Pune");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(bodies[0]).toEqual({
      ownerName: "Asha Patil",
      email: "asha@example.com",
      password: "Passw0rd!x",
      phone: "9876543210",
      shopName: "Shree General Store",
      businessCategory: "KIRANA",
      preferredLanguage: "HI",
      city: "Pune",
    });
  });

  it("maps EMAIL_ALREADY_REGISTERED to a visible message", async () => {
    mockApi({
      "GET /api/v1/auth/me": unauthenticated,
      "POST /api/v1/auth/register": () => fail(409, "EMAIL_ALREADY_REGISTERED", "This email is already registered"),
    });
    renderWithProviders(<RegisterForm />);
    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This email is already registered");
  });
});
