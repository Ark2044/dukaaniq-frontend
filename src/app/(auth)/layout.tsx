import type { ReactNode } from "react";
import { PublicOnly } from "@/components/auth/AuthGuard";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <PublicOnly>{children}</PublicOnly>;
}
