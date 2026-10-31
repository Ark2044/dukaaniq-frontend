"use client";

import { useId, useMemo, useReducer, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ListChecks, Mic, Plus, RefreshCw, Sparkles } from "lucide-react";
import { Button, buttonStyles } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { useToast } from "@/components/common/Toast";
import { FormAlert } from "@/components/forms/FormAlert";
import { ProductSearch } from "@/components/sales/quick/ProductSearch";
import { PaytmCheckout } from "@/components/payments/SaleAwaitingPayment";
import { DraftCustomerCard } from "./DraftCustomerCard";
import { DraftLineCard } from "./DraftLineCard";
import { DraftPaymentCard } from "./DraftPaymentCard";
import { useCreateSale } from "@/lib/hooks/useSales";
import { buildSaleInput, cartTotals } from "@/lib/sales/cart";
import { mapSaleError } from "@/lib/sales/errors";
import {
  hasLineTotal,
  initialReviewState,
  paymentRows,
  reviewProblems,
  reviewReducer,
  toCartLines,
} from "@/lib/voice/review";
import { QUICK_SALE_HREF } from "@/components/layout/nav";
import { formatINR } from "@/lib/utils/format";
import type { DraftWarning, VoiceDraft } from "@/types/ai";
import type { Sale } from "@/types/sale";

const TRANSCRIPT_MAX = 600;

const WARNING_TEXT: Record<DraftWarning, string> = {
  NO_SPEECH_DETECTED: "We could not hear any speech. Try again closer to the phone, or type the order below.",
  NO_ITEMS_FOUND: "No items were understood. Fix the text and re-check, add items yourself, or type the sale instead.",
  SAME_PRODUCT_TWICE: "The same product was mentioned twice. Check that it is not a repeat.",
};

interface DraftReviewProps {
  draft: VoiceDraft;
  rechecking: boolean;
  recheckError: string | null;
  onRecheck: (transcript: string) => void;
  onStartOver: () => void;
}

