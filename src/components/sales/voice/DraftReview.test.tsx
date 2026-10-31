import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DraftReview } from "./DraftReview";
import { fail, mockApi, ok, page, product, renderWithProviders } from "@/test/utils";
import { customer, sale } from "@/test/m3Fixtures";
import { draftCustomer, draftLine, draftOption, voiceDraft } from "@/test/m5Fixtures";
import type { VoiceDraft } from "@/types/ai";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/sales/voice" }));

interface SaleBody {
  clientRequestId: string;
  voiceInteractionId?: string;
  customerId?: string;
  items: Array<{ productId: string; quantity: number; unitPrice?: number }>;
  payments: Array<{ method: string; amount: number }>;
  discountAmount?: number;
}

const catalogue = [
  product({ id: "p-sugar", name: "Sugar", brand: null, unit: "KG", sellingPrice: 45, stockQuantity: 48 }),
  product({ id: "p-milk", name: "Amul Milk", unit: "PACKET", sellingPrice: 29, stockQuantity: 10 }),
  product({ id: "p-kurkure", name: "Kurkure", unit: "PACKET", sellingPrice: 20, stockQuantity: 30 }),
];

function setup(draft: VoiceDraft, saleHandler?: (body: SaleBody, call: number) => Response) {
  const bodies: SaleBody[] = [];
  const productUrls: URL[] = [];
  mockApi({
    "GET /api/v1/products": ({ url }) => {
      productUrls.push(url);
      return ok(page(catalogue));
    },
    "GET /api/v1/customers": () => ok(page([customer()])),
    "POST /api/v1/sales": ({ init }) => {
      const body = JSON.parse(String(init.body)) as SaleBody;
      bodies.push(body);
      return saleHandler ? saleHandler(body, bodies.length) : ok(sale({ id: `s-${bodies.length}`, saleNumber: "S-000777" }), 201);
    },
  });
  const props = { onRecheck: vi.fn(), onStartOver: vi.fn() };
  renderWithProviders(<DraftReview draft={draft} rechecking={false} recheckError={null} {...props} />);
  return { bodies, productUrls, ...props };
}

const confirmButton = () => screen.getByRole("button", { name: /Confirm sale|Saving sale/ });
const reasons = () => within(screen.getByRole("list", { name: "Before you can confirm" }));
const item = (name: string) => within(screen.getByRole("listitem", { name: `Item: ${name}` }));

const sugarOptions = [
  draftOption({ productId: "p-sugar", name: "Sugar", quantity: 2, lineTotal: 90 }),
  draftOption({ productId: "p-m30", name: "Sugar M30", brand: "Tata", sellingPrice: 50, quantity: 2, lineTotal: 100 }),
];

beforeEach(() => router.push.mockClear());

