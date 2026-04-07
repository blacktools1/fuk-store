"use client";

/**
 * UTMCapture — captura UTMs e parâmetros de rastreio da URL no momento em que o
 * usuário chega na loja e os persiste no localStorage sob a chave "store_utms".
 *
 * Por que é necessário:
 * - O roteador do Next.js não preserva query params entre navegações de página.
 * - O checkout PHP está em outro domínio, portanto não tem acesso ao localStorage
 *   da loja; as UTMs precisam ser passadas explicitamente via URL ao redirecionar.
 */

import { useEffect } from "react";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "src",
  "sck",
  "fbclid",  // Facebook Click ID — necessário para matching de conversões
  "ttclid",  // TikTok Click ID — necessário para matching de conversões
];

export default function UTMCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);

      // Ler UTMs já salvas (de visita anterior na mesma sessão)
      let stored: Record<string, string> = {};
      try {
        stored = JSON.parse(localStorage.getItem("store_utms") || "{}");
      } catch (_) {}

      const merged: Record<string, string> = { ...stored };
      let hasNew = false;

      UTM_KEYS.forEach((key) => {
        // URL atual tem prioridade (campanha mais recente)
        const urlVal = params.get(key);
        if (urlVal) {
          merged[key] = urlVal;
          hasNew = true;
        }
      });

      if (hasNew || Object.keys(merged).length > 0) {
        localStorage.setItem("store_utms", JSON.stringify(merged));
      }
    } catch (_) {
      // localStorage indisponível — silêncio
    }
  }, []); // roda apenas na montagem (chegada do usuário)

  return null;
}
