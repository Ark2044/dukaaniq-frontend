"use client";

import { useState } from "react";
import { Ban, Undo2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { CollectViaPaytm } from "@/components/payments/CollectViaPaytm";
import { CancelSaleDialog } from "./CancelSaleDialog";
import { ReturnItemsDialog } from "./ReturnItemsDialog";
import { SalePaymentActions } from "./SalePaymentActions";
import type { Sale } from "@/types/sale";

/** Action bar for a sale; cancelled sales are read-only and waiting Paytm sales only offer "Cancel payment" (see SaleAwaitingPayment). */
export function SaleActions({ sale }: { sale: Sale }) {
  const [returning, setReturning] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (sale.status === "CANCELLED" || sale.status === "PENDING_PAYMENT") return null;
  const canReturn = sale.items.some((item) => item.returnedQuantity < item.quantity);

  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label="Sale actions">
      <SalePaymentActions sale={sale}>
        <CollectViaPaytm sale={sale} />
      </SalePaymentActions>
      {canReturn && (
        <Button variant="secondary" onClick={() => setReturning(true)}>
          <Undo2 className="h-4 w-4" aria-hidden /> Return items
        </Button>
      )}
      <Button variant="secondary" className="text-danger" onClick={() => setCancelling(true)}>
        <Ban className="h-4 w-4" aria-hidden /> Cancel sale
      </Button>
      {returning && <ReturnItemsDialog sale={sale} open onClose={() => setReturning(false)} />}
      {cancelling && <CancelSaleDialog sale={sale} open onClose={() => setCancelling(false)} />}
    </div>
  );
}
