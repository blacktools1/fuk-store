/**
 * Cliente HubPague API de Pagamentos (PIX).
 * @see https://documenter.getpostman.com/view/7243567/2sBXVZoaLN
 */

import QRCode from "qrcode";
import { getPixQrImgSrc } from "./pix-qr";
import type { CheckoutConfig } from "./admin-types";

const HUBPAGUE_BASE = "https://app.hubpague.io/api";

export type HubpagueCredentials = {
  apiToken?: string;
};

function normToken(value?: string): string {
  return (value ?? "").trim().replace(/^\uFEFF/, "").replace(/^["']|["']$/g, "");
}

export function hubpagueCredentialsFromConfig(cc?: CheckoutConfig | null): HubpagueCredentials {
  return { apiToken: cc?.hubpagueApiToken };
}

export function hasHubpagueCredentials(creds: HubpagueCredentials): boolean {
  return !!normToken(creds.apiToken);
}

function tokenOrThrow(creds: HubpagueCredentials): string {
  const token = normToken(creds.apiToken);
  if (!token) {
    throw new Error(
      "Credenciais HubPague incompletas. Informe o API Token em Admin → Checkout PIX → HubPague."
    );
  }
  return token;
}

async function hubpagueFetch(
  path: string,
  creds: HubpagueCredentials,
  init: RequestInit
): Promise<{ res: Response; data: Record<string, unknown> }> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${tokenOrThrow(creds)}`);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const res = await fetch(`${HUBPAGUE_BASE}${path}`, { ...init, headers });
  const data = await parseJsonSafely(res);
  return { res, data };
}

/** Resposta pode vir na raiz ou em `data` (GET /transactions). */
function unwrapTransaction(data: Record<string, unknown>): Record<string, unknown> {
  const inner = data.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return data;
}

async function parseJsonSafely(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatHubpagueError(data: Record<string, unknown>, fallback: string): string {
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (data.status === "error" && typeof data.message === "string") {
    return data.message;
  }
  const keys = Object.keys(data).filter((k) => Array.isArray(data[k]));
  if (keys.length > 0) {
    const first = keys[0];
    const arr = data[first] as unknown[];
    if (typeof arr[0] === "string") return `${first}: ${arr[0]}`;
  }
  return fallback;
}

function formatCpfDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length !== 11) return d;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatCnpjDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 14);
  if (d.length !== 14) return d;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

async function qrDataUrlFromPixPayload(emv: string): Promise<string> {
  return QRCode.toDataURL(emv, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}

export type HubpagueAuthTestResult = {
  ok: boolean;
  httpStatus: number;
  message: string;
  hint?: string;
};

/** Testa credenciais com GET /wallets. */
export async function testHubpagueCredentials(
  creds: HubpagueCredentials
): Promise<HubpagueAuthTestResult> {
  if (!normToken(creds.apiToken)) {
    return {
      ok: false,
      httpStatus: 0,
      message: "API Token não informado.",
      hint: "Cole o token em Admin → Checkout PIX → HubPague.",
    };
  }

  const { res, data } = await hubpagueFetch("/wallets", creds, { method: "GET" });
  const msg = formatHubpagueError(data, `HTTP ${res.status}`);

  if (res.ok && data.status !== "error") {
    const wallet = (data.data as Record<string, unknown> | undefined) ?? data;
    const available = wallet.available_balance ?? wallet.current_balance;
    const suffix = available != null ? ` — saldo: ${available}` : "";
    return {
      ok: true,
      httpStatus: res.status,
      message: `Credenciais válidas — conexão HubPague OK${suffix}.`,
    };
  }

  return {
    ok: false,
    httpStatus: res.status,
    message: msg,
    hint: "Token em Integrações no painel HubPague. Header: Authorization: Bearer {token}.",
  };
}

export interface HubpagueCreateResult {
  transactionId: string;
  qrCodeBase64: string;
  qrImageSrc: string;
  copyPaste: string;
}

export interface HubpagueStatusResult {
  status: string;
  paid: boolean;
  amountInCents: number;
}

export async function createHubpaguePayment(params: {
  credentials: HubpagueCredentials;
  amountInCents: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    document: string;
  };
  products: { name: string; unitPrice: number; quantity: number }[];
  externalRef: string;
}): Promise<HubpagueCreateResult> {
  const docDigits = params.customer.document.replace(/\D/g, "");
  const isCnpj = docDigits.length === 14;
  const docType = isCnpj ? "CNPJ" : "CPF";
  const docValue = isCnpj ? formatCnpjDisplay(docDigits) : formatCpfDisplay(docDigits);

  if (!isCnpj && docDigits.length !== 11) {
    throw new Error("HubPague: CPF do pagador deve ter 11 dígitos.");
  }

  const body: Record<string, unknown> = {
    amount: params.amountInCents,
    method: "pix",
    external_id: params.externalRef,
    customer: {
      name: params.customer.name,
      email: params.customer.email,
      phone: params.customer.phone,
      document: {
        type: docType,
        value: docValue,
      },
    },
    products: params.products.map((p) => ({
      name: p.name.slice(0, 200),
      price: p.unitPrice,
      quantity: String(p.quantity || 1),
      type: "digital",
    })),
  };

  const { res, data } = await hubpagueFetch("/payments", params.credentials, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || data.status === "error") {
    throw new Error(formatHubpagueError(data, `HubPague: HTTP ${res.status}`));
  }

  const tx = unwrapTransaction(data);
  const id = String(tx.id ?? data.id ?? "").trim();
  if (!id) {
    throw new Error("HubPague: resposta sem ID. " + JSON.stringify(data));
  }

  const pixObj = (tx.pix ?? data.pix) as Record<string, unknown> | undefined;
  const copyPaste = String(pixObj?.copypaste ?? pixObj?.copyPaste ?? "").trim();
  const qrcode = String(pixObj?.qrcode ?? "").trim();

  const qrRaw =
    qrcode.startsWith("data:image/") || qrcode.startsWith("iVBOR") || qrcode.startsWith("/9j/")
      ? qrcode
      : "";

  let qrImageSrc = getPixQrImgSrc(qrRaw);
  if (!qrImageSrc && copyPaste.length >= 20) {
    try {
      qrImageSrc = await qrDataUrlFromPixPayload(copyPaste);
    } catch (e) {
      console.error("[hubpague] Falha ao gerar QR a partir do payload PIX:", e);
    }
  }

  return {
    transactionId: id,
    qrCodeBase64: qrRaw,
    qrImageSrc,
    copyPaste,
  };
}

export async function checkHubpagueStatus(params: {
  credentials: HubpagueCredentials;
  transactionId: string;
}): Promise<HubpagueStatusResult> {
  const id = encodeURIComponent(params.transactionId);
  const { res, data } = await hubpagueFetch(`/transactions/${id}`, params.credentials, {
    method: "GET",
  });

  if (!res.ok || data.status === "error") {
    throw new Error(formatHubpagueError(data, `HubPague status: HTTP ${res.status}`));
  }

  const tx = unwrapTransaction(data);
  const status = String(tx.status ?? "pending").toLowerCase();
  const paid = status === "paid";
  const amountInCents =
    typeof tx.total === "number"
      ? tx.total
      : typeof data.total === "number"
        ? data.total
        : 0;

  return { status, paid, amountInCents };
}
