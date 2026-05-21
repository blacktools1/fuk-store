import { NextRequest, NextResponse } from "next/server";
import { readStoreData } from "@/lib/store-data";
import { hasSkaleCredentials } from "@/lib/skalepay";
import { getTenantFromRequest } from "@/lib/tenant";
import { filterOrderbumpsForCheckout, filterShippingForCheckout } from "@/lib/checkout-public";
import { STORE_JSON_CACHE_CONTROL } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

/** Public store config — safe to expose to the storefront client */
export async function GET(req: NextRequest) {
  const tenant = getTenantFromRequest(req);
  const data = readStoreData(tenant);

  const ttPixelIds = (data.pixels ?? [])
    .filter((p) => p.active && p.type === "tiktok")
    .map((p) => p.pixelId)
    .filter(Boolean);

  // Checkout interno está ativo quando o provedor selecionado tem sua chave configurada
  const provider = (data.checkoutConfig?.pixProvider || "paradise").toLowerCase();
  const c = data.checkoutConfig;
  let hasInternalCheckout = false;
  if (provider === "paradise") {
    hasInternalCheckout = !!(c?.paradiseApiKey?.trim());
  } else if (provider === "orama") {
    hasInternalCheckout = !!(c?.oramaApiKey?.trim() && c?.oramaPublicKey?.trim());
  } else if (provider === "asaas") {
    hasInternalCheckout = !!(c?.asaasApiKey?.trim());
  } else if (provider === "skalepay") {
    hasInternalCheckout = hasSkaleCredentials({
      secretKey: c?.skalepaySecretKey,
      userId: c?.skalepayUserId,
      userToken: c?.skalepayUserToken,
      publicKey: c?.skalepayPublicKey,
    });
  }

  return NextResponse.json(
    {
      pixDiscountEnabled: data.pixDiscountEnabled ?? true,
      pixDiscount: data.pixDiscount ?? 5,
      freeShippingMin: data.freeShippingMin ?? 199,
      checkoutUrl: data.checkoutUrl ?? "",
      hasInternalCheckout,
      pixProvider: provider,
      ttPixelIds,
      /** Config de checkout pública */
      orderbumps: filterOrderbumpsForCheckout(c?.orderbumps),
      orderbumpStyle: c?.orderbumpStyle ?? "style1",
      shippingOptions: filterShippingForCheckout(c?.shippingOptions),
      redirectUrl: c?.redirectUrl ?? "",
      redirectEnabled: c?.redirectEnabled ?? true,
      backLink: c?.backLink ?? "",
      checkoutTopImage: c?.checkoutTopImage?.trim() ?? "",
      checkoutTopImageSquare: c?.checkoutTopImageSquare === true,
      checkoutMidImage: c?.checkoutMidImage?.trim() ?? "",
      checkoutMidImageSquare: c?.checkoutMidImageSquare === true,
      checkoutFooterImage: c?.checkoutFooterImage?.trim() ?? "",
      checkoutFooterImageSquare: c?.checkoutFooterImageSquare === true,
    },
    { headers: { "Cache-Control": STORE_JSON_CACHE_CONTROL } }
  );
}
