"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductForm } from "./ProductForm";
import { useToast } from "@/components/common/Toast";
import { createProduct, productKeys } from "@/lib/api/products";
import { useProductCategories } from "@/lib/hooks/useProducts";
import { emptyProductForm, toProductCreateInput, type ProductFormValues } from "@/lib/validation/product";

export function CreateProduct() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const categories = useProductCategories().data;

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => createProduct(toProductCreateInput(values)),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      toast.success(`${product.name} added to your catalogue.`);
      router.push("/inventory");
    },
  });

  return (
    <ProductForm
      mode="create"
      initialValues={emptyProductForm}
      categories={categories}
      submitLabel="Add product"
      cancelHref="/inventory"
      onSubmit={async (values) => {
        await mutation.mutateAsync(values);
      }}
    />
  );
}
