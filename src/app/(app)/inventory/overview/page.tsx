import { PageHeader } from "@/components/common/Card";
import { InventoryTabs } from "@/components/inventory/InventoryTabs";
import { StockOverview } from "@/components/inventory/StockOverview";

export const metadata = { title: "Stock overview" };

export default function StockOverviewPage() {
  return (
    <>
      <PageHeader title="Inventory" description="Where your stock stands today." />
      <InventoryTabs />
      <StockOverview />
    </>
  );
}
