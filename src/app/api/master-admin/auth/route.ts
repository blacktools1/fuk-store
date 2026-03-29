import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

export const MASTER_SECRET = new TextEncoder().encode(
  process.env.MASTER_JWT_SECRET || "master-secret-change-this-in-production"
);

const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "Master@2024!";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (password !== MASTER_PASSWORD) {
      await new Promise((r) => setTimeout(r, 1000));
      return NextResponse.json({ message: "Senha incorreta" }, { status: 401 });
    }

    const token = await new SignJWT({ role: "master" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(MASTER_SECRET);

    const res = NextResponse.json({ message: "OK" });
    res.cookies.set("master_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 12,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ message: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ message: "Logout efetuado" });
  res.cookies.delete("master_token");
  return res;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("master_token")?.value;
  if (!token) return NextResponse.json({ auth: false }, { status: 401 });
  try {
    await jwtVerify(token, MASTER_SECRET);
    return NextResponse.json({ auth: true });
  } catch {
    return NextResponse.json({ auth: false }, { status: 401 });
  }
}

export { jwtVerify, MASTER_SECRET as secret };
