/**
 * Cliente TypeScript para Asaas API v3 (cobranças PIX dinâmicas).
 * @see https://docs.asaas.com/docs/pix
 * @see https://docs.asaas.com/reference/get-qr-code-for-pix-payments
 */

import QRCode from "qrcode";
import { getPixQrImgSrc } from "./pix-qr";

const ASAAS_PROD_BASE = "https://api.asaas.com";
const ASAAS_SANDBOX_BASE = "https://api-sandbox.asaas.com";

export function asaasBaseUrl(sandbox: boolean): string {
  return sandbox ? ASAAS_SANDBOX_BASE : ASAAS_PROD_BASE;
}

function asaasHeaders(accessToken: string): HeadersInit {
  return {
    access_token: accessToken.trim(),
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "EcommerceStore/1.0",
  };
}

function formatAsaasError(data: Record<string, unknown>, fallback: string): string {
  const errors = data.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0] as { description?: string; code?: string };
    const d = first.description || first.code;
    if (d) return String(d);
  }
  return fallback;
}

function dueDateSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

async function parseJsonSafely(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export interface AsaasCreateResult {
  transactionId: string;
  qrCodeBase64: string;
  qrImageSrc: string;
  copyPaste: string;
}

export interface AsaasStatusResult {
  status: string;
  paid: boolean;
  amountInCents: number;
}

/** Lista clientes — GET sem body (requisito Asaas). */
async function findCustomerIdByDocument(
  baseUrl: string,
  accessToken: string,
  cpfCnpjDigits: string
): Promise<string | null> {
  const q = new URLSearchParams({ cpfCnpj: cpfCnpjDigits, limit: "2", offset: "0" });
  const res = await fetch(`${baseUrl}/v3/customers?${q}`, {
    method: "GET",
    headers: asaasHeaders(accessToken),
  });
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new Error(formatAsaasError(data, `Asaas listar cliente: HTTP ${res.status}`));
  }
  const list = data.data as unknown[];
  if (!Array.isArray(list) || list.length === 0) return null;
  const id = String((list[0] as { id?: string }).id ?? "").trim();
  return id || null;
}

async function createCustomer(params: {
  baseUrl: string;
  accessToken: string;
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone: string;
}): Promise<string> {
  const body = {
    name: params.name,
    cpfCnpj: params.cpfCnpj,
    email: params.email || undefined,
    mobilePhone: params.mobilePhone.replace(/\D/g, "") || undefined,
    /** Evita disparo automático de e-mail/SMS em cada novo checkout pela API */
    notificationDisabled: true,
  };

  const res = await fetch(`${params.baseUrl}/v3/customers`, {
    method: "POST",
    headers: asaasHeaders(params.accessToken),
    body: JSON.stringify(body),
  });
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new Error(formatAsaasError(data, `Asaas criar cliente: HTTP ${res.status}`));
  }
  const id = String(data.id ?? "").trim();
  if (!id) throw new Error("Asaas: criação de cliente sem ID");
  return id;
}

/** Garante `customer id` da Asaas pelo CPF/CNPJ — evita duplicar cadastros. */
export async function ensureAsaasCustomerId(params: {
  accessToken: string;
  sandbox: boolean;
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone: string;
}): Promise<string> {
  const baseUrl = asaasBaseUrl(params.sandbox);
  const doc = params.cpfCnpj.replace(/\D/g, "");
  const existing = await findCustomerIdByDocument(baseUrl, params.accessToken, doc);
  if (existing) return existing;
  return createCustomer({
    baseUrl,
    accessToken: params.accessToken,
    name: params.name,
    email: params.email,
    cpfCnpj: doc,
    mobilePhone: params.mobilePhone,
  });
}

/**
 * Cobrança PIX + QR dinâmico (payload + imagem Base64 na resposta da Asaas).
 */
