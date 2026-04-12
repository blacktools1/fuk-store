import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getTenantFromRequest } from "@/lib/tenant";
import {
  readSalesLog,
  dateKeySaoPaulo,
  todayKeySaoPaulo,
  type SaleLogEntry,
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

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function filterByRange(items: SaleLogEntry[], range: "today" | "all"): SaleLogEntry[] {
  if (range === "today") {
    const today = todayKeySaoPaulo();
    return items.filter((e) => dateKeySaoPaulo(e.createdAt) === today);
  }
  return items.slice(0, 200);
}

function filterByStatus(items: SaleLogEntry[], status: string): SaleLogEntry[] {
  if (status === "paid") return items.filter((e) => e.status === "paid");
  if (status === "pending") return items.filter((e) => e.status === "waiting_payment");
  return items;
}

/** `line=p:productId` ou `line=b:orderbumpId` */
function filterByLine(items: SaleLogEntry[], line: string | null): SaleLogEntry[] {
  if (!line?.trim()) return items;
  const v = line.trim();
  if (v.startsWith("p:")) {
    const id = v.slice(2);
    return items.filter((e) => e.lines?.products?.some((p) => p.id === id));
  }
  if (v.startsWith("b:")) {
    const id = v.slice(2);
    return items.filter((e) => e.lines?.bumps?.some((b) => b.id === id));
  }
  return items;
}

function collectLineOptions(items: SaleLogEntry[]): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const e of items) {
    for (const p of e.lines?.products ?? []) {
      const value = `p:${p.id}`;
      if (!seen.has(value)) {
        seen.add(value);
        out.push({ value, label: p.name });
      }
    }
    for (const b of e.lines?.bumps ?? []) {
      const value = `b:${b.id}`;
      if (!seen.has(value)) {
        seen.add(value);
        out.push({ value, label: `Oferta: ${b.title}` });
      }
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

function summarize(items: SaleLogEntry[]) {
  let revenueTotal = 0;
  let revenueMerch = 0;
  let revenueShip = 0;
  let withBreak = 0;
  for (const e of items) {
    revenueTotal += e.amount;
    if (e.amountCart !== undefined && e.amountShipping !== undefined) {
      revenueMerch += (e.amountCart ?? 0) + (e.amountBumps ?? 0);
      revenueShip += e.amountShipping;
      withBreak++;
    }
  }
  const paidCount = items.filter((e) => e.status === "paid").length;
  const pendingCount = items.filter((e) => e.status === "waiting_payment").length;

  return {
    orderCount: items.length,
    paidCount,
    pendingCount,
    revenueTotal: round2(revenueTotal),
    revenueMerchandise: withBreak > 0 ? round2(revenueMerch) : null,
    revenueShipping: withBreak > 0 ? round2(revenueShip) : null,
    ordersWithBreakdown: withBreak,
  };
}

/**
 * GET ?range=today|all&status=all|paid|pending&line=p:ID|b:ID
 * Resposta: items, summary (totais no conjunto filtrado), lineOptions (período sem filtro de linha)
 */
export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req);
    const tenant = getTenantFromRequest(req);
    const range = (req.nextUrl.searchParams.get("range") || "today") as "today" | "all";
    const status = req.nextUrl.searchParams.get("status") || "all";
    const line = req.nextUrl.searchParams.get("line");

    const all = readSalesLog(tenant);
    let scoped = filterByRange(all, range);
    const lineOptions = collectLineOptions(scoped);
    scoped = filterByStatus(scoped, status);
    scoped = filterByLine(scoped, line);
    if (range === "today") scoped = scoped.slice(0, 300);

    const summary = summarize(scoped);

    return NextResponse.json(
      { items: scoped, summary, lineOptions },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
}
