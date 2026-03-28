import type { Metadata } from "next";
import "../globals.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin — Minha Loja",
  description: "Painel administrativo",
  robots: "noindex, nofollow",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="admin-body">
        {children}
      </body>
    </html>
  );
}
