import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandMark } from "@/app/_components/shell/brand-mark";
import { Card } from "@/app/_components/ui/card";
import { getRoleHome } from "@/modules/auth/application/authorization";
import { getCurrentUser } from "@/modules/auth/infrastructure/next/current-user";
import styles from "./login.module.css";
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
    <main className={styles.page}>
      <Card className={styles.card} aria-labelledby="login-title">
        <BrandMark />
        <p className={styles.eyebrow}>Acesso seguro</p>
        <h1 id="login-title" className={styles.title}>
          Entrar na Comissia
        </h1>
        <p className={styles.subtitle}>
          Use o e-mail e a senha cadastrados pela administração.
        </p>
        <LoginForm />
      </Card>
    </main>
  );
}
