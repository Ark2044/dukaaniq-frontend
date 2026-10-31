"use client";

import { useId, useState, type Dispatch } from "react";
import { AlertTriangle, Check, Minus, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { ProductSearch } from "@/components/sales/quick/ProductSearch";
import { UNIT_SHORT_LABELS } from "@/lib/constants/options";
import { allowsDecimals, lineTotal, stepFor } from "@/lib/sales/cart";
import { hasLineTotal, lineIssue, lineNotes, toCartLine, type LineIssue, type ReviewAction, type ReviewLine } from "@/lib/voice/review";
import { cn, formatINR, formatQuantity } from "@/lib/utils/format";

const STEP_BUTTON =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface active:bg-background disabled:opacity-40";

type BadgeTone = "success" | "warning" | "danger" | "neutral";


function badgeFor(line: ReviewLine, issue: LineIssue | null): { tone: BadgeTone; label: string } {
  if (!issue) return { tone: "success", label: "Ready" };
  switch (issue.code) {
    case "AMBIGUOUS":
      return { tone: "warning", label: "Choose product" };
    case "NOT_FOUND":
      return { tone: "danger", label: "Not found" };
    case "UNIT_MISMATCH":
      return { tone: "warning", label: "Unit mismatch" };
    case "QUANTITY_MISSING":
    case "INVALID_QUANTITY":
      return { tone: "warning", label: "Quantity needed" };
    case "INSUFFICIENT_STOCK":
      return { tone: "danger", label: "Not enough stock" };
    case "NEEDS_CHECK":
      return { tone: line.origin === "SPOKEN" ? "warning" : "neutral", label: "Please check" };
  }
}

interface DraftLineCardProps {
  line: ReviewLine;
  serverError?: string;
  dispatch: Dispatch<ReviewAction>;
}

export function DraftLineCard({ line, serverError, dispatch }: DraftLineCardProps) {
  const id = useId();
  const [changing, setChanging] = useState(false);
  const issue = lineIssue(line);
  const notes = lineNotes(line);
  const badge = badgeFor(line, issue);
  const product = line.product;
  const unit = product ? UNIT_SHORT_LABELS[product.unit] : "";
  const cartLine = product ? toCartLine(line, product) : null;
  const showOptions = (!product || changing) && line.options.length > 0;
  const showSearch = !product || changing;
  const label = product?.name ?? (line.spokenName || "New item");

  return (
    <li
      aria-label={`Item: ${label}`}
      className={cn("rounded-2xl border bg-surface p-4", serverError || issue?.code === "INSUFFICIENT_STOCK" ? "border-danger" : "border-line")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-base font-semibold">{label}</p>
          {line.spoken && <p className="text-xs text-muted">You said: “{line.spoken}”</p>}
          {product && (
            <p className="text-xs text-muted">
              {[product.brand, `${formatINR(product.sellingPrice)} per ${unit} (your catalogue price)`].filter(Boolean).join(" · ")}
            </p>
          )}
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: "removeLine", key: line.key })}
          aria-label={`Remove ${label}`}
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-background hover:text-danger"
        >
          <Trash2 className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {issue && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm font-medium text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {issue.message}
        </p>
      )}
      {notes.map((note) => (
        <p key={note} className="mt-2 text-xs font-medium text-warning">
          {note}
        </p>
      ))}
      {serverError && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-danger">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {serverError}
        </p>
      )}

      {showOptions && (
        <div role="group" aria-label={`Choose the product for ${label}`} className="mt-3 space-y-2">
          {line.options.map((option) => {
            const optionUnit = UNIT_SHORT_LABELS[option.unit];
            const chosen = product?.productId === option.productId;
            return (
              <button
                key={option.productId}
                type="button"
                aria-pressed={chosen}
                aria-label={`Use ${option.name}`}
                onClick={() => {
                  dispatch({ type: "pickOption", key: line.key, productId: option.productId });
                  setChanging(false);
                }}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left active:bg-background",
                  chosen ? "border-navy-900 bg-background" : "border-line",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{option.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {[option.brand, `Stock ${formatQuantity(option.stockQuantity)} ${optionUnit}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="text-sm font-semibold">
                  {formatINR(option.sellingPrice)}/{optionUnit}
                </span>
                {chosen && <Check className="h-4 w-4 text-success" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}

      {showSearch && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-muted">
            {line.options.length > 0 ? "Not in the list? Search your products." : "Search your products."}
          </p>
          <ProductSearch
            embedded
            inputId={`${id}-search`}
            label={`Search products for ${label}`}
            initialQuery={product ? "" : line.spokenName}
            inCart={new Set()}
            onAdd={(picked) => {
              dispatch({ type: "pickProduct", key: line.key, product: picked });
              setChanging(false);
            }}
          />
        </div>
      )}

      {product && cartLine && (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-3">
            <div>
              <label htmlFor={`${id}-qty`} className="mb-1 block text-xs font-medium text-muted">
                Quantity ({unit})
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className={STEP_BUTTON}
                  aria-label={`Decrease ${product.name} quantity`}
                  onClick={() => dispatch({ type: "step", key: line.key, direction: -1 })}
                  disabled={Number(line.quantity) <= stepFor(product.unit)}
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
                <input
                  id={`${id}-qty`}
                  aria-label={`${product.name} quantity`}
                  inputMode={allowsDecimals(product.unit) ? "decimal" : "numeric"}
                  value={line.quantity}
                  placeholder="0"
                  onChange={(e) => dispatch({ type: "setQuantity", key: line.key, value: e.target.value })}
                  aria-invalid={issue && issue.code !== "NEEDS_CHECK" ? true : undefined}
                  className="h-12 w-20 rounded-xl border border-line bg-surface text-center text-base font-semibold"
                />
                <button
                  type="button"
                  className={STEP_BUTTON}
                  aria-label={`Increase ${product.name} quantity`}
                  onClick={() => dispatch({ type: "step", key: line.key, direction: 1 })}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <p className="ml-auto text-right text-base font-semibold" data-testid={`line-total-${line.key}`}>
              {hasLineTotal(line) ? formatINR(lineTotal(cartLine)) : "—"}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {issue?.code === "NEEDS_CHECK" && (
              <Button variant="secondary" onClick={() => dispatch({ type: "check", key: line.key })}>
                <Check className="h-4 w-4" aria-hidden /> Looks right
              </Button>
            )}
            {line.origin === "SPOKEN" && !changing && (
              <Button variant="ghost" onClick={() => setChanging(true)}>
                Change product
              </Button>
            )}
            {changing && (
              <Button variant="ghost" onClick={() => setChanging(false)}>
                Keep {product.name}
              </Button>
            )}
          </div>
        </>
      )}
    </li>
  );
}
