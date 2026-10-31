"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageX } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductForm } from "./ProductForm";
import { ProductStatusBadges, formatStock } from "./ProductStatus";
import { Button, buttonStyles } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/common/States";
import { useToast } from "@/components/common/Toast";
import { ApiClientError } from "@/lib/api/client";
import { deactivateProduct, productKeys, updateProduct } from "@/lib/api/products";
import { useProduct, useProductCategories } from "@/lib/hooks/useProducts";
import { productToFormValues, toProductUpdateInput, type ProductFormValues } from "@/lib/validation/product";

export function ProductEditor({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: product, isPending, isError, error, refetch } = useProduct(id);
  const categories = useProductCategories().data;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const save = useMutation({
    mutationFn: (values: ProductFormValues) => updateProduct(id, toProductUpdateInput(values)),
    onSuccess: async (updated) => {
      queryClient.setQueryData(productKeys.detail(id), updated);
      await queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      toast.success("Product updated.");
    },
  });

  const deactivate = useMutation({
    mutationFn: () => deactivateProduct(id),
    onSuccess: async (updated) => {
      queryClient.setQueryData(productKeys.detail(id), updated);
      await queryClient.invalidateQueries({ queryKey: ["products", "list"] });
      toast.success(`${updated.name} was deactivated.`);
      setConfirmOpen(false);
      router.push("/inventory");
    },
    onError: (e) => {
      setConfirmOpen(false);
      toast.error(e.message);
    },
  });

  if (isPending) {
    return (
      <div data-testid="product-loading" aria-busy="true" className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (isError) {
    if (error instanceof ApiClientError && (error.code === "NOT_FOUND" || error.code === "PRODUCT_NOT_FOUND")) {
      return (
        <EmptyState
          icon={PackageX}
          title="Product not found"
          description="It may have been removed or belongs to a different shop."
          action={
            <Link href="/inventory" className={buttonStyles("secondary")}>
              Back to inventory
            </Link>
          }
        />
      );
    }
    return <ErrorState title="Could not load product" message={error.message} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <ProductStatusBadges product={product} />
      </div>
      <ProductForm
        // Remount with fresh defaults whenever the server copy changes (e.g. after saving).
        key={product.updatedAt}
        mode="edit"
        initialValues={productToFormValues(product)}
        categories={categories}
        currentStock={formatStock(product)}
        submitLabel="Save changes"
        cancelHref="/inventory"
        onSubmit={async (values) => {
          await save.mutateAsync(values);
        }}
      />
      {product.active && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-danger/30">
          <div>
            <h2 className="text-base font-semibold">Deactivate product</h2>
            <p className="text-sm text-muted">Hide it from sales and searches. Sales history is kept.</p>
          </div>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Deactivate
          </Button>
        </Card>
      )}
      <ConfirmDialog
        open={confirmOpen}
        tone="danger"
        title={`Deactivate ${product.name}?`}
        description="It will no longer appear in sales or searches, but its sales history stays intact. You can re-activate it later."
        confirmLabel="Deactivate"
        loading={deactivate.isPending}
        onConfirm={() => deactivate.mutate()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
