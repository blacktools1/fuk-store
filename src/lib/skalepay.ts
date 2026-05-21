/**
 * Cliente SkalePayments API (PIX).
 * @see https://api.skalepayments.com.br — autenticação via header X-API-Key
 */

import QRCode from "qrcode";
import { getPixQrImgSrc } from "./pix-qr";
import type { CheckoutConfig } from "./admin-types";

const SKALE_BASE = "https://api.skalepayments.com.br";

/** Limites do gateway (centavos) */
export const SKALE_MIN_AMOUNT_CENTS = 500;
export const SKALE_MAX_AMOUNT_CENTS = 60_000;

export type SkaleCredentials = {
  apiKey?: string;
};

function normCredential(value?: string): string {
  return (value ?? "").trim().replace(/^\uFEFF/, "").replace(/^["']|["']$/g, "");
}

export function skaleCredentialsFromConfig(cc?: CheckoutConfig | null): SkaleCredentials {
  return {
    apiKey: cc?.skalepayApiKey ?? cc?.skalepaySecretKey,
  };
}

export function hasSkaleCredentials(creds: SkaleCredentials): boolean {
  return !!normCredential(creds.apiKey);
}

function apiKeyOrThrow(creds: SkaleCredentials): string {
  const apiKey = normCredential(creds.apiKey);
  if (!apiKey) {
    throw new Error(
      "Credenciais SkalePayments incompletas. Informe a Chave de API (formato sk_…) no admin."
    );
  }
  return apiKey;
}

async function skaleFetch(
  path: string,
  creds: SkaleCredentials,
  init: RequestInit
): Promise<{ res: Response; data: Record<string, unknown> }> {
  const headers = new Headers(init.headers);
  headers.set("X-API-Key", apiKeyOrThrow(creds));
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const res = await fetch(`${SKALE_BASE}${path}`, { ...init, headers });
  const data = await parseJsonSafely(res);
  return { res, data };
}

export type SkaleAuthTestResult = {
  ok: boolean;
  httpStatus: number;
  message: string;
  hint?: string;
};

/** Testa credenciais com GET /company (sem criar cobrança). */
export async function testSkaleCredentials(creds: SkaleCredentials): Promise<SkaleAuthTestResult> {
  const apiKey = normCredential(creds.apiKey);
  if (!apiKey) {
    return {
      ok: false,
      httpStatus: 0,
      message: "Chave de API não informada.",
      hint: "Cole a chave sk_… em Admin → Checkout PIX → Skale Pay.",
    };
  }

  const { res, data } = await skaleFetch("/company", creds, { method: "GET" });
  const msg = formatSkaleError(data, `HTTP ${res.status}`);

  if (res.ok) {
    const blocked = data.blocked === true;
    const pixOk =
      (data.permissions as Record<string, unknown> | undefined)?.isPixAvailable !== false;
    if (blocked) {
      return {
        ok: false,
        httpStatus: res.status,
        message: "Conta bloqueada ou cadastro rejeitado no SkalePayments.",
        hint: "Conclua o KYC no painel Skale antes de gerar PIX.",
      };
    }
    if (!pixOk) {
      return {
        ok: false,
        httpStatus: res.status,
        message: "Conta conectada, mas PIX não está habilitado.",
        hint: "Ative PIX nas permissões da conta no painel Skale.",
      };
    }
    const name =
      (data.user as Record<string, unknown> | undefined)?.name ??
      data.legalName ??
      data.userId;
    return {
      ok: true,
      httpStatus: res.status,
      message: `Credenciais válidas${name ? ` — ${String(name)}` : ""}.`,
    };
  }

  return {
    ok: false,
    httpStatus: res.status,
    message: msg,
    hint:
      "Use o header X-API-Key com a chave sk_… do painel SkalePayments. Gere uma chave nova se necessário.",
  };
}

async function qrDataUrlFromPixPayload(emv: string): Promise<string> {
  return QRCode.toDataURL(emv, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}

async function parseJsonSafely(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatSkaleError(data: Record<string, unknown>, fallback: string): string {
  if (data.success === false && typeof data.message === "string") {
    return data.message;
  }
  const msg = data.message ?? data.error ?? data.errors;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (Array.isArray(msg) && msg.length > 0) {
    const first = msg[0] as { message?: string; description?: string };
    const d = first.message || first.description;
    if (d) return String(d);
  }
  return fallback;
}

function parseAmountCents(data: Record<string, unknown>): number {
  if (typeof data.amount === "number") return data.amount;
  const tx = data.transaction as Record<string, unknown> | undefined;
  if (tx && typeof tx.amount === "string") {
    const reais = parseFloat(tx.amount.replace(",", "."));
    if (!Number.isNaN(reais)) return Math.round(reais * 100);
  }
  if (tx && typeof tx.amount === "number") return tx.amount;
  return 0;
}

export interface SkaleCreateResult {
  transactionId: string;
  qrCodeBase64: string;
  qrImageSrc: string;
  copyPaste: string;
}

export interface SkaleStatusResult {
  status: string;
  paid: boolean;
  amountInCents: number;
}

export async function createSkalePayment(params: {
  credentials: SkaleCredentials;
  amountInCents: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    document: string;
  };
  items: { name: string; unitPrice: number; quantity: number; externalRef?: string }[];
  externalRef: string;
  webhookUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<SkaleCreateResult> {
  if (params.amountInCents < SKALE_MIN_AMOUNT_CENTS) {
    throw new Error(
      `Valor mínimo SkalePayments: R$ ${(SKALE_MIN_AMOUNT_CENTS / 100).toFixed(2).replace(".", ",")}.`
    );
  }
  if (params.amountInCents > SKALE_MAX_AMOUNT_CENTS) {
    throw new Error(
      `Valor máximo SkalePayments por PIX: R$ ${(SKALE_MAX_AMOUNT_CENTS / 100).toFixed(2).replace(".", ",")}.`
    );
  }

  const docDigits = params.customer.document.replace(/\D/g, "");
  const docType = docDigits.length === 14 ? "cnpj" : "cpf";

  const metadata: Record<string, unknown> = {
    ref: params.externalRef,
    ...(params.metadata ?? {}),
  };

  const body: Record<string, unknown> = {
    amount: params.amountInCents,
    paymentMethod: "pix",
    customer: {
      name: params.customer.name,
      email: params.customer.email,
      phone: params.customer.phone.replace(/\D/g, ""),
      document: {
        number: docDigits,
        type: docType,
      },
    },
    items: params.items.map((i, idx) => ({
      title: i.name,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      tangible: false,
      ...(i.externalRef || idx === 0 ? { externalRef: i.externalRef ?? params.externalRef } : {}),
    })),
    pix: { expiresInDays: 2 },
    postbackUrl: params.webhookUrl,
    metadata,
  };

  const { res, data } = await skaleFetch("/transactions", params.credentials, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || data.success === false) {
    const hint =
      res.status === 401 || res.status === 403
        ? " Verifique a Chave de API (header X-API-Key, formato sk_…)."
        : "";
    throw new Error(formatSkaleError(data, `SkalePayments: HTTP ${res.status}`) + hint);
  }

  const id = String(data.id ?? "").trim();
  if (!id) {
    throw new Error("SkalePayments: resposta sem ID. " + JSON.stringify(data));
  }

  const pixObj = data.pix as Record<string, unknown> | undefined;
  const copyPaste = String(pixObj?.qrcode ?? "").trim();
  const qrcodeImage = String(pixObj?.qrcodeImage ?? "").trim();

  const qrRaw = (() => {
    if (qrcodeImage.startsWith("data:image/") || qrcodeImage.startsWith("iVBOR") || qrcodeImage.startsWith("/9j/")) {
      return qrcodeImage;
    }
    if (copyPaste.startsWith("data:image/") || copyPaste.startsWith("iVBOR") || copyPaste.startsWith("/9j/")) {
      return copyPaste;
    }
    return "";
  })();

  let qrImageSrc = getPixQrImgSrc(qrRaw);
  if (!qrImageSrc && copyPaste.length >= 20) {
    try {
      qrImageSrc = await qrDataUrlFromPixPayload(copyPaste);
    } catch (e) {
      console.error("[skalepay] Falha ao gerar QR EMV:", e);
    }
  }

  return {
    transactionId: id,
    qrCodeBase64: qrRaw,
    qrImageSrc,
    copyPaste,
  };
}

export async function checkSkaleStatus(params: {
  credentials: SkaleCredentials;
  transactionId: string;
}): Promise<SkaleStatusResult> {
  const id = encodeURIComponent(params.transactionId);
  const { res, data } = await skaleFetch(`/transactions/${id}`, params.credentials, {
    method: "GET",
  });

  if (!res.ok || data.success === false) {
    throw new Error(formatSkaleError(data, `SkalePayments status: HTTP ${res.status}`));
  }

  const status = String(data.status ?? "waiting_payment").toLowerCase();
  const paid = status === "paid";
  const amountInCents = parseAmountCents(data);

  return { status, paid, amountInCents };
}
