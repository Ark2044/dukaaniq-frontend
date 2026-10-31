import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { DemoBanner } from "./DemoBanner";
import { MobileTopBar } from "./MobileTopBar";
import { Sidebar } from "./Sidebar";
import { SidebarAccount } from "./SidebarAccount";

/** Authenticated layout; render only behind <RequireAuth>. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar account={<SidebarAccount />} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="flex-1 px-4 pb-28 pt-6 md:px-10 md:pb-10 md:pt-10">
          <div className="mx-auto w-full max-w-5xl">
            <DemoBanner />
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
