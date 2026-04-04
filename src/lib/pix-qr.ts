/**
 * Monta o valor de `src` para <img> do QR Code PIX.
 *
 * A API pode devolver:
 * - URL https do QR
 * - Data URL completo (`data:image/png;base64,...`)
 * - Apenas o base64 (com ou sem quebras de linha)
 *
 * Evita duplicar o prefixo `data:image/png;base64,` quando a API já envia data URL.
 */
/** Payload EMV do PIX (copia-e-cola) — não é imagem; não usar como base64. */
function looksLikePixEmvPayload(s: string): boolean {
  const t = s.replace(/\s/g, "");
  return t.length >= 40 && t.startsWith("000201");
}

export function getPixQrImgSrc(raw: string | undefined | null): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";

  // Se a API colocou o EMV no campo do QR, não montar data URL falsa
  if (looksLikePixEmvPayload(s)) return "";

  if (s.startsWith("http://") || s.startsWith("https://")) {
    return s;
  }

  if (s.startsWith("data:image/")) {
    const comma = s.indexOf(",");
    if (comma === -1) return s.replace(/\s/g, "");
    const prefix = s.slice(0, comma + 1);
    const b64 = s.slice(comma + 1).replace(/\s/g, "");
    return prefix + b64;
  }

  const clean = s.replace(/\s/g, "");
  if (!clean) return "";

  const mime = clean.startsWith("iVBOR")
    ? "image/png"
    : clean.startsWith("/9j/")
      ? "image/jpeg"
      : "image/png";

  return `data:${mime};base64,${clean}`;
}
