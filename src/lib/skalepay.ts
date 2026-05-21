/**
 * Cliente TypeScript para a Skale Pay API (PIX).
 *
 * Painel Skale (Credenciais de API):
 * - Chave de API — autenticação das requisições
 * - ID do usuário — identificador da conta (referência; não entra no Basic Auth)
 *
 * @see https://skalepay.readme.io/reference/introducao — Basic base64("{CHAVE_DE_API}:x")
 */

import QRCode from "qrcode";
import { getPixQrImgSrc } from "./pix-qr";
import type { CheckoutConfig } from "./admin-types";

const SKALE_BASE = "https://api.conta.skalepay.com.br/v1";

export type SkaleCredentials = {
  /** Chave de API do painel Skale */
  apiKey?: string;
  /** ID do usuário (conta) — salvo para referência; auth usa só apiKey:x */
  userId?: string;
};

function normCredential(value?: string): string {
  return (value ?? "")
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
}

/** Lê credenciais salvas no checkout (compatível com campo legado skalepaySecretKey). */
export function skaleCredentialsFromConfig(cc?: CheckoutConfig | null): SkaleCredentials {
  return {
    apiKey: cc?.skalepayApiKey ?? cc?.skalepaySecretKey,
    userId: cc?.skalepayUserId,
  };
}

/**
 * Autenticação oficial Skale Pay: Basic Auth com usuário = Chave de API e senha = "x".
 */
export function resolveSkaleAuth(creds: SkaleCredentials): {
  username: string;
  password: string;
  mode: string;
} {
  const apiKey = normCredential(creds.apiKey);
  if (!apiKey) {
    throw new Error(
      "Chave de API Skale Pay não configurada. Copie em Configurações → Credenciais de API no painel Skale."
    );
  }
  return { username: apiKey, password: "x", mode: "apiKey:x" };
}

export function hasSkaleCredentials(creds: SkaleCredentials): boolean {
  return normCredential(creds.apiKey).length > 0;
}

function basicAuth(creds: SkaleCredentials): string {
  const { username, password } = resolveSkaleAuth(creds);
  const encoded = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${encoded}`;
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
  const msg = data.message ?? data.error ?? data.errors;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (Array.isArray(msg) && msg.length > 0) {
    const first = msg[0] as { message?: string; description?: string };
    const d = first.message || first.description;
    if (d) return String(d);
  }
  return fallback;
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
  items: { name: string; unitPrice: number; quantity: number }[];
  externalRef: string;
  webhookUrl: string;
  metadata?: string;
}): Promise<SkaleCreateResult> {
  const auth = resolveSkaleAuth(params.credentials);
  const docDigits = params.customer.document.replace(/\D/g, "");
  const docType = docDigits.length === 14 ? "cnpj" : "cpf";

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
      externalRef: params.externalRef,
    },
    items: params.items.map((i) => ({
      title: i.name,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      tangible: false,
    })),
    pix: { expiresInDays: 2 },
    postbackUrl: params.webhookUrl,
  };

  const userId = normCredential(params.credentials.userId);
  const meta: Record<string, unknown> = { ref: params.externalRef };
  if (userId) meta.skaleUserId = userId;
  if (params.metadata?.trim()) {
    try {
      Object.assign(meta, JSON.parse(params.metadata) as Record<string, unknown>);
    } catch {
      meta.note = params.metadata.trim().slice(0, 200);
    }
  }
  body.metadata = JSON.stringify(meta).slice(0, 500);

  const res = await fetch(`${SKALE_BASE}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuth(params.credentials),
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonSafely(res);
  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? ` Auth: ${auth.mode} (Chave de API + senha "x", conforme documentação Skale). Cole só a Chave de API — não use o ID do usuário na autenticação.`
        : "";
    throw new Error(formatSkaleError(data, `Skale Pay: HTTP ${res.status}`) + hint);
  }

  const id = String(data.id ?? "").trim();
  if (!id) {
    throw new Error("Skale Pay: resposta sem ID. " + JSON.stringify(data));
  }

  const pixObj = data.pix as Record<string, unknown> | undefined;
  const copyPaste = String(pixObj?.qrcode ?? "").trim();

  const qrRaw = (() => {
    const raw = copyPaste;
    if (raw.startsWith("data:image/") || raw.startsWith("iVBOR") || raw.startsWith("/9j/")) {
      return raw;
    }
    return "";
  })();

  let qrImageSrc = getPixQrImgSrc(qrRaw);
  if (!qrImageSrc && copyPaste.length >= 20) {
    try {
      qrImageSrc = await qrDataUrlFromPixPayload(copyPaste);
    } catch (e) {
      console.error("[skalepay] Falha ao gerar QR a partir do payload PIX:", e);
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
  const res = await fetch(`${SKALE_BASE}/transactions/${id}`, {
    headers: {
      Authorization: basicAuth(params.credentials),
      Accept: "application/json",
    },
  });

  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new Error(formatSkaleError(data, `Skale Pay status: HTTP ${res.status}`));
  }

  const status = String(data.status ?? "pending").toLowerCase();
  const paid = status === "paid" || status === "approved";
  const amountInCents = typeof data.amount === "number" ? data.amount : 0;

  return { status, paid, amountInCents };
}
