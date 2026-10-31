import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductList } from "./ProductList";
import { fail, mockApi, ok, page, product, renderWithProviders } from "@/test/utils";

afterEach(() => vi.unstubAllGlobals());

const categories = () => ok(["Dairy", "Snacks"]);

describe("ProductList", () => {
  it("shows a loading skeleton, then products with INR prices, stock units and badges", async () => {
    mockApi({
      "GET /api/v1/products/categories": categories,
      "GET /api/v1/products": () =>
        ok(
          page([
            product({ id: "p-1", name: "Amul Taaza Milk", sellingPrice: 1250.5, lowStock: true }),
            product({ id: "p-2", name: "Old Biscuit", active: false, stockQuantity: 2.5, unit: "KG" }),
          ]),
        ),
    });
    renderWithProviders(<ProductList />);
    expect(screen.getByTestId("products-loading")).toBeInTheDocument();

    expect((await screen.findAllByText("Amul Taaza Milk")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("₹1,250.5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Low stock").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\.5 kg/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Amul Taaza Milk/ })[0]).toHaveAttribute("href", "/inventory/p-1");
  });

  it("shows an empty state that leads with scanning, plus add and import actions", async () => {
    mockApi({ "GET /api/v1/products/categories": categories, "GET /api/v1/products": () => ok(page([])) });
    renderWithProviders(<ProductList />);
    expect(await screen.findByText("Scan a bill to add products")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Scan bill/ })).toHaveAttribute("href", "/inventory/scan");
    expect(screen.getByRole("link", { name: /Add product/ })).toHaveAttribute("href", "/inventory/new");
    expect(screen.getByRole("link", { name: /Import CSV/ })).toHaveAttribute("href", "/inventory/import");
  });

  it("shows an error state and recovers on retry", async () => {
    let calls = 0;
    mockApi({
      "GET /api/v1/products/categories": categories,
      "GET /api/v1/products": () => {
        calls += 1;
        return calls === 1 ? fail(500, "INTERNAL_ERROR", "Database is down") : ok(page([product()]));
      },
    });
    renderWithProviders(<ProductList />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Database is down");
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect((await screen.findAllByText("Amul Taaza Milk")).length).toBeGreaterThan(0);
  });

  it("sends a debounced search plus category and low-stock filters", async () => {
    const urls: URL[] = [];
    mockApi({
      "GET /api/v1/products/categories": categories,
      "GET /api/v1/products": ({ url }) => {
        urls.push(url);
        return ok(page([product()]));
      },
    });
    renderWithProviders(<ProductList />);
    await screen.findAllByText("Amul Taaza Milk");
    expect(urls[0].searchParams.get("active")).toBe("true");
    expect(urls[0].searchParams.get("q")).toBeNull();

    await userEvent.type(screen.getByLabelText("Search products"), "doodh");
    await waitFor(() => expect(urls.at(-1)?.searchParams.get("q")).toBe("doodh"));
    // Debounced: typing five characters must not have produced five searches.
    expect(urls.filter((u) => u.searchParams.get("q")).length).toBe(1);

    await screen.findByRole("option", { name: "Dairy" });
    await userEvent.selectOptions(screen.getByLabelText("Category"), "Dairy");
    await waitFor(() => expect(urls.at(-1)?.searchParams.get("category")).toBe("Dairy"));

    await userEvent.click(screen.getByRole("switch", { name: /low stock only/i }));
    await waitFor(() => expect(urls.at(-1)?.searchParams.get("lowStock")).toBe("true"));

    await userEvent.selectOptions(screen.getByLabelText("Status"), "all");
    await waitFor(() => expect(urls.at(-1)?.searchParams.has("active")).toBe(false));
  });

  it("shows a no-match state with a way to clear filters", async () => {
    mockApi({
      "GET /api/v1/products/categories": categories,
      "GET /api/v1/products": ({ url }) => ok(url.searchParams.get("lowStock") ? page([]) : page([product()])),
    });
    renderWithProviders(<ProductList />);
    await screen.findAllByText("Amul Taaza Milk");
    await userEvent.click(screen.getByRole("switch", { name: /low stock only/i }));
    expect(await screen.findByText("No products match your filters")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect((await screen.findAllByText("Amul Taaza Milk")).length).toBeGreaterThan(0);
  });

  it("paginates with Previous/Next", async () => {
    const pages: Array<string | null> = [];
    mockApi({
      "GET /api/v1/products/categories": categories,
      "GET /api/v1/products": ({ url }) => {
        pages.push(url.searchParams.get("page"));
        const current = Number(url.searchParams.get("page") ?? 0);
        return ok(page([product({ id: `p-${current}`, name: `Item ${current}` })], { page: current, totalItems: 40, totalPages: 2 }));
      },
    });
    renderWithProviders(<ProductList />);
    await screen.findAllByText("Item 0");
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByText(/40 products · Page 1 of 2/)).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: /Previous/ })).toBeDisabled();
    await userEvent.click(within(nav).getByRole("button", { name: /Next/ }));
    await screen.findAllByText("Item 1");
    expect(pages.at(-1)).toBe("1");
  });

  it("offers Adjust stock from a product row", async () => {
    mockApi({
      "GET /api/v1/products/categories": categories,
      "GET /api/v1/products": () => ok(page([product({ id: "p-1", name: "Amul Taaza Milk", stockQuantity: 24 })])),
    });
    renderWithProviders(<ProductList />);
    await screen.findAllByText("Amul Taaza Milk");
    await userEvent.click(screen.getAllByRole("button", { name: "Adjust stock for Amul Taaza Milk" })[0]);
    expect(screen.getByRole("dialog", { name: /Adjust stock: Amul Taaza Milk/ })).toBeInTheDocument();
    expect(screen.getByText("Current stock: 24 packet")).toBeInTheDocument();
  });
});
