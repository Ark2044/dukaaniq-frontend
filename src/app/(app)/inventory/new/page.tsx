import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/Card";
import { CreateProduct } from "@/components/products/CreateProduct";

export const metadata = { title: "Add product" };

export default function NewProductPage() {
  return (
    <>
      <Link href="/inventory" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Inventory
      </Link>
      <PageHeader title="Add product" description="Add a product to your catalogue." />
      <CreateProduct />
    </>
  );
}
