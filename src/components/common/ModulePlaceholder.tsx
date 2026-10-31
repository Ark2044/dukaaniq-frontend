import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/common/Card";
import { EmptyState } from "@/components/common/States";

export function ModulePlaceholder({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={icon} title={`${title} is not available yet`} description={description} />
    </>
  );
}