describe("DraftReview — clean draft", () => {
  it("says it is only a draft and shows the total from catalogue price × quantity", () => {
    setup(voiceDraft());
    expect(screen.getByText(/This is a draft, not a sale/)).toBeInTheDocument();
    expect(screen.getByText("2 kg chini", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/₹45 per kg \(your catalogue price\)/)).toBeInTheDocument();
    expect(screen.getByTestId("voice-total")).toHaveTextContent("₹90");
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
    expect(screen.queryByText(/Understood without AI/)).not.toBeInTheDocument();
  });

  it("confirms with the voice draft id, a fresh clientRequestId and catalogue prices only", async () => {
    const { bodies } = setup(voiceDraft());
    await userEvent.click(confirmButton());

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].voiceInteractionId).toBe("d-1");
    expect(bodies[0].clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(bodies[0].items).toEqual([{ productId: "p-sugar", quantity: 2 }]);
    expect(bodies[0].payments).toEqual([{ method: "CASH", amount: 90 }]);
    expect(bodies[0].customerId).toBeUndefined();
    expect(bodies[0].discountAmount).toBeUndefined();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/sales/s-1"));
    expect(await screen.findByText(/S-000777 recorded from your voice order/)).toBeInTheDocument();
  });

  it("recomputes totals from the edited quantity and never exposes a price field", async () => {
    setup(
      voiceDraft({
        lines: [
          draftLine(),
          draftLine({
            spokenName: "doodh",
            selected: draftOption({ productId: "p-milk", name: "Amul Milk", unit: "PACKET", sellingPrice: 29, stockQuantity: 10, quantity: 3, lineTotal: 87 }),
            options: [],
          }),
        ],
      }),
    );
    expect(screen.getByTestId("voice-total")).toHaveTextContent("₹177");
    const qty = screen.getByLabelText("Sugar quantity");
    await userEvent.clear(qty);
    await userEvent.type(qty, "0.5");
    // 0.5 × 45 + 3 × 29 = 22.5 + 87
    expect(screen.getByTestId("voice-total")).toHaveTextContent("₹109.5");
    expect(screen.queryByLabelText(/price/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Increase Sugar quantity" }));
    expect(screen.getByTestId("voice-total")).toHaveTextContent("₹132");
  });

  it("keeps the same clientRequestId when Confirm is retried after a failure", async () => {
    const { bodies } = setup(voiceDraft(), (_, call) => (call === 1 ? fail(500, "INTERNAL_ERROR", "Database is down") : ok(sale({ id: "s-2" }), 200)));
    await userEvent.click(confirmButton());
    expect(await screen.findByText("Database is down")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    await userEvent.click(confirmButton());
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1].clientRequestId).toBe(bodies[0].clientRequestId);
    expect(bodies[1].voiceInteractionId).toBe("d-1");
  });

  it("shows a server stock refusal on the line and keeps the draft", async () => {
    setup(voiceDraft(), () =>
      fail(409, "INSUFFICIENT_STOCK", "Not enough stock", [{ field: "items[0].quantity", message: "Only 1 kg of Sugar left" }]),
    );
    await userEvent.click(confirmButton());
    expect(await screen.findByText("Only 1 kg of Sugar left")).toBeInTheDocument();
    expect(screen.getByText(/Nothing was saved/)).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("DraftReview — rule-based fallback and draft warnings", () => {
  it("tells the merchant when it was understood without AI", () => {
    setup(voiceDraft({ extractedBy: "RULES" }));
    expect(screen.getByText("Understood without AI — please check carefully.")).toBeInTheDocument();
  });

  it("shows draft-level warnings and blocks an empty order", () => {
    setup(voiceDraft({ lines: [], warnings: ["NO_ITEMS_FOUND"], paymentHint: null }));
    expect(screen.getByText(/No items were understood/)).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    expect(reasons().getByText("Add at least one item.")).toBeInTheDocument();
  });
});

describe("DraftReview — product lines", () => {
  it("makes the merchant pick among AMBIGUOUS options before Confirm is possible", async () => {
    const { bodies } = setup(
      voiceDraft({ lines: [draftLine({ status: "AMBIGUOUS", selected: null, options: sugarOptions, needsReview: true })], estimatedTotal: 0 }),
    );
    expect(screen.getByText("Choose product")).toBeInTheDocument();
    expect(screen.getByText(/could be more than one product/)).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    expect(screen.getByTestId("voice-total")).toHaveTextContent("₹0");

    await userEvent.click(screen.getByRole("button", { name: "Use Sugar M30" }));
    expect(screen.getByTestId("voice-total")).toHaveTextContent("₹100");
    expect(confirmButton()).toBeEnabled();

    await userEvent.click(confirmButton());
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].items).toEqual([{ productId: "p-m30", quantity: 2 }]);
  });

  it("lets the merchant search for a NOT_FOUND item, and carries over a quantity said without a unit", async () => {
    const { productUrls, bodies } = setup(
      voiceDraft({
        lines: [draftLine({ spokenName: "kurkure", spokenQuantity: 3, spokenUnit: null, status: "NOT_FOUND", selected: null, options: [] })],
        estimatedTotal: 0,
      }),
    );
    expect(screen.getByText("Not found")).toBeInTheDocument();
    expect(screen.getByText(/We could not find “kurkure”/)).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    await waitFor(() => expect(productUrls.some((u) => u.searchParams.get("q") === "kurkure")).toBe(true));

    await userEvent.click(await screen.findByRole("button", { name: "Add Kurkure" }));
    expect(screen.getByLabelText("Kurkure quantity")).toHaveValue("3");
    expect(screen.getByTestId("voice-total")).toHaveTextContent("₹60");
    expect(confirmButton()).toBeEnabled();
    await userEvent.click(confirmButton());
    await waitFor(() => expect(bodies[0].items).toEqual([{ productId: "p-kurkure", quantity: 3 }]));
  });

  it("asks for the quantity when a searched product was said in a different unit", async () => {
    setup(
      voiceDraft({
        lines: [draftLine({ spokenName: "kurkure", spokenQuantity: 2, spokenUnit: "kg", status: "NOT_FOUND", selected: null, options: [] })],
      }),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Add Kurkure" }));
    expect(screen.getByText("Quantity needed")).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Kurkure quantity"), "2");
    expect(confirmButton()).toBeEnabled();
  });

  it("blocks UNIT_MISMATCH until the merchant enters the quantity", async () => {
    setup(
      voiceDraft({
        lines: [
          draftLine({
            spokenName: "maggi",
            selected: draftOption({ productId: "p-maggi", name: "Maggi", unit: "PACKET", sellingPrice: 14, quantity: null, lineTotal: null, warnings: ["UNIT_MISMATCH"] }),
            options: [],
            needsReview: true,
          }),
        ],
      }),
    );
    expect(screen.getByText("Unit mismatch")).toBeInTheDocument();
    expect(screen.getByText(/You said “2 kg maggi”, but Maggi is sold per packet/)).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    expect(reasons().getByText("1 item needs your attention.")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Maggi quantity"), "3");
    expect(screen.queryByText("Unit mismatch")).not.toBeInTheDocument();
    expect(screen.getByTestId("voice-total")).toHaveTextContent("₹42");
    expect(confirmButton()).toBeEnabled();
  });

  it("blocks INSUFFICIENT_STOCK until the quantity fits the stock", async () => {
    setup(
      voiceDraft({
        lines: [draftLine({ selected: draftOption({ quantity: 60, lineTotal: 2700, warnings: ["INSUFFICIENT_STOCK"] }), needsReview: true })],
      }),
    );
    expect(screen.getByText("Not enough stock")).toBeInTheDocument();
    expect(screen.getByText("Only 48 kg in stock. Reduce the quantity or remove the line.")).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();

    const qty = screen.getByLabelText("Sugar quantity");
    await userEvent.clear(qty);
    await userEvent.type(qty, "5");
    expect(confirmButton()).toBeEnabled();
  });

  it("asks the merchant to look at a flagged line and notes an assumed unit", async () => {
    setup(voiceDraft({ lines: [draftLine({ selected: draftOption({ warnings: ["UNIT_ASSUMED"] }), needsReview: true })] }));
    expect(screen.getByText(/You did not say a unit, so kg was assumed/)).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Looks right" }));
    expect(confirmButton()).toBeEnabled();
  });

  it("lets the merchant remove a line and add one by hand", async () => {
    const { bodies } = setup(voiceDraft());
    await userEvent.click(screen.getByRole("button", { name: "Remove Sugar" }));
    expect(screen.getByText("No items yet. Add an item below.")).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Add an item" }));
    await userEvent.click(await screen.findByRole("button", { name: "Add Amul Milk" }));
    expect(item("Amul Milk").getByLabelText("Amul Milk quantity")).toHaveValue("1");
    expect(screen.getByTestId("voice-total")).toHaveTextContent("₹29");
    await userEvent.click(confirmButton());
    await waitFor(() => expect(bodies[0].items).toEqual([{ productId: "p-milk", quantity: 1 }]));
  });
});

describe("DraftReview — customer and payment", () => {
  it("shows a MATCHED customer and sends their id", async () => {
    const { bodies } = setup(voiceDraft({ customer: draftCustomer() }));
    expect(screen.getByText("Matched")).toBeInTheDocument();
    expect(screen.getByText(/Matched to/)).toHaveTextContent("You said “Ramesh”. Matched to Ramesh Kumar.");
    await userEvent.click(confirmButton());
    await waitFor(() => expect(bodies[0].customerId).toBe("c-1"));
  });

  it("never auto-picks an AMBIGUOUS customer", async () => {
    const { bodies } = setup(
      voiceDraft({
        customer: draftCustomer({
          status: "AMBIGUOUS",
          selected: null,
          options: [
            { customerId: "c-1", name: "Ramesh Kumar", score: 0.8 },
            { customerId: "c-2", name: "Ramesh Patil", score: 0.78 },
          ],
        }),
      }),
    );
    expect(screen.getByText("Choose customer")).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    expect(reasons().getByText(/Choose the customer for “Ramesh”/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Use customer Ramesh Patil" }));
    expect(confirmButton()).toBeEnabled();
    await userEvent.click(confirmButton());
    await waitFor(() => expect(bodies[0].customerId).toBe("c-2"));
  });

  it("lets a NOT_FOUND customer be skipped for a cash sale", async () => {
    const { bodies } = setup(voiceDraft({ customer: draftCustomer({ status: "NOT_FOUND", selected: null, options: [] }) }));
    expect(screen.getByText(/no customer with that name was found/)).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Skip — walk-in customer" }));
    expect(confirmButton()).toBeEnabled();
    await userEvent.click(confirmButton());
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].customerId).toBeUndefined();
    expect(bodies[0].payments).toEqual([{ method: "CASH", amount: 90 }]);
  });

  it("requires a customer for CREDIT and leaves the amount unpaid", async () => {
    const { bodies } = setup(
      voiceDraft({ paymentHint: "CREDIT", customer: draftCustomer({ status: "NOT_FOUND", selected: null, options: [] }) }),
    );
    expect(screen.getByRole("radio", { name: /Credit/ })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Skip — walk-in customer" }));
    expect(confirmButton()).toBeDisabled();
    expect(reasons().getByText(/Credit \(udhaar\) needs a customer/)).toBeInTheDocument();

    // Choosing cash instead is the merchant's call, and clears the problem.
    await userEvent.click(screen.getByRole("radio", { name: "Cash" }));
    expect(confirmButton()).toBeEnabled();
    expect(bodies).toHaveLength(0);
  });

  it("sends no payment for CREDIT with a matched customer", async () => {
    const { bodies } = setup(voiceDraft({ paymentHint: "CREDIT", customer: draftCustomer() }));
    expect(screen.getByText(/₹90 will be added to Ramesh Kumar’s credit/)).toBeInTheDocument();
    await userEvent.click(confirmButton());
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].payments).toEqual([]);
    expect(bodies[0].customerId).toBe("c-1");
  });

  it("pre-selects the payment hint and requires a choice when none was said", async () => {
    const { bodies } = setup(voiceDraft({ paymentHint: null }));
    expect(screen.getByText("Nothing was said about payment. Choose one.")).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    expect(reasons().getByText("Choose how the customer is paying.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "UPI" }));
    expect(screen.getByText(/not verified by a payment provider/)).toBeInTheDocument();
    await userEvent.click(confirmButton());
    await waitFor(() => expect(bodies[0].payments).toEqual([{ method: "UPI", amount: 90 }]));
  });
});

describe("DraftReview — transcript", () => {
  it("re-checks an edited transcript and blocks Confirm until then", async () => {
    const { onRecheck } = setup(voiceDraft());
    const recheck = screen.getByRole("button", { name: "Re-check" });
    expect(recheck).toBeDisabled();

    await userEvent.type(screen.getByLabelText("What we heard"), " aur ek maggi");
    expect(recheck).toBeEnabled();
    expect(confirmButton()).toBeDisabled();
    expect(reasons().getByText("You changed the text. Tap Re-check to update the items.")).toBeInTheDocument();

    await userEvent.click(recheck);
    expect(onRecheck).toHaveBeenCalledWith("2 kilo chini aur ek maggi");
  });

  it("offers Type instead and Speak again", async () => {
    const { onStartOver } = setup(voiceDraft());
    expect(screen.getByRole("link", { name: "Type instead" })).toHaveAttribute("href", "/sales/new");
    await userEvent.click(screen.getByRole("button", { name: "Speak again" }));
    expect(onStartOver).toHaveBeenCalled();
  });
});
