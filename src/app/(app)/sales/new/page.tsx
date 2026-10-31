import Link from "next/link";
import { Mic } from "lucide-react";
import { PageHeader } from "@/components/common/Card";
import { QuickSale } from "@/components/sales/quick/QuickSale";
import { VOICE_SALE_HREF } from "@/components/layout/nav";

export const metadata = { title: "Quick sale" };

export default function NewSalePage() {
  return (
    <>
      <PageHeader title="Quick sale" description="Add products, take payment and save in a few taps." />
      <Link
        href={VOICE_SALE_HREF}
        className="mb-4 flex min-h-16 items-center gap-3 rounded-2xl bg-navy-900 px-5 py-3 text-white hover:bg-navy-700"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Mic className="h-6 w-6" aria-hidden />
        </span>
        <span>
          <span className="block text-base font-semibold">Speak a sale</span>
          <span className="block text-sm text-white/75">Say the items in Hindi, Marathi or English — you check before saving.</span>
        </span>
      </Link>
      <QuickSale />
    </>
  );
}
