import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductForm } from "./ProductForm";
import { ApiClientError } from "@/lib/api/client";
import { emptyProductForm, productToFormValues, type ProductFormValues } from "@/lib/validation/product";
import { product } from "@/test/utils";

function renderCreate(onSubmit: (v: ProductFormValues) => Promise<void> = async () => {}) {
  render(
    <ProductForm
      mode="create"
      initialValues={emptyProductForm}
      categories={["Dairy"]}
      submitLabel="Add product"
      cancelHref="/inventory"
      onSubmit={onSubmit}
    />,
  );
}

describe("ProductForm", () => {
  it("validates required fields and numeric rules", async () => {
    const onSubmit = vi.fn(async () => {});
    renderCreate(onSubmit);
    await userEvent.type(screen.getByLabelText("Selling price (₹)"), "12.345");
    await userEvent.type(screen.getByLabelText("Cost price (₹)"), "-1");
    await userEvent.type(screen.getByLabelText("Pack size"), "0");
    await userEvent.click(screen.getByRole("button", { name: "Add product" }));

    expect(await screen.findByText("Product name is required")).toBeInTheDocument();
    expect(screen.getByText("Selling price can have at most 2 decimal places")).toBeInTheDocument();
    expect(screen.getByText("Cost price must be at least 0")).toBeInTheDocument();
    expect(screen.getByText("Pack size must be greater than 0")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("requires a selling price", async () => {
    renderCreate();
    await userEvent.type(screen.getByLabelText("Product name"), "Tata Salt");
    await userEvent.click(screen.getByRole("button", { name: "Add product" }));
    expect(await screen.findByText("Selling price is required")).toBeInTheDocument();
  });

  it("submits typed values, including aliases added with Enter", async () => {
    const onSubmit = vi.fn(async () => {});
    renderCreate(onSubmit);
    await userEvent.type(screen.getByLabelText("Product name"), "Tata Salt");
    await userEvent.selectOptions(screen.getByLabelText("Unit"), "KG");
    await userEvent.type(screen.getByLabelText("Selling price (₹)"), "28");
    await userEvent.type(screen.getByLabelText("Opening stock"), "12.5");
    await userEvent.type(screen.getByLabelText("Aliases"), "namak{Enter}");
    await userEvent.type(screen.getByLabelText("Aliases"), "नमक{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Remove alias namak" }));
    await userEvent.click(screen.getByRole("button", { name: "Add product" }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]).toEqual([
      expect.objectContaining({ name: "Tata Salt", unit: "KG", sellingPrice: "28", stockQuantity: "12.5", aliases: ["नमक"] }),
    ]);
  });

  it("maps DUPLICATE_PRODUCT to the conflicting field and shows the conflict message", async () => {
    const onSubmit = vi.fn(async () => {
      throw new ApiClientError(409, {
        code: "DUPLICATE_PRODUCT",
        message: "A product with this SKU already exists",
        details: [{ field: "sku", message: "SKU already in use" }],
      });
    });
    renderCreate(onSubmit);
    await userEvent.type(screen.getByLabelText("Product name"), "Tata Salt");
    await userEvent.type(screen.getByLabelText("Selling price (₹)"), "28");
    await userEvent.type(screen.getByLabelText("SKU"), "SKU-1");
    await userEvent.click(screen.getByRole("button", { name: "Add product" }));

    expect(await screen.findByText("A product with this SKU already exists")).toBeInTheDocument();
    expect(screen.getByText("SKU already in use")).toBeInTheDocument();
    expect(screen.getByLabelText("SKU")).toHaveAttribute("aria-invalid", "true");
  });

  it("maps VALIDATION_FAILED details, including nested alias paths", async () => {
    const onSubmit = vi.fn(async () => {
      throw new ApiClientError(400, {
        code: "VALIDATION_FAILED",
        message: "Validation failed",
        details: [
          { field: "name", message: "size must be between 1 and 150" },
          { field: "aliases[0]", message: "must not be blank" },
        ],
      });
    });
    renderCreate(onSubmit);
    await userEvent.type(screen.getByLabelText("Product name"), "Tata Salt");
    await userEvent.type(screen.getByLabelText("Selling price (₹)"), "28");
    await userEvent.click(screen.getByRole("button", { name: "Add product" }));

    expect(await screen.findByText("size must be between 1 and 150")).toBeInTheDocument();
    expect(screen.getByText("must not be blank")).toBeInTheDocument();
    expect(screen.queryByText("Validation failed")).not.toBeInTheDocument();
  });

  it("shows a generic message for non-API errors", async () => {
    renderCreate(async () => {
      throw new Error("boom");
    });
    await userEvent.type(screen.getByLabelText("Product name"), "Tata Salt");
    await userEvent.type(screen.getByLabelText("Selling price (₹)"), "28");
    await userEvent.click(screen.getByRole("button", { name: "Add product" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("hides opening stock when editing and explains how stock changes", () => {
    render(
      <ProductForm
        mode="edit"
        initialValues={productToFormValues(product())}
        currentStock="24 packet"
        submitLabel="Save changes"
        cancelHref="/inventory"
        onSubmit={async () => {}}
      />,
    );
    expect(screen.queryByLabelText("Opening stock")).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Current stock: 24 packet");
    expect(screen.getByRole("note")).toHaveTextContent(/inventory adjustments/i);
    expect(screen.getByRole("switch", { name: /Active/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Remove alias doodh" })).toBeInTheDocument();
  });
});
