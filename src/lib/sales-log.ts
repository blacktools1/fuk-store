import fs from "fs";
import path from "path";
import { tenantDir } from "@/lib/store-data";

const FILE = "sales-log.json";
const MAX_ENTRIES = 500;
const TZ = "America/Sao_Paulo";

export type SaleLogStatus = "waiting_payment" | "paid";

export interface SaleLogCustomer {
  name: string;
  email: string;
  phone: string;
  document: string;
}

/** Linha de produto no carrinho (checkout) */
export interface SaleLogLineProduct {
  id: string;
  name: string;
  qty: number;
  lineTotal: number;
}

export interface SaleLogLineBump {
  id: string;
  title: string;
  price: number;
}

export interface SaleLogEntry {
  id: string;
  createdAt: string;
  customer: SaleLogCustomer;
  status: SaleLogStatus;
  /** Total cobrado (PIX) */
  amount: number;
  /** Subtotal carrinho após desconto PIX */
  amountCart?: number;
  /** Soma order bumps */
  amountBumps?: number;
  /** Frete cobrado */
  amountShipping?: number;
  lines?: {
    products: SaleLogLineProduct[];
    bumps: SaleLogLineBump[];
  };
  utms: Record<string, string>;
}

interface FileShape {
  v: number;
  items: SaleLogEntry[];
}

function pathFor(tenant: string): string {
  return path.join(tenantDir(tenant), FILE);
}

function ensureDir(tenant: string) {
  const d = tenantDir(tenant);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

export function readSalesLog(tenant: string): SaleLogEntry[] {
  const p = pathFor(tenant);
  if (!fs.existsSync(p)) return [];
  try {
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw) as FileShape;
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

function writeLog(tenant: string, items: SaleLogEntry[]) {
  ensureDir(tenant);
  const payload: FileShape = { v: 1, items };
  fs.writeFileSync(pathFor(tenant), JSON.stringify(payload), "utf8");
}

/** Data YYYY-MM-DD no fuso SP — para filtro "hoje" no admin */
export function dateKeySaoPaulo(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

export function todayKeySaoPaulo(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/**
 * Registra ou atualiza pedido após gerar PIX (idempotente por transactionId).
 */
export function upsertSalePending(
  tenant: string,
  input: {
    id: string;
    customer: SaleLogCustomer;
    amount: number;
    amountCart: number;
    amountBumps: number;
    amountShipping: number;
    lines: { products: SaleLogLineProduct[]; bumps: SaleLogLineBump[] };
    utms: Record<string, string>;
  }
) {
  try {
    const items = readSalesLog(tenant);
    const createdAt = new Date().toISOString();
    const idx = items.findIndex((x) => x.id === input.id);
    const row: SaleLogEntry = {
      id: input.id,
      createdAt,
      customer: input.customer,
      status: "waiting_payment",
      amount: input.amount,
      amountCart: input.amountCart,
      amountBumps: input.amountBumps,
      amountShipping: input.amountShipping,
      lines: input.lines,
      utms: input.utms || {},
    };
    if (idx >= 0) {
      const prev = items[idx];
      items[idx] = {
        ...row,
        createdAt: prev.createdAt,
        status: prev.status === "paid" ? "paid" : "waiting_payment",
      };
    } else {
      items.unshift(row);
      if (items.length > MAX_ENTRIES) items.length = MAX_ENTRIES;
    }
    writeLog(tenant, items);
  } catch (e) {
    console.error("[sales-log] upsertSalePending:", e);
  }
}

export function markSalePaid(tenant: string, transactionId: string) {
  try {
    const items = readSalesLog(tenant);
    const idx = items.findIndex((x) => x.id === transactionId);
    if (idx < 0) return;
    items[idx] = { ...items[idx], status: "paid" };
    writeLog(tenant, items);
  } catch (e) {
    console.error("[sales-log] markSalePaid:", e);
  }
}
