"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Skeleton, ErrorState } from "@/components/common/States";
import { useAuth } from "./AuthProvider";

export function FullPageSkeleton() {
  return (
    <div data-testid="auth-loading" role="status" aria-label="Loading" className="mx-auto w-full max-w-5xl space-y-4 px-4 py-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

/** Client-side guard. The backend still enforces auth on every request; this only controls navigation. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, error, retry } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "authenticated") return <>{children}</>;
  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <ErrorState
          title="Cannot load your session"
          message={error?.message ?? "Something went wrong."}
          onRetry={retry}
        />
      </div>
    );
  }
  return <FullPageSkeleton />;
}

/** For /login and /register: signed-in users are sent to the dashboard. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  if (status === "loading" || status === "authenticated") return <FullPageSkeleton />;
  return <>{children}</>;
}
