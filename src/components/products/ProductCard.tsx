import Link from "next/link";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { ProductStatusBadges, formatStock } from "./ProductStatus";
import { formatINR } from "@/lib/utils/format";
import type { Product } from "@/types/product";

/** Mobile presentation of a product: a single large tap target instead of a dense table row. */
export function ProductCard({ product, onAdjust }: { product: Product; onAdjust?: (product: Product) => void }) {
  const subtitle = [product.brand, product.category].filter(Boolean).join(" · ");
  return (
    <li className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Link href={`/inventory/${product.id}`} className="flex min-h-16 items-center gap-3 p-4 active:bg-background">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{product.name}</p>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold">{formatINR(product.sellingPrice)}</span>
            <span className="text-muted">Stock: {formatStock(product)}</span>
          </div>
          <div className="mt-2 empty:hidden">
            <ProductStatusBadges product={product} />
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
      </Link>
      {onAdjust && (
        <button
          type="button"
          onClick={() => onAdjust(product)}
          aria-label={`Adjust stock for ${product.name}`}
          className="flex min-h-12 w-full items-center justify-center gap-2 border-t border-line text-sm font-medium text-navy-700 active:bg-background"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden /> Adjust stock
        </button>
      )}
    </li>
  );
}
