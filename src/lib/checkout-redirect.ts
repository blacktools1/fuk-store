/**
 * Monta a URL do checkout externo (PHP PIX) com o carrinho em ?cart=BASE64
 */
export type CheckoutCartLine = {
  id: string;
  name: string;
  qty: number;
  price: number;
  oldPrice?: number;
};

export function encodeCartQueryParam(lines: CheckoutCartLine[]): string {
  const json = JSON.stringify(lines);
  return btoa(unescape(encodeURIComponent(json)));
}

export function buildExternalCheckoutUrl(checkoutBaseUrl: string, lines: CheckoutCartLine[]): string {
  const base = checkoutBaseUrl.trim().replace(/\/$/, "");
  const cart = encodeCartQueryParam(lines);
  return `${base}?cart=${cart}`;
}
