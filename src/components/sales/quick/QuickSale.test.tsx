import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickSale } from "./QuickSale";
import { fail, mockApi, ok, page, product, renderWithProviders } from "@/test/utils";
import { customer, sale, saleItem } from "@/test/m3Fixtures";

afterEach(() => vi.unstubAllGlobals());

const salt = product({ id: "p-salt", name: "Tata Salt", brand: "Tata", unit: "KG", sellingPrice: 28, stockQuantity: 40 });
const milk = product({ id: "p-milk", name: "Amul Milk", unit: "PACKET", sellingPrice: 29, stockQuantity: 3 });

interface SaleBody {
  clientRequestId: string;
  customerId?: string;
  items: Array<{ productId: string; quantity: number; unitPrice?: number }>;
  discountAmount?: number;
  payments: Array<{ method: string; amount: number }>;
}

function setup(saleHandler?: (body: SaleBody, call: number) => Response) {
  const bodies: SaleBody[] = [];
  mockApi({
    "GET /api/v1/products": () => ok(page([salt, milk])),
    "GET /api/v1/customers": () => ok(page([customer()])),
    "POST /api/v1/sales": ({ init }) => {
      const body = JSON.parse(String(init.body)) as SaleBody;
      bodies.push(body);
      return saleHandler ? saleHandler(body, bodies.length) : ok(sale({ id: `s-${bodies.length}` }), 201);
    },
  });
  renderWithProviders(<QuickSale />);
  return bodies;
}

const addProduct = async (name: string) => userEvent.click(await screen.findByRole("button", { name: `Add ${name}` }));
const saveButton = () => screen.getByRole("button", { name: /Save sale|Saving sale/ });

