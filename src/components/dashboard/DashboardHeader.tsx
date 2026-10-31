"use client";

import { PageHeader } from "@/components/common/Card";
import { useSession } from "@/components/auth/AuthProvider";

export function DashboardHeader() {
  const { merchant, user } = useSession();
  return <PageHeader title={`Welcome, ${merchant.shopName}`} description={`Hello ${user.name} — your shop at a glance.`} />;
}
