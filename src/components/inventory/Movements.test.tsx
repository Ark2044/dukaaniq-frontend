import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Movements } from "./Movements";
import { fail, mockApi, ok, page, product, renderWithProviders } from "@/test/utils";
import { movement } from "@/test/m3Fixtures";

afterEach(() => vi.unstubAllGlobals());

describe("Movements", () => {
  it("shows signed quantities with colour, balance after, reason and note", async () => {
    mockApi({
      "GET /api/v1/inventory/movements": () =>
        ok(
          page([
            movement({ id: "a", quantityChange: -2, balanceAfter: 38, reason: "SALE" }),
            movement({ id: "b", type: "PURCHASE", reason: "PURCHASE", quantityChange: 20, balanceAfter: 58, note: "Supplier bill 12" }),
          ]),
        ),
    });
    renderWithProviders(<Movements />);
    const minus = (await screen.findAllByText("−2 kg"))[0];
    expect(minus).toHaveClass("text-danger");
    expect(screen.getAllByText("+20 kg")[0]).toHaveClass("text-success");
    expect(screen.getAllByText(/Balance 38 kg/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Supplier bill 12").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sale/).length).toBeGreaterThan(0);
  });

  it("sends product, type and date filters", async () => {
    const urls: URL[] = [];
    mockApi({
      "GET /api/v1/products": () => ok(page([product({ id: "p-1", name: "Tata Salt" })])),
      "GET /api/v1/inventory/movements": ({ url }) => {
        urls.push(url);
        return ok(page([movement()]));
      },
    });
    renderWithProviders(<Movements />);
    await screen.findAllByText("−2 kg");
    await userEvent.selectOptions(screen.getByLabelText("Type"), "ADJUSTMENT");
    await userEvent.type(screen.getByLabelText("From"), "2026-10-01");
    await userEvent.type(screen.getByLabelText("To"), "2026-10-31");
    await userEvent.click(screen.getByLabelText("Product"));
    await userEvent.click(await screen.findByRole("button", { name: /Tata Salt/ }));
    await waitFor(() => {
      const q = urls[urls.length - 1].searchParams;
      expect(q.get("type")).toBe("ADJUSTMENT");
      expect(q.get("from")).toBe("2026-10-01");
      expect(q.get("to")).toBe("2026-10-31");
      expect(q.get("productId")).toBe("p-1");
    });
  });

  it("opens the adjust dialog and shows empty and error states", async () => {
    let failing = true;
    mockApi({
      "GET /api/v1/inventory/movements": () => (failing ? fail(500, "INTERNAL_ERROR", "Down") : ok(page([]))),
    });
    renderWithProviders(<Movements />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Down");
    failing = false;
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("No stock movements yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Adjust stock/ }));
    expect(screen.getByRole("dialog", { name: "Adjust stock" })).toBeInTheDocument();
  });
});
