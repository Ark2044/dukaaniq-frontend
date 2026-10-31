import { PageHeader } from "@/components/common/Card";
import { VoiceSale } from "@/components/sales/voice/VoiceSale";

export const metadata = { title: "Speak a sale" };

export default function VoiceSalePage() {
  return (
    <>
      <PageHeader title="Speak a sale" description="Say the items, check the draft, then confirm. Nothing is saved until you confirm." />
      <VoiceSale />
    </>
  );
}
