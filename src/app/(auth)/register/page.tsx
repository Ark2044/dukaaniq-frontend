import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "Create your shop" };

export default function RegisterPage() {
  return (
    <AuthCard title="Set up your shop" description="Create your DukaanIQ account in a minute.">
      <RegisterForm />
    </AuthCard>
  );
}
