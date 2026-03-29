import { NextRequest, NextResponse } from "next/server";
import { readStoreData } from "@/lib/store-data";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tenant = getTenantFromRequest(req);
  const store = readStoreData(tenant);
  return NextResponse.json({
    showHero:         store.showHero ?? true,
    storeName:        store.storeName,
    tagline:          store.storeTagline,
    cardStyle:        store.cardStyle     ?? "default",
    topBannerDesktop: store.topBannerDesktop ?? null,
    topBannerMobile:  store.topBannerMobile  ?? null,
  });
}
