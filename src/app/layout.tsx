import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import ToastProvider from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "Minha Loja — Produtos com entrega rápida",
  description:
    "Os melhores produtos com entrega rápida. Eletrônicos, moda, casa, esporte e muito mais. Pague com Pix.",
  keywords: "loja online, comprar online, pix, eletrônicos, moda",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>
          <ToastProvider>
            <Header />
            <main>{children}</main>
            <CartDrawer />
            <footer className="footer">
              <div className="container">
                <div className="footer-logo">🛍️ Minha Loja</div>
                <p className="footer-sub">
                  © {new Date().getFullYear()} Minha Loja. Pagamento 100% seguro via Pix.
                </p>
              </div>
            </footer>
          </ToastProvider>
        </CartProvider>
      </body>
    </html>
  );
}
