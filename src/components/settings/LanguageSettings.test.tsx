import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequireAuth } from "@/components/auth/AuthGuard";
import { LanguageSettings } from "./LanguageSettings";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { mockApi, ok, renderWithProviders, session } from "@/test/utils";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/settings" }));

afterEach(() => vi.unstubAllGlobals());

describe("LanguageSettings", () => {
  it("persists the language through PUT /merchant/profile without clearing other fields", async () => {
    const bodies: Record<string, unknown>[] = [];
    const current = session({ city: "Pune", contactPhone: "9876543210", pincode: "411001" }).merchant;
    mockApi({
      "GET /api/v1/auth/me": () => ok(session({ city: "Pune", contactPhone: "9876543210", pincode: "411001" })),
      "PUT /api/v1/merchant/profile": ({ init }) => {
        bodies.push(JSON.parse(String(init.body)));
        return ok({ ...current, preferredLanguage: "MR" });
      },
    });
    renderWithProviders(
      <RequireAuth>
        <LanguageSettings />
      </RequireAuth>,
    );
    await userEvent.click(await screen.findByLabelText("मराठी"));
    await userEvent.click(screen.getByRole("button", { name: "Save language" }));

    expect(await screen.findByText("Language preference saved.")).toBeInTheDocument();
    expect(bodies[0]).toMatchObject({ preferredLanguage: "MR", city: "Pune", contactPhone: "9876543210", pincode: "411001" });
    expect(screen.getByRole("button", { name: "Save language" })).toBeDisabled();
  });

  it("offers English, हिन्दी and मराठी", async () => {
    mockApi({ "GET /api/v1/auth/me": () => ok(session()) });
    renderWithProviders(
      <RequireAuth>
        <LanguageSettings />
      </RequireAuth>,
    );
    for (const label of ["English", "हिन्दी", "मराठी"]) {
      expect(await screen.findByLabelText(label)).toBeInTheDocument();
    }
  });
});

describe("DemoBanner", () => {
  it("is shown only for demo merchants", async () => {
    mockApi({ "GET /api/v1/auth/me": () => ok(session({ demo: true })) });
    const { unmount } = renderWithProviders(
      <RequireAuth>
        <DemoBanner />
      </RequireAuth>,
    );
    expect(await screen.findByText(/synthetic sample data/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/demo data/i);
    unmount();

    mockApi({ "GET /api/v1/auth/me": () => ok(session({ demo: false })) });
    renderWithProviders(
      <RequireAuth>
        <p>ready</p>
        <DemoBanner />
      </RequireAuth>,
    );
    await screen.findByText("ready");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
