import { NextRequest, NextResponse } from "next/server";
import { readStoreData } from "@/lib/store-data";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = readStoreData();
  const product = data.products.find(p => p.id === id && p.active);
  
  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}
