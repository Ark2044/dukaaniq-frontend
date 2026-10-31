import { Badge } from "@/components/common/Badge";
import { UNIT_SHORT_LABELS } from "@/lib/constants/options";
import { formatQuantity } from "@/lib/utils/format";
import type { Product } from "@/types/product";

export const formatStock = (product: Pick<Product, "stockQuantity" | "unit">) =>
  `${formatQuantity(product.stockQuantity)} ${UNIT_SHORT_LABELS[product.unit]}`;

export function ProductStatusBadges({ product }: { product: Pick<Product, "lowStock" | "active"> }) {
  if (!product.lowStock && product.active) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {product.lowStock && <Badge tone="warning">Low stock</Badge>}
      {!product.active && <Badge tone="neutral">Inactive</Badge>}
    </span>
  );
}
