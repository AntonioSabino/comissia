import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRoleHome } from "@/modules/auth/application/authorization";
import { getCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar | Comissia",
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getRoleHome(user.role));
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">
          C
        </div>
        <p className="eyebrow">Acesso seguro</p>
        <h1 id="login-title">Entrar na Comissia</h1>
        <p className="auth-subtitle">
          Use o e-mail e a senha cadastrados pela administração.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
