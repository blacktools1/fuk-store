import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Painel Master — Gerenciador de Lojas",
  description: "Gerencie todas as lojas da plataforma",
};

export default function MasterAdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="master-body">{children}</div>;
}
