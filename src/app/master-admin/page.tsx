import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const MASTER_SECRET = new TextEncoder().encode(
  process.env.MASTER_JWT_SECRET || "master-secret-change-this-in-production"
);

export default async function MasterAdminRoot() {
  const jar = await cookies();
  const token = jar.get("master_token")?.value;

  if (token) {
    try {
      await jwtVerify(token, MASTER_SECRET);
      redirect("/master-admin/dashboard");
    } catch {}
  }

  redirect("/master-admin/login");
}
