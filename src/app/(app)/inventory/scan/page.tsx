import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/Card";
import { ScanFlow } from "@/components/products/scan/ScanFlow";

export const metadata = { title: "Scan a bill" };

export default function ScanBillPage() {
  return (
    <>
      <Link href="/inventory" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Inventory
      </Link>
      <PageHeader title="Scan a bill" description="Photograph a supplier bill and add its products in a few taps." />
      <ScanFlow />
    </>
  );
}