export async function createAsaasPixPayment(params: {
  accessToken: string;
  sandbox: boolean;
  valueBrl: number;
  /** Identificador do pagador já na Asaas */
  customerId: string;
  description: string;
  externalReference: string;
}): Promise<AsaasCreateResult> {
  const baseUrl = asaasBaseUrl(params.sandbox);

  const valueRounded = Math.round(params.valueBrl * 100) / 100;
  const paymentBody: Record<string, unknown> = {
    customer: params.customerId,
    billingType: "PIX",
    value: valueRounded,
    dueDate: dueDateSaoPaulo(),
    description: params.description.slice(0, 500),
    externalReference: params.externalReference.slice(0, 140),
  };

  const payRes = await fetch(`${baseUrl}/v3/payments`, {
    method: "POST",
    headers: asaasHeaders(params.accessToken),
    body: JSON.stringify(paymentBody),
  });
  const payData = await parseJsonSafely(payRes);
  if (!payRes.ok) {
    throw new Error(formatAsaasError(payData, `Asaas criar cobrança: HTTP ${payRes.status}`));
  }

  const paymentId = String(payData.id ?? "").trim();
  if (!paymentId) {
    throw new Error("Asaas: cobrança sem ID");
  }

  const qrRes = await fetch(`${baseUrl}/v3/payments/${encodeURIComponent(paymentId)}/pixQrCode`, {
    method: "GET",
    headers: asaasHeaders(params.accessToken),
  });
  const qrData = await parseJsonSafely(qrRes);
  if (!qrRes.ok) {
    throw new Error(formatAsaasError(qrData, `Asaas PIX QR Code: HTTP ${qrRes.status}`));
  }

  const copyPaste = String(qrData.payload ?? "").trim();
  let encoded = String(qrData.encodedImage ?? "").trim().replace(/^=+/, "");

  let qrImageSrc = "";
  if (encoded) {
    qrImageSrc = getPixQrImgSrc(encoded);
  }
  if (!qrImageSrc && copyPaste.length >= 20) {
    qrImageSrc = await QRCode.toDataURL(copyPaste, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000ff", light: "#ffffffff" },
    });
  }

  return {
    transactionId: paymentId,
    qrCodeBase64: encoded,
    qrImageSrc,
    copyPaste,
  };
}

/** Conveniência — um pedido/checkout: garante cliente e cria PIX. */
export async function createAsaasCheckoutPix(params: {
  accessToken: string;
  sandbox: boolean;
  amountInCents: number;
  description: string;
  externalReference: string;
  customer: { name: string; email: string; phone: string; document: string };
}): Promise<AsaasCreateResult> {
  const customerId = await ensureAsaasCustomerId({
    accessToken: params.accessToken,
    sandbox: params.sandbox,
    name: params.customer.name,
    email: params.customer.email,
    cpfCnpj: params.customer.document.replace(/\D/g, ""),
    mobilePhone: params.customer.phone,
  });

  const valueBrl = params.amountInCents / 100;
  return createAsaasPixPayment({
    accessToken: params.accessToken,
    sandbox: params.sandbox,
    valueBrl,
    customerId,
    description: params.description,
    externalReference: params.externalReference,
  });
}

/**
 * Status da cobrança — consideramos pago somente RECEIVED (liquidação aplicada pela Asaas).
 * @see cobrança Pix CONFIRMED em PF (análise) — não marcamos como pago até RECEIVED.
 */
export async function checkAsaasPaymentStatus(params: {
  accessToken: string;
  sandbox: boolean;
  transactionId: string;
}): Promise<AsaasStatusResult> {
  const baseUrl = asaasBaseUrl(params.sandbox);
  const id = encodeURIComponent(params.transactionId);
  const res = await fetch(`${baseUrl}/v3/payments/${id}`, {
    method: "GET",
    headers: asaasHeaders(params.accessToken),
  });
  const data = await parseJsonSafely(res);
  if (!res.ok) {
    throw new Error(formatAsaasError(data, `Asaas consultar cobrança: HTTP ${res.status}`));
  }

  const status = String(data.status ?? "PENDING").toUpperCase();
  const paid = status === "RECEIVED";

  const value = typeof data.value === "number" ? data.value : 0;
  const amountInCents = Math.round(value * 100);

  return { status: status.toLowerCase(), paid, amountInCents };
}
