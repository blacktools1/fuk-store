import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getTenantFromRequest } from "@/lib/tenant";
import {
  getTodayPaidSummary,
  getTodayPendingSnapshot,
  todayKeySaoPaulo,
} from "@/lib/sales-log";

export const dynamic = "force-dynamic";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ||
    "minha-loja-admin-secret-key-change-this-in-production-2024"
);

async function verifyAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) throw new Error("Unauthorized");
  const { payload } = await jwtVerify(token, JWT_SECRET);
  const tenant = getTenantFromRequest(req);
  if (payload.tenant && payload.tenant !== tenant) throw new Error("Unauthorized");
}

/** Totais do dia (hoje em SP): vendas pagas + snapshot de PIX pendentes. Leve — sem listar pedidos. */
export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req);
    const tenant = getTenantFromRequest(req);
    const paidToday = getTodayPaidSummary(tenant);
    const pendingToday = getTodayPendingSnapshot(tenant);

    return NextResponse.json(
      {
        dateKey: todayKeySaoPaulo(),
        timezone: "America/Sao_Paulo",
        paidToday,
        pendingToday,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
}
