import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Diretório deste projeto (pasta que contém next.config.ts). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
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
