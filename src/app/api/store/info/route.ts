import { NextRequest, NextResponse } from "next/server";
import { readStoreData } from "@/lib/store-data";
import { getTenantFromRequest } from "@/lib/tenant";
import { STORE_JSON_CACHE_CONTROL } from "@/lib/http-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tenant = getTenantFromRequest(req);
  const store = readStoreData(tenant);
  return NextResponse.json(
    {
      showHero:         store.showHero ?? true,
      heroPosition:     store.heroPosition ?? "after-banner",
      heroAlign:        store.heroAlign ?? "center",
      heroTag:          store.heroTag,
      heroTitle:        store.heroTitle,
      heroSubtitle:     store.heroSubtitle,
      storeName:        store.storeName,
      tagline:          store.storeTagline,
      cardStyle:        store.cardStyle     ?? "default",
      topBannerDesktop: store.topBannerDesktop ?? null,
      topBannerMobile:  store.topBannerMobile  ?? null,
    },
    { headers: { "Cache-Control": STORE_JSON_CACHE_CONTROL } }
  );
}
