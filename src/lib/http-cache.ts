/**
 * Cache HTTP para respostas JSON públicas da loja.
 * - max-age=0: browser revalida sempre (preço/atualização recente)
 * - s-maxage + stale-while-revalidate: CDN/proxy pode servir stale brevemente enquanto revalida
 */
export const STORE_JSON_CACHE_CONTROL =
  "public, max-age=0, s-maxage=25, stale-while-revalidate=120";
