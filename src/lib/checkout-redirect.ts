/**
 * Monta a URL do checkout externo (PHP PIX) com o carrinho em ?cart=BASE64
 */
export type CheckoutCartLine = {
  id: string;
  name: string;
  qty: number;
  price: number;
  oldPrice?: number;
  image?: string;
};

export function encodeCartQueryParam(lines: CheckoutCartLine[]): string {
  const json = JSON.stringify(lines);
  return btoa(unescape(encodeURIComponent(json)));
}

export function buildExternalCheckoutUrl(checkoutBaseUrl: string, lines: CheckoutCartLine[]): string {
  const base = checkoutBaseUrl.trim().replace(/\/$/, "");
  const cart = encodeCartQueryParam(lines);
  // encodeURIComponent é obrigatório: btoa() produz '+', '/' e '='
  // que não são URL-safe — PHP interpreta '+' como espaço em $_GET.
  return `${base}?cart=${encodeURIComponent(cart)}`;
}
