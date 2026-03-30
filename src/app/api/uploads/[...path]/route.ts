import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await params;

  // Security: prevent path traversal
  const safe = parts.map((p) => p.replace(/\.\./g, "")).filter(Boolean);
  const filePath = path.join(process.cwd(), "public", "uploads", ...safe);

  if (!existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const bytes = await readFile(filePath);
    const ext = safe[safe.length - 1]?.split(".").pop()?.toLowerCase() ?? "";
    const contentType = MIME[ext] ?? "application/octet-stream";

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Error reading file", { status: 500 });
  }
}
