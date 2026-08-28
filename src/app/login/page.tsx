import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar | Comissia",
};

export default function LoginPage() {
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
