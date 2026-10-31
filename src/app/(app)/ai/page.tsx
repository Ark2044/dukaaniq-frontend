import { PageHeader } from "@/components/common/Card";
import { Advisor } from "@/components/ai/Advisor";

export const metadata = { title: "Advisor" };

export default function AiPage() {
  return (
    <>
      <PageHeader title="Advisor" description="Ask about your sales, stock and dues in English, हिन्दी or मराठी." />
      <Advisor />
    </>
  );
}