/** Nothing here is a sale until Confirm is pressed; the draft only pre-fills what the merchant then checks. */
export function DraftReview({ draft, rechecking, recheckError, onRecheck, onStartOver }: DraftReviewProps) {
  const router = useRouter();
  const toast = useToast();
  const transcriptId = useId();
  const createSale = useCreateSale();
  const [state, dispatch] = useReducer(reviewReducer, undefined, () => initialReviewState(draft, crypto.randomUUID()));
  const [transcript, setTranscript] = useState(draft.transcript);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // A Paytm QR sale that was created from this draft and now waits for the customer to pay.
  const [awaiting, setAwaiting] = useState<Sale | null>(null);

  const trimmed = transcript.trim();
  const transcriptEdited = trimmed !== draft.transcript.trim();
  const priced = useMemo(() => toCartLines(state.lines.filter(hasLineTotal)), [state.lines]);
  const totals = cartTotals(priced, "", []);
  const problems = reviewProblems(draft, state);
  const reasons = transcriptEdited ? [...problems.reasons, "You changed the text. Tap Re-check to update the items."] : problems.reasons;
  const blocked = reasons.length > 0;
  const productIds = useMemo(() => new Set(state.lines.flatMap((l) => (l.product ? [l.product.productId] : []))), [state.lines]);

  const confirm = async () => {
    if (blocked || createSale.isPending) return;
    setFormError(null);
    const cartLines = toCartLines(state.lines);
    try {
      const sale = await createSale.mutateAsync(
        buildSaleInput({
          clientRequestId: state.clientRequestId,
          lines: cartLines,
          customerId: state.customer?.id ?? null,
          discountText: "",
          payments: paymentRows(state.payment, totals.total),
          voiceInteractionId: draft.interactionId,
          collectViaPaytm: state.payment === "PAYTM_QR",
        }),
      );
      if (state.payment === "PAYTM_QR") {
        setAwaiting(sale);
        return;
      }
      toast.success(`Sale ${sale.saleNumber} recorded from your voice order.`);
      router.push(`/sales/${sale.id}`);
    } catch (error) {
      const mapped = mapSaleError(error, cartLines);
      dispatch({ type: "setLineErrors", errors: mapped.lineErrors });
      setFormError(mapped.message);
    }
  };

  if (awaiting) {
    // A draft backs exactly one sale, so starting again means speaking again rather than re-confirming this draft.
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <PaytmCheckout sale={awaiting} onStartAgain={onStartOver} onNewSale={onStartOver} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2 border-warning/40 bg-warning-soft p-4 text-sm text-warning">
        <p className="flex items-start gap-2 font-semibold">
          <ListChecks className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          This is a draft, not a sale. Nothing is saved until you press Confirm.
        </p>
        {draft.extractedBy === "RULES" && (
          <p className="flex items-start gap-2 font-medium">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Understood without AI — please check carefully.
          </p>
        )}
        {draft.warnings.map((warning) => (
          <p key={warning} className="font-medium">
            {WARNING_TEXT[warning]}
          </p>
        ))}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <label htmlFor={transcriptId} className="flex items-center gap-2 text-base font-semibold">
              <Mic className="h-5 w-5 text-muted" aria-hidden /> What we heard
            </label>
            <textarea
              id={transcriptId}
              value={transcript}
              maxLength={TRANSCRIPT_MAX}
              rows={3}
              onChange={(e) => setTranscript(e.target.value)}
              className="min-h-24 w-full rounded-xl border border-line bg-surface px-3 py-2 text-base"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">
                Fix any word we got wrong, then re-check. This replaces the items below.{" "}
                <span aria-label={`${transcript.length} of ${TRANSCRIPT_MAX} characters`}>
                  {transcript.length}/{TRANSCRIPT_MAX}
                </span>
              </p>
              <Button
                variant="secondary"
                onClick={() => onRecheck(trimmed)}
                loading={rechecking}
                disabled={trimmed === "" || !transcriptEdited}
              >
                <RefreshCw className="h-4 w-4" aria-hidden /> Re-check
              </Button>
            </div>
            <FormAlert message={recheckError} />
          </Card>

          <section aria-labelledby="voice-items-heading" className="space-y-3">
            <h2 id="voice-items-heading" className="text-base font-semibold">
              Items {state.lines.length > 0 && <span className="text-sm font-normal text-muted">({state.lines.length})</span>}
            </h2>
            {state.lines.length === 0 ? (
              <Card className="py-6 text-center text-sm text-muted">No items yet. Add an item below.</Card>
            ) : (
              <ul className="space-y-3">
                {state.lines.map((line) => (
                  <DraftLineCard
                    key={line.key}
                    line={line}
                    serverError={line.product ? state.lineErrors[line.product.productId] : undefined}
                    dispatch={dispatch}
                  />
                ))}
              </ul>
            )}
            {problems.duplicateProducts.length > 0 && (
              <p className="text-sm font-medium text-warning">
                {problems.duplicateProducts.join(", ")} appears more than once. Check that this is what you want.
              </p>
            )}
            {adding ? (
              <Card className="space-y-3 p-4">
                <ProductSearch
                  embedded
                  inputId="voice-add-search"
                  label="Search products to add to this sale"
                  inCart={productIds}
                  onAdd={(product) => {
                    dispatch({ type: "addProduct", product });
                    setAdding(false);
                  }}
                />
                <Button variant="ghost" className="w-full" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </Card>
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" aria-hidden /> Add an item
              </Button>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <DraftCustomerCard spoken={draft.customer} customer={state.customer} skipped={state.customerSkipped} dispatch={dispatch} />
          <DraftPaymentCard
            payment={state.payment}
            hint={draft.paymentHint}
            total={totals.total}
            customerName={state.customer?.label ?? null}
            dispatch={dispatch}
          />

          <Card className="space-y-1 p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-muted">Total (catalogue prices)</p>
              <p className="text-2xl font-bold" data-testid="voice-total">
                {formatINR(totals.total)}
              </p>
            </div>
            {priced.length < state.lines.length && <p className="text-xs text-muted">Items still being sorted out are not counted yet.</p>}
          </Card>

          <FormAlert message={formError} />
          {blocked && (
            <div className="rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" aria-hidden /> Before you can confirm:
              </p>
              <ul className="mt-1 list-inside list-disc space-y-0.5" aria-label="Before you can confirm">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          <Button className="min-h-14 w-full text-base" onClick={confirm} loading={createSale.isPending} disabled={blocked}>
            {createSale.isPending
              ? "Saving sale…"
              : state.payment === "PAYTM_QR"
                ? `Confirm and show QR · ${formatINR(totals.total)}`
                : `Confirm sale · ${formatINR(totals.total)}`}
          </Button>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={onStartOver} disabled={createSale.isPending}>
              <Mic className="h-4 w-4" aria-hidden /> Speak again
            </Button>
            <Link href={QUICK_SALE_HREF} className={buttonStyles("secondary")}>
              Type instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
