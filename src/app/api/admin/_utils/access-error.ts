import { NextResponse } from "next/server";

export function adminAccessError(status: "unauthenticated" | "forbidden") {
  return NextResponse.json(
    {
      message:
        status === "unauthenticated"
          ? "Faça login para continuar"
          : "Acesso permitido apenas para administradores",
    },
    { status: status === "unauthenticated" ? 401 : 403 },
  );
}
