"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Button, type ButtonVariant } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";

export function LogoutButton({ variant = "secondary", className }: { variant?: ButtonVariant; className?: string }) {
  const { logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    setPending(true);
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out. Please try again.");
      setPending(false);
    }
  };

  return (
    <Button variant={variant} loading={pending} onClick={onClick} className={className}>
      <LogOut className="h-4 w-4" aria-hidden /> Log out
    </Button>
  );
}
