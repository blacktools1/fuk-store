import type { Orderbump, ShippingOption } from "@/lib/admin-types";

export type PaymentMethodCheckout = "pix" | "other";

export interface CheckoutTotalsInput {
  cartItems: { price: number; qty: number }[];
  selectedOrderbumpIds: string[];
  orderbumps: Orderbump[];
  selectedShippingId: string | null;
  shippingOptions: ShippingOption[];
  paymentMethod: PaymentMethodCheckout;
  pixDiscountEnabled: boolean;
  pixDiscountPct: number;
  freeShippingMin: number;
}

/**
 * Cálculo único (cliente + servidor) do valor do pedido:
 * - Desconto PIX só sobre subtotal dos produtos do carrinho
 * - Frete grátis: opção marcada como freeShippingEligible fica R$ 0 quando (soma produtos + order bumps) ≥ freeShippingMin
 */
export function computeCheckoutTotals(input: CheckoutTotalsInput) {
  const {
    cartItems,
    selectedOrderbumpIds,
    orderbumps,
    selectedShippingId,
    shippingOptions,
    paymentMethod,
    pixDiscountEnabled,
    pixDiscountPct,
    freeShippingMin,
  } = input;

  const cartSum = cartItems.reduce((s, i) => s + i.price * (i.qty || 1), 0);

  const activeBumps = orderbumps.filter(
    (ob) => ob.active !== false && selectedOrderbumpIds.includes(ob.id)
  );
  const bumpSum = activeBumps.reduce((s, ob) => s + ob.price, 0);

  /** Usado só para liberação de frete grátis (antes do desconto PIX) */
  const merchandiseForFreeShipping = cartSum + bumpSum;

  let cartAfterPix = cartSum;
  let pixDiscountAmount = 0;
  if (paymentMethod === "pix" && pixDiscountEnabled && pixDiscountPct > 0) {
    const pct = Math.min(99, Math.max(0, pixDiscountPct));
    cartAfterPix = cartSum * (1 - pct / 100);
    pixDiscountAmount = cartSum - cartAfterPix;
  }

  const shipOpt = shippingOptions.find(
    (s) => s.active !== false && s.id === selectedShippingId
  );
  let shippingPrice = shipOpt ? shipOpt.price : 0;
  if (
    shipOpt?.freeShippingEligible &&
    merchandiseForFreeShipping >= freeShippingMin
  ) {
    shippingPrice = 0;
  }

  const total = cartAfterPix + bumpSum + shippingPrice;

  const qualifiesFreeShipping = merchandiseForFreeShipping >= freeShippingMin;

  return {
    cartSum,
    bumpSum,
    cartAfterPix,
    pixDiscountAmount,
    merchandiseForFreeShipping,
    qualifiesFreeShipping,
    shippingPrice,
    shippingLabel: shipOpt?.name ?? "Frete",
    total,
    activeBumps,
  };
}
