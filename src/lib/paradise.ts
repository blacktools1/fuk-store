/** Cliente TypeScript para a Paradise Pags API */

import { getPixQrImgSrc } from "./pix-qr";

const PARADISE_BASE = "https://multi.paradisepags.com/api/v1";

export interface ParadiseCustomer {
  name: string;
  email: string;
  phone: string;
  document: string;
}

export interface CreatePaymentResult {
  transactionId: string;
  /** Valor bruto da API (data URL, base64 ou vazio) — útil para debug */
  qrCodeBase64: string;
  /** Pronto para `<img src={qrImageSrc} />` */
  qrImageSrc: string;
  copyPaste: string;
}

/** Extrai string do QR a partir da resposta JSON da Paradise (vários formatos possíveis). */
function extractQrFromParadiseResponse(data: Record<string, unknown>): string {
  const q = data.qrcode;
  if (typeof q === "string" && q.trim()) return q.trim();
  if (q && typeof q === "object") {
    const o = q as Record<string, unknown>;
    const img = o.image ?? o.base64 ?? o.qr_code_base64 ?? o.qrcode;
    if (typeof img === "string" && img.trim()) return img.trim();
  }
  for (const k of ["qr_code_base64", "qrCodeBase64", "qr_code_image", "qrcode_base64", "pix_qrcode_base64"] as const) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const pix = data.pix;
  if (pix && typeof pix === "object") {
    const p = pix as Record<string, unknown>;
    const nested = p.qrcode ?? p.qr_code_base64;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
    if (nested && typeof nested === "object") {
      const o = nested as Record<string, unknown>;
      const img = o.image ?? o.base64;
      if (typeof img === "string" && img.trim()) return img.trim();
    }
  }
  return "";
}

function extractCopyPasteFromParadiseResponse(data: Record<string, unknown>): string {
  const q = data.qrcode;
  if (q && typeof q === "object") {
    const cp = (q as { copy_paste?: string }).copy_paste;
    if (typeof cp === "string" && cp.trim()) return cp.trim();
  }
  for (const k of ["qr_code", "copy_paste", "pix_copy_paste", "emv"] as const) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const pix = data.pix;
  if (pix && typeof pix === "object") {
    const p = pix as Record<string, unknown>;
    const cp = p.copy_paste ?? p.qr_code ?? p.emv;
    if (typeof cp === "string" && cp.trim()) return cp.trim();
  }
  return "";
}

export async function createParadisePayment(params: {
  apiKey: string;
  amountInCents: number;
  description: string;
  reference: string;
  webhookUrl: string;
  customer: ParadiseCustomer;
}): Promise<CreatePaymentResult> {
  const res = await fetch(`${PARADISE_BASE}/transaction.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": params.apiKey,
    },
    body: JSON.stringify({
      amount: params.amountInCents,
      description: params.description,
      reference: params.reference,
      postback_url: params.webhookUrl,
      source: "api_externa",
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        phone: params.customer.phone,
        document: params.customer.document,
      },
    }),
  });

  const data = await res.json();

  if (!res.ok || data.status === false) {
    throw new Error(data.message || "Erro ao criar transação Paradise");
  }
  if (!data.id) {
    throw new Error("Paradise: resposta sem ID. " + JSON.stringify(data));
  }

  const d = data as Record<string, unknown>;
  const qrRaw = extractQrFromParadiseResponse(d);
  const copyPaste = extractCopyPasteFromParadiseResponse(d);

  return {
    transactionId: String(data.id),
    qrCodeBase64: qrRaw,
    qrImageSrc: getPixQrImgSrc(qrRaw),
    copyPaste,
  };
}

export interface ParadiseStatusResult {
  status: string;
  paid: boolean;
  amountInCents: number;
}

export async function checkParadiseStatus(params: {
  apiKey: string;
  transactionId: string;
}): Promise<ParadiseStatusResult> {
  const res = await fetch(
    `${PARADISE_BASE}/query.php?action=get_transaction&id=${encodeURIComponent(params.transactionId)}`,
    { headers: { "X-API-Key": params.apiKey } }
  );

  const data = await res.json();
  const status = String(data.status ?? "pending").toLowerCase();
  const paid = status === "paid" || status === "approved";

  return {
    status,
    paid,
    amountInCents: data.amount ?? 0,
  };
}
