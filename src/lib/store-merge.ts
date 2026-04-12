import type { CheckoutConfig, StoreData } from "@/lib/admin-types";

/**
 * Aplica PATCH ao StoreData sem apagar `checkoutConfig` inteiro.
 * Qualquer salvamento parcial (ex.: só order bumps) funde com o que já está no disco.
 */
export function mergeStorePatch(current: StoreData, patch: Partial<StoreData>): StoreData {
  const { checkoutConfig: ccPatch, ...rest } = patch;
  const out: StoreData = { ...current, ...rest };
  if (ccPatch !== undefined) {
    out.checkoutConfig = {
      ...(current.checkoutConfig ?? {}),
      ...ccPatch,
    } as CheckoutConfig;
  }
  return out;
}
