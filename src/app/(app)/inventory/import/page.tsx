import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/Card";
import { ImportPanel } from "@/components/products/ImportPanel";

export const metadata = { title: "Import products" };

export default function ImportProductsPage() {
  return (
    <>
      <Link href="/inventory" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Inventory
      </Link>
      <PageHeader title="Import products" description="Add many products at once from a CSV file. Preview first to catch mistakes." />
      <ImportPanel />
    </>
  );
}
