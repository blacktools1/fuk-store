import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ||
    "minha-loja-admin-secret-key-change-this-in-production-2024"
);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@2024!";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      // Delay on wrong credentials to prevent brute-force
      await new Promise((r) => setTimeout(r, 1000));
      return NextResponse.json(
        { message: "Usuário ou senha incorretos" },
        { status: 401 }
      );
    }

    const token = await new SignJWT({ username, role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(JWT_SECRET);

    const response = NextResponse.json({ message: "OK" });
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ message: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ message: "Logout efetuado" });
  response.cookies.delete("admin_token");
  return response;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return NextResponse.json({ auth: false }, { status: 401 });

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.json({ auth: true });
  } catch {
    return NextResponse.json({ auth: false }, { status: 401 });
  }
}

export { JWT_SECRET };
