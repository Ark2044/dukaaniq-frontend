import { PageHeader } from "@/components/common/Card";
import { Card } from "@/components/common/Card";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LanguageSettings } from "@/components/settings/LanguageSettings";
import { AdvisorLanguageSettings } from "@/components/settings/AdvisorLanguageSettings";
import { ShopProfileForm } from "@/components/settings/ShopProfileForm";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Manage your shop profile and preferences." />
      <div className="space-y-6">
        <ShopProfileForm />
        <LanguageSettings />
        <AdvisorLanguageSettings />
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Account</h2>
            <p className="text-sm text-muted">Sign out of DukaanIQ on this device.</p>
          </div>
          <LogoutButton />
        </Card>
      </div>
    </>
  );
}
