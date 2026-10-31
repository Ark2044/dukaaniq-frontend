import { SaleDetails } from "@/components/sales/detail/SaleDetails";

export const metadata = { title: "Sale" };

export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SaleDetails id={id} />;
}
