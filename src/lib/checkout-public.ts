import type { Orderbump, ShippingOption } from "@/lib/admin-types";

/** Inclui legado sem campo `active`; exclui só itens explicitamente inativos */
export function filterShippingForCheckout(options: ShippingOption[] | undefined): ShippingOption[] {
  return (options ?? []).filter((s) => s.active !== false);
}

export function filterOrderbumpsForCheckout(bumps: Orderbump[] | undefined): Orderbump[] {
  return (bumps ?? []).filter((ob) => ob.active !== false);
}
