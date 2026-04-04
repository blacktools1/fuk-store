/** Cliente TypeScript para a Paradise Pags API */

import QRCode from "qrcode";
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

/** Raízes comuns onde a API pode aninhar o payload */
function collectRoots(data: Record<string, unknown>): Record<string, unknown>[] {
  const roots: Record<string, unknown>[] = [data];
  for (const key of ["data", "result", "response", "transaction", "payment", "pix", "body"]) {
    const v = data[key];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      roots.push(v as Record<string, unknown>);
    }
  }
  return roots;
}

function extractQrFromSingleObject(data: Record<string, unknown>): string {
  const q = data.qrcode;
  if (typeof q === "string" && q.trim()) return q.trim();
  if (q && typeof q === "object") {
    const o = q as Record<string, unknown>;
    for (const key of ["image", "base64", "qr_code_base64", "qrcode", "img", "png", "data"]) {
      const img = o[key];
      if (typeof img === "string" && img.trim()) return img.trim();
    }
  }
  for (const k of [
    "qr_code_base64",
    "qrCodeBase64",
    "qr_code_image",
    "qrcode_base64",
    "pix_qrcode_base64",
    "qrcode_image",
    "qr_image",
    "qrcodeUrl",
    "qr_code_url",
  ] as const) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const pix = data.pix;
  if (pix && typeof pix === "object") {
    const p = pix as Record<string, unknown>;
    const nested = p.qrcode ?? p.qr_code_base64 ?? p.image;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
    if (nested && typeof nested === "object") {
      const o = nested as Record<string, unknown>;
      for (const key of ["image", "base64"]) {
        const img = o[key];
        if (typeof img === "string" && img.trim()) return img.trim();
      }
    }
  }
  return "";
}

/** Último recurso: percorre o JSON e acha string que pareça imagem/base64 de QR */
function findQrLikeStringInJson(obj: unknown, depth = 0): string {
  if (depth > 10) return "";
  if (typeof obj === "string") {
    const s = obj.trim();
    if (s.startsWith("data:image/")) return s;
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    const clean = s.replace(/\s/g, "");
    if (clean.length < 80) return "";
    if (/^[A-Za-z0-9+/]+=*$/.test(clean.slice(0, Math.min(600, clean.length)))) {
      if (clean.startsWith("iVBOR") || clean.startsWith("/9j/") || clean.startsWith("R0lGOD")) {
        return clean;
      }
    }
    return "";
  }
  if (obj && typeof obj === "object") {
    const entries = Array.isArray(obj) ? obj : Object.values(obj);
    for (const v of entries) {
      const f = findQrLikeStringInJson(v, depth + 1);
      if (f) return f;
    }
  }
  return "";
}

/** Extrai string do QR a partir da resposta JSON da Paradise (vários formatos possíveis). */
function extractQrFromParadiseResponse(data: Record<string, unknown>): string {
  for (const root of collectRoots(data)) {
    const found = extractQrFromSingleObject(root);
    if (found) return found;
  }
  return findQrLikeStringInJson(data);
}

function extractCopyPasteFromParadiseResponse(data: Record<string, unknown>): string {
  for (const root of collectRoots(data)) {
    const q = root.qrcode;
    if (q && typeof q === "object") {
      const cp = (q as { copy_paste?: string }).copy_paste;
      if (typeof cp === "string" && cp.trim()) return cp.trim();
    }
    for (const k of ["qr_code", "copy_paste", "pix_copy_paste", "emv", "brCode", "payload"] as const) {
      const v = root[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    const pix = root.pix;
    if (pix && typeof pix === "object") {
      const p = pix as Record<string, unknown>;
      const cp = p.copy_paste ?? p.qr_code ?? p.emv;
      if (typeof cp === "string" && cp.trim()) return cp.trim();
    }
  }
  return "";
}

/** Gera data URL PNG do QR a partir do payload EMV PIX (mesmo valor do copia-e-cola). */
async function qrDataUrlFromPixPayload(emv: string): Promise<string> {
  return QRCode.toDataURL(emv, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}

function compactUtms(utms: Record<string, string> | undefined): Record<string, string> {
  if (!utms) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(utms)) {
    if (v != null && String(v).trim() !== "") out[k] = String(v).trim();
  }
  return out;
}

/** Anexa UTMs à descrição (sempre aceito) e envia metadata quando a API suportar */
function buildDescriptionWithUtms(description: string, utms: Record<string, string>): string {
  const keys = Object.keys(utms);
  if (keys.length === 0) return description;
  const compact = keys
    .map((k) => `${k}=${encodeURIComponent(utms[k])}`)
    .join("&")
    .slice(0, 140);
  const combined = `${description} |UTM| ${compact}`;
  return combined.slice(0, 255);
}

export async function createParadisePayment(params: {
  apiKey: string;
  amountInCents: number;
  description: string;
  reference: string;
  webhookUrl: string;
  customer: ParadiseCustomer;
  /** UTMs da campanha — vão na transação (metadata + sufixo na descrição) */
  utmMetadata?: Record<string, string>;
}): Promise<CreatePaymentResult> {
  const utms = compactUtms(params.utmMetadata);
  const description = buildDescriptionWithUtms(params.description, utms);

  const body: Record<string, unknown> = {
    amount: params.amountInCents,
    description,
    reference: params.reference,
    postback_url: params.webhookUrl,
    source: "api_externa",
    customer: {
      name: params.customer.name,
      email: params.customer.email,
      phone: params.customer.phone,
      document: params.customer.document,
    },
  };

  if (Object.keys(utms).length > 0) {
    body.metadata = { ...utms, source: "store_checkout" };
  }

  let res = await fetch(`${PARADISE_BASE}/transaction.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": params.apiKey,
    },
    body: JSON.stringify(body),
  });

  let data = await res.json();

  // Se a API não aceitar `metadata`, tenta de novo só com descrição (UTMs já vão no texto)
  if ((!res.ok || data.status === false) && body.metadata) {
    const { metadata: _m, ...bodyRetry } = body;
    res = await fetch(`${PARADISE_BASE}/transaction.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": params.apiKey,
      },
      body: JSON.stringify(bodyRetry),
    });
    data = await res.json();
  }

  if (!res.ok || data.status === false) {
    throw new Error(data.message || "Erro ao criar transação Paradise");
  }
  if (!data.id) {
    throw new Error("Paradise: resposta sem ID. " + JSON.stringify(data));
  }

  const d = data as Record<string, unknown>;
  const qrRaw = extractQrFromParadiseResponse(d);
  const copyPaste = extractCopyPasteFromParadiseResponse(d);

  let qrImageSrc = getPixQrImgSrc(qrRaw);

  // Muitas integrações só devolvem o EMV (copia-e-cola), sem bitmap — o QR é o encode desse payload
  if (!qrImageSrc && copyPaste.trim().length >= 20) {
    try {
      qrImageSrc = await qrDataUrlFromPixPayload(copyPaste.trim());
    } catch (e) {
      console.error("[paradise] Falha ao gerar QR a partir do payload PIX:", e);
    }
  }

  return {
    transactionId: String(data.id),
    qrCodeBase64: qrRaw,
    qrImageSrc,
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
