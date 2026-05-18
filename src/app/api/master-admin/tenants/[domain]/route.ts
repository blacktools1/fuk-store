import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { deleteTenant } from "@/lib/store-data";

const MASTER_SECRET = new TextEncoder().encode(
  process.env.MASTER_JWT_SECRET || "master-secret-change-this-in-production"
);

async function verifyMaster(req: NextRequest) {
  const token = req.cookies.get("master_token")?.value;
  if (!token) throw new Error("Unauthorized");
  await jwtVerify(token, MASTER_SECRET);
}

/** DELETE /api/master-admin/tenants/[domain] — remove a tenant */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    await verifyMaster(req);
  } catch {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { domain } = await params;

  if (!domain) {
    return NextResponse.json({ message: "Domínio não informado" }, { status: 400 });
  }

  const deleted = deleteTenant(decodeURIComponent(domain));
  if (!deleted) {
    return NextResponse.json({ message: "Loja não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ message: "Loja removida com sucesso" });
}
