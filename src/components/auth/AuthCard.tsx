import type { ReactNode } from "react";
import { Store } from "lucide-react";

/** Centered card used by /login and /register (rendered without the app shell). */
export function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-8 sm:items-center">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-white">
            <Store className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-xl font-semibold">DukaanIQ</span>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-muted">{description}</p>
          {children}
        </div>
      </div>
    </main>
  );
}
