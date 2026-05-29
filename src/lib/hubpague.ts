/**
 * Cliente HubPague Cash API (PIX cash-in).
 * @see https://api.hubpague.com/docs/cash
 */

import QRCode from "qrcode";
import { getPixQrImgSrc } from "./pix-qr";
import type { CheckoutConfig } from "./admin-types";

const HUBPAGUE_BASE = "https://api.hubpague.com/api/public/cash";

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

function unwrapData(data: Record<string, unknown>): Record<string, unknown> {
  if (data.success === true && data.data && typeof data.data === "object" && !Array.isArray(data.data)) {
    return data.data as Record<string, unknown>;
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
  if (data.success === false && typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }
  const msg = data.message ?? data.error;
  if (typeof msg === "string" && msg.trim()) return msg;
  return fallback;
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

/** Testa credenciais com GET /balance. */
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

  const { res, data } = await hubpagueFetch("/balance", creds, { method: "GET" });
  const msg = formatHubpagueError(data, `HTTP ${res.status}`);

  if (res.ok && data.success !== false) {
    const balance = unwrapData(data);
    const available = balance.available ?? balance.availableBalance;
    const suffix =
      available != null ? ` — saldo disponível: ${formatBalance(available)}` : "";
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
    hint: "Use Authorization: Bearer {seu_api_token} conforme a documentação Cash API.",
  };
}

function formatBalance(value: unknown): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
  }
  return String(value);
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
  externalRef: string;
  webhookUrl: string;
}): Promise<HubpagueCreateResult> {
  const docDigits = params.customer.document.replace(/\D/g, "").slice(0, 11);
  if (docDigits.length !== 11) {
    throw new Error("HubPague: CPF do pagador deve ter 11 dígitos.");
  }

  const body = {
    amount: params.amountInCents,
    method: "pix",
    transactionOrigin: "cashin",
    externalId: params.externalRef,
    postbackUrl: params.webhookUrl,
    payer: {
      name: params.customer.name,
      email: params.customer.email,
      document: docDigits,
      phone: { number: params.customer.phone.replace(/\D/g, "") },
    },
  };

  const { res, data } = await hubpagueFetch("/deposits/pix", params.credentials, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || data.success === false) {
    throw new Error(formatHubpagueError(data, `HubPague: HTTP ${res.status}`));
  }

  const deposit = unwrapData(data);
  const id = String(deposit.id ?? "").trim();
  if (!id) {
    throw new Error("HubPague: resposta sem ID. " + JSON.stringify(data));
  }

  const pixObj = deposit.pix as Record<string, unknown> | undefined;
  const copyPaste = String(pixObj?.code ?? "").trim();
  const imageBase64 = String(pixObj?.imageBase64 ?? "").trim();

  const qrRaw =
    imageBase64.startsWith("data:image/") || imageBase64.startsWith("iVBOR") || imageBase64.startsWith("/9j/")
      ? imageBase64
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
  const hash = encodeURIComponent(params.transactionId);
  const { res, data } = await hubpagueFetch(`/deposits/${hash}`, params.credentials, {
    method: "GET",
  });

  if (!res.ok || data.success === false) {
    throw new Error(formatHubpagueError(data, `HubPague status: HTTP ${res.status}`));
  }

  const deposit = unwrapData(data);
  const status = String(deposit.status ?? "waiting_payment").toLowerCase();
  const paid = status === "paid";
  const amountInCents = typeof deposit.amount === "number" ? deposit.amount : 0;

  return { status, paid, amountInCents };
}
