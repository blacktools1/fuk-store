import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "EcomFreedom — Plataforma de Lojas Online",
  description: "Crie e gerencie múltiplas lojas online com checkout PIX, pixels e rastreamento UTMify.",
};

/** Layout limpo para a landing page do master domain — sem navbar/footer da loja */
export default function MasterHomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
