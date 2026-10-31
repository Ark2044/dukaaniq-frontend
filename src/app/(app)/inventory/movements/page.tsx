import { PageHeader } from "@/components/common/Card";
import { InventoryTabs } from "@/components/inventory/InventoryTabs";
import { Movements } from "@/components/inventory/Movements";

export const metadata = { title: "Stock movements" };

export default function MovementsPage() {
  return (
    <>
      <PageHeader title="Inventory" description="Every change to your stock, newest first." />
      <InventoryTabs />
      <Movements />
    </>
  );
}
