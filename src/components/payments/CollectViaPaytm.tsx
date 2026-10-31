"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { Button } from "@/components/common/Button";
import { PaytmQrModal } from "./PaytmQrModal";
import type { Sale } from "@/types/sale";

/**
 * "Collect via Paytm QR" for a completed sale with money still due. The modal is kept mounted while open even
 * after the sale is paid, so the merchant sees the confirmation instead of the button disappearing.
 */
export function CollectViaPaytm({ sale }: { sale: Sale }) {
  const [open, setOpen] = useState(false);
  const collectible = sale.status === "COMPLETED" && sale.dueAmount > 0;
  if (!collectible && !open) return null;

  return (
    <>
      {collectible && (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <QrCode className="h-4 w-4" aria-hidden /> Collect via Paytm QR
        </Button>
      )}
      <PaytmQrModal sale={sale} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
