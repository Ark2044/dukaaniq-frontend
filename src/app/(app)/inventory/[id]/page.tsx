import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/Card";
import { ProductEditor } from "@/components/products/ProductEditor";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Link href="/inventory" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Inventory
      </Link>
      <PageHeader title="Edit product" description="Update prices, names and aliases." />
      <ProductEditor id={id} />
    </>
  );
}
