import { postgresPool } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    await postgresPool.query("SELECT 1");

    return Response.json({ status: "ok" }, { headers: NO_STORE_HEADERS });
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
