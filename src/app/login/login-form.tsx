"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/app/_components/ui/alert";
import { Button } from "@/app/_components/ui/button";
import { Field, Form, Input } from "@/app/_components/ui/field";

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const result = (await response.json()) as { message?: unknown };

    return typeof result.message === "string"
      ? result.message
      : "Não foi possível entrar";
  } catch {
    return "Não foi possível entrar";
  }
}

type LoginResult = {
  user?: {
    role?: unknown;
  };
};

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError(await readErrorMessage(response));
        return;
      }

      const result = (await response.json()) as LoginResult;
      const role = result.user?.role;

      if (role !== "admin" && role !== "seller") {
        setError("Não foi possível identificar o perfil do usuário");
        return;
      }

      router.replace(role === "admin" ? "/admin" : "/seller");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao sistema");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Field controlId="login-email" label="E-mail">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </Field>

      <Field controlId="login-password" label="Senha">
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={1024}
          required
        />
      </Field>

      {error ? <Alert tone="critical">{error}</Alert> : null}

      <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
        {isSubmitting ? "Entrando..." : "Entrar"}
      </Button>
    </Form>
  );
}
