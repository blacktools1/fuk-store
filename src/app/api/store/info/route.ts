import { NextResponse } from "next/server";
import { readStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = readStoreData();
  return NextResponse.json({
    showHero:         store.showHero ?? true,
    storeName:        store.storeName,
    tagline:          store.storeTagline,
    cardStyle:        store.cardStyle     ?? "default",
    topBannerDesktop: store.topBannerDesktop ?? null,
    topBannerMobile:  store.topBannerMobile  ?? null,
  });
}
