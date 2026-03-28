import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { readStoreData, writeStoreData } from "@/lib/store-data";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ||
    "minha-loja-admin-secret-key-change-this-in-production-2024"
);

async function verifyAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) throw new Error("Unauthorized");
  await jwtVerify(token, JWT_SECRET);
}

// GET — return full store data
export async function GET(req: NextRequest) {
  try {
    await verifyAdmin(req);
    const data = readStoreData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
}

// PATCH — partial update (products, banners, settings)
export async function PATCH(req: NextRequest) {
  try {
    await verifyAdmin(req);
    const body = await req.json();
    const current = readStoreData();
    const updated = { ...current, ...body };
    writeStoreData(updated);
    return NextResponse.json({ message: "Salvo com sucesso" });
  } catch (err) {
    if ((err as Error).message === "Unauthorized") {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ message: "Erro ao salvar" }, { status: 500 });
  }
}
