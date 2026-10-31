import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { ToastProvider } from "@/components/common/Toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import type { AuthSession } from "@/types/auth";
import type { MerchantProfile } from "@/types/merchant";
import type { Product } from "@/types/product";

export function createTestClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } } });
}

export function renderWithProviders(ui: ReactElement, client = createTestClient()) {
  const result = render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { ...result, client };
}

export const ok = (data: unknown, status = 200) => Response.json({ success: true, data }, { status });

export const fail = (status: number, code: string, message: string, details: Array<{ field?: string; message: string }> = []) =>
  Response.json({ success: false, error: { code, message, details } }, { status });

export const unauthenticated = () => fail(401, "UNAUTHENTICATED", "Authentication required");

type Handler = (request: { url: URL; init: RequestInit }) => Response | Promise<Response>;

/** Stubs fetch with handlers keyed by "METHOD /api/v1/path"; unknown routes fail loudly. */
export function mockApi(routes: Record<string, Handler>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), "http://localhost");
    const key = `${init.method ?? "GET"} ${url.pathname}`;
    // Every provider tree boots auth; tests that don't care about it get a logged-out session.
    const handler = routes[key] ?? (key === "GET /api/v1/auth/me" ? unauthenticated : undefined);
    if (!handler) throw new Error(`Unmocked request: ${key}`);
    return handler({ url, init });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

export const merchant = (overrides: Partial<MerchantProfile> = {}): MerchantProfile => ({
  id: "m-1",
  shopName: "Shree General Store",
  businessCategory: "KIRANA",
  preferredLanguage: "EN",
  contactPhone: null,
  contactEmail: null,
  addressLine: null,
  city: "Pune",
  state: null,
  pincode: null,
  latitude: null,
  longitude: null,
  demo: false,
  createdAt: "2026-10-31T07:00:00Z",
  ...overrides,
});

export const session = (overrides: Partial<MerchantProfile> = {}): AuthSession => ({
  user: { id: "u-1", name: "Asha Patil", email: "asha@example.com", role: "OWNER" },
  merchant: merchant(overrides),
});

export const product = (overrides: Partial<Product> = {}): Product => ({
  id: "p-1",
  globalProductId: null,
  name: "Amul Taaza Milk",
  brand: "Amul",
  category: "Dairy",
  sku: "SKU-7F3K9Q2A",
  barcode: null,
  unit: "PACKET",
  packSize: 500,
  sellingPrice: 29,
  costPrice: 27,
  stockQuantity: 24,
  reorderLevel: 10,
  lowStock: false,
  active: true,
  aliases: [{ id: "a-1", alias: "doodh" }],
  createdAt: "2026-10-31T07:00:00Z",
  updatedAt: "2026-10-31T07:00:00Z",
  ...overrides,
});

export const page = <T,>(items: T[], overrides: object = {}) => ({
  items,
  page: 0,
  size: 20,
  totalItems: items.length,
  totalPages: items.length === 0 ? 0 : 1,
  ...overrides,
});
