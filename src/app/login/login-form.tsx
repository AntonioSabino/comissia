"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

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
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </label>

      <label>
        Senha
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={1024}
          required
        />
      </label>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
