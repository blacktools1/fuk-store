import { NextResponse } from "next/server";
import { readStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = readStoreData();
  // Return only non-sensitive public config
  return NextResponse.json({
    showHero: store.showHero ?? true,
    storeName: store.storeName,
    tagline: store.storeTagline
  });
}
