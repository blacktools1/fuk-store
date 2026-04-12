import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Diretório deste projeto (pasta que contém next.config.ts). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** Domínios externos para fotos de produto (CDN). Separe por vírgula. Ex.: cdn.shopify.com,images.ctfassets.net */
const extraImageHosts = (process.env.NEXT_IMAGE_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  images: {
    // Otimização ligada: AVIF/WebP, redimensionamento, cache em /_next/image (requer `sharp` em produção).
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    qualities: [75, 80, 85, 90, 92, 95],
    remotePatterns: [
      ...extraImageHosts.map((hostname) => ({
        protocol: "https" as const,
        hostname,
        pathname: "/**" as const,
      })),
    ],
  },
  /**
   * Com outro package-lock.json em um diretório pai (ex.: home do usuário),
   * o Turbopack pode inferir a raiz errada e quebrar o dev server (tela branca,
   * assets/HMR incorretos). Fixa a raiz no projeto da loja.
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack
   */
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