describe("QuickSale", () => {
  it("searches products with active=true and size=20, and shows name, price and stock", async () => {
    const urls: URL[] = [];
    mockApi({
      "GET /api/v1/products": ({ url }) => {
        urls.push(url);
        return ok(page([salt]));
      },
    });
    renderWithProviders(<QuickSale />);
    expect(await screen.findByText("Tata Salt")).toBeInTheDocument();
    expect(screen.getByText("₹28")).toBeInTheDocument();
    expect(screen.getByText(/Stock 40 kg/)).toBeInTheDocument();
    expect(urls[0].searchParams.get("active")).toBe("true");
    expect(urls[0].searchParams.get("size")).toBe("20");

    await userEvent.type(screen.getByLabelText("Search products to add"), "salt");
    await waitFor(() => expect(urls.some((u) => u.searchParams.get("q") === "salt")).toBe(true));
  });

  it("submits items without unitPrice unless it was changed, with payments and decimals for KG", async () => {
    const bodies = setup();
    await addProduct("Tata Salt");
    await addProduct("Amul Milk");

    const qty = screen.getByLabelText("Tata Salt quantity");
    await userEvent.clear(qty);
    await userEvent.type(qty, "2.5");
    const price = screen.getByLabelText("Amul Milk price");
    await userEvent.clear(price);
    await userEvent.type(price, "25");
    expect(screen.getByText("Price changed for this sale")).toBeInTheDocument();

    // 2.5 × 28 + 1 × 25 = 95
    expect(screen.getByTestId("sale-total")).toHaveTextContent("₹95");
    await userEvent.click(screen.getByRole("button", { name: "Full amount in cash" }));
    await userEvent.click(saveButton());

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].items).toEqual([
      { productId: "p-salt", quantity: 2.5 },
      { productId: "p-milk", quantity: 1, unitPrice: 25 },
    ]);
    expect(bodies[0].payments).toEqual([{ method: "CASH", amount: 95 }]);
    expect(bodies[0].customerId).toBeUndefined();
    expect(await screen.findByText("Sale recorded")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View sale" })).toHaveAttribute("href", "/sales/s-1");
  });

  it("rejects decimal quantities for whole-number units", async () => {
    setup();
    await addProduct("Amul Milk");
    const qty = screen.getByLabelText("Amul Milk quantity");
    await userEvent.clear(qty);
    await userEvent.type(qty, "1.5");
    expect(screen.getByText("This item is sold in whole numbers")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("applies a discount and a percentage helper", async () => {
    const bodies = setup();
    await addProduct("Tata Salt");
    await userEvent.type(screen.getByLabelText("%"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByLabelText("Discount (₹)")).toHaveValue("2.8");
    await userEvent.click(screen.getByRole("button", { name: "Full amount by UPI" }));
    expect(screen.getByTestId("sale-total")).toHaveTextContent("₹25.2");
    await userEvent.click(saveButton());
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].discountAmount).toBe(2.8);
    expect(bodies[0].payments).toEqual([{ method: "UPI", amount: 25.2 }]);
  });

  it("keeps the same clientRequestId across retries and renews it after a successful sale", async () => {
    const bodies = setup((_, call) => (call === 1 ? fail(500, "INTERNAL_ERROR", "Database is down") : ok(sale({ id: `s-${call}` }), call === 2 ? 200 : 201)));
    await addProduct("Tata Salt");
    await userEvent.click(screen.getByRole("button", { name: "Full amount in cash" }));

    await userEvent.click(saveButton());
    expect(await screen.findByText("Database is down")).toBeInTheDocument();
    await userEvent.click(saveButton());
    expect(await screen.findByText("Sale recorded")).toBeInTheDocument();
    expect(bodies).toHaveLength(2);
    expect(bodies[0].clientRequestId).toBeTruthy();
    expect(bodies[1].clientRequestId).toBe(bodies[0].clientRequestId);

    await userEvent.click(screen.getByRole("button", { name: "New sale" }));
    await addProduct("Tata Salt");
    await userEvent.click(screen.getByRole("button", { name: "Full amount in cash" }));
    await userEvent.click(saveButton());
    await waitFor(() => expect(bodies).toHaveLength(3));
    expect(bodies[2].clientRequestId).not.toBe(bodies[0].clientRequestId);
  });

  it("disables the button while saving so a double tap sends one request", async () => {
    let release: (r: Response) => void = () => {};
    const bodies: SaleBody[] = [];
    mockApi({
      "GET /api/v1/products": () => ok(page([salt])),
      "POST /api/v1/sales": ({ init }) => {
        bodies.push(JSON.parse(String(init.body)) as SaleBody);
        return new Promise<Response>((resolve) => (release = resolve));
      },
    });
    renderWithProviders(<QuickSale />);
    await addProduct("Tata Salt");
    await userEvent.click(screen.getByRole("button", { name: "Full amount in cash" }));
    await userEvent.dblClick(saveButton());
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(bodies).toHaveLength(1);
    release(ok(sale(), 201));
    expect(await screen.findByText("Sale recorded")).toBeInTheDocument();
  });

  it("warns about an unpaid walk-in sale and requires explicit confirmation", async () => {
    const bodies = setup();
    await addProduct("Amul Milk");
    expect(screen.getByText("No customer selected — ₹29 will be recorded as unpaid.")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    await userEvent.click(screen.getByRole("checkbox", { name: /record ₹29 as unpaid/i }));
    expect(saveButton()).toBeEnabled();
    await userEvent.click(saveButton());
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].payments).toEqual([]);
  });

  it("voids the unpaid confirmation when the amount changes", async () => {
    setup();
    await addProduct("Amul Milk");
    await userEvent.click(screen.getByRole("checkbox", { name: /record ₹29 as unpaid/i }));
    await userEvent.click(screen.getByRole("button", { name: "Increase Amul Milk quantity" }));
    expect(screen.getByRole("checkbox", { name: /record ₹58 as unpaid/i })).not.toBeChecked();
    expect(saveButton()).toBeDisabled();
  });

  it("puts the due on the selected customer's credit instead of warning", async () => {
    const bodies = setup();
    await addProduct("Amul Milk");
    await userEvent.type(screen.getByLabelText("Customer"), "Ramesh");
    await userEvent.click(await screen.findByRole("button", { name: /Ramesh Kulkarni/ }));
    expect(await screen.findByText("₹29 will be added to Ramesh Kulkarni's credit.")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await userEvent.click(saveButton());
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].customerId).toBe("c-1");
  });

  it("warns when quantity exceeds stock but does not block", async () => {
    setup();
    await addProduct("Amul Milk");
    const qty = screen.getByLabelText("Amul Milk quantity");
    await userEvent.clear(qty);
    await userEvent.type(qty, "5");
    expect(screen.getByText(/Only 3 packet in stock/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Full amount in cash" }));
    expect(saveButton()).toBeEnabled();
  });

  it("maps INSUFFICIENT_STOCK onto the matching cart line", async () => {
    setup(() => fail(409, "INSUFFICIENT_STOCK", "Not enough stock", [{ field: "items[1].quantity", message: "Only 3 packet of Amul Milk in stock" }]));
    await addProduct("Tata Salt");
    await addProduct("Amul Milk");
    await userEvent.click(screen.getByRole("button", { name: "Full amount in cash" }));
    await userEvent.click(saveButton());

    const milkLine = (await screen.findByText("Only 3 packet of Amul Milk in stock")).closest("li") as HTMLElement;
    expect(within(milkLine).getByText("Amul Milk")).toBeInTheDocument();
    const saltLine = screen.getByText("Tata Salt", { selector: "p" }).closest("li") as HTMLElement;
    expect(within(saltLine).queryByText(/in stock/)).not.toBeInTheDocument();
    expect(screen.getByText(/Not enough stock for some items/)).toBeInTheDocument();

    // Editing the line clears its server error.
    await userEvent.click(screen.getByRole("button", { name: "Increase Amul Milk quantity" }));
    expect(screen.queryByText("Only 3 packet of Amul Milk in stock")).not.toBeInTheDocument();
  });

  it("can create a customer inline and select them", async () => {
    mockApi({
      "GET /api/v1/products": () => ok(page([milk])),
      "POST /api/v1/customers": ({ init }) => {
        expect(JSON.parse(String(init.body))).toEqual({ name: "Sita", phone: null, notes: null });
        return ok(customer({ id: "c-9", name: "Sita", phone: null }), 201);
      },
    });
    renderWithProviders(<QuickSale />);
    await userEvent.click(screen.getByRole("button", { name: /New customer/ }));
    await userEvent.type(screen.getByLabelText("Name"), "Sita");
    await userEvent.click(screen.getByRole("button", { name: "Save and select" }));
    expect(await screen.findByText("Sita")).toBeInTheDocument();
  });

  it("only offers catalogue products and shows an empty message when there are none", async () => {
    mockApi({ "GET /api/v1/products": () => ok(page([])) });
    renderWithProviders(<QuickSale />);
    expect(await screen.findByText(/No active products yet/)).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("renders a replayed sale like a new one", async () => {
    setup(() => ok(sale({ items: [saleItem()], saleNumber: "S-000777" }), 200));
    await addProduct("Tata Salt");
    await userEvent.click(screen.getByRole("button", { name: "Full amount in cash" }));
    await userEvent.click(saveButton());
    expect(await screen.findByText("Sale recorded")).toBeInTheDocument();
    expect(screen.getByText("S-000777")).toBeInTheDocument();
  });
});
