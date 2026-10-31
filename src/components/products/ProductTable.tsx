import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { ProductStatusBadges, formatStock } from "./ProductStatus";
import { formatINR } from "@/lib/utils/format";
import type { Product } from "@/types/product";

/** Desktop presentation of the catalogue. */
export function ProductTable({ products, onAdjust }: { products: Product[]; onAdjust?: (product: Product) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Product catalogue</caption>
        <thead className="border-b border-line bg-background text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Product</th>
            <th scope="col" className="px-4 py-3 font-semibold">Category</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Price</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Stock</th>
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            {onAdjust && (
              <th scope="col" className="px-4 py-3 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-background/60">
              <td className="px-4 py-3">
                <Link href={`/inventory/${product.id}`} className="inline-flex min-h-11 flex-col justify-center font-semibold hover:underline">
                  {product.name}
                  <span className="text-xs font-normal text-muted">
                    {[product.brand, product.sku].filter(Boolean).join(" · ")}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3 text-muted">{product.category ?? "—"}</td>
              <td className="px-4 py-3 text-right font-semibold">{formatINR(product.sellingPrice)}</td>
              <td className="px-4 py-3 text-right">{formatStock(product)}</td>
              <td className="px-4 py-3">
                <ProductStatusBadges product={product} />
              </td>
              {onAdjust && (
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onAdjust(product)}
                    aria-label={`Adjust stock for ${product.name}`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-navy-700 hover:bg-background"
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden /> Adjust stock
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
