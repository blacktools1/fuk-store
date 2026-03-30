import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getTenantFromRequest, sanitizeTenant } from "@/lib/tenant";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ||
    "minha-loja-admin-secret-key-change-this-in-production-2024"
);

async function verifyAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) throw new Error("Unauthorized");
  await jwtVerify(token, JWT_SECRET);
}

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    await verifyAdmin(req);
  } catch {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const tenant = getTenantFromRequest(req);
    // Replace dots with underscores for URL-safe directory names
    const safeTenant = sanitizeTenant(tenant).replace(/\./g, "_");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "Nenhum arquivo enviado" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ message: "Tipo de arquivo não permitido. Use JPG, PNG, WebP, GIF ou SVG." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ message: "Arquivo muito grande. Máximo 5 MB." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `${Date.now()}.${ext}`;
    // Store uploads isolated per tenant: public/uploads/{tenant}/filename
    const uploadsDir = path.join(process.cwd(), "public", "uploads", safeTenant);

    await mkdir(uploadsDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    await writeFile(path.join(uploadsDir, filename), Buffer.from(bytes));

    return NextResponse.json({ url: `/uploads/${safeTenant}/${filename}` });
  } catch {
    return NextResponse.json({ message: "Erro ao fazer upload" }, { status: 500 });
  }
}
