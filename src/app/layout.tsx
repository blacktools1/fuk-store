import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { UserProvider } from "@/context/UserContext";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import ToastProvider from "@/components/ToastProvider";
import { readStoreData } from "@/lib/store-data";

export async function generateMetadata(): Promise<Metadata> {
  const store = readStoreData();
  return {
    title: `${store.storeName} — ${store.storeTagline}`,
    description: store.storeTagline,
    keywords: "loja online, comprar online, pix",
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = readStoreData();

  // Convert hex color to rgb for CSS variable manipulation (e.g. 139, 92, 246)
  let primaryRgb = "139, 92, 246";
  const hex = store.primaryColor?.replace("#", "");
  if (hex && hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    primaryRgb = `${r}, ${g}, ${b}`;
  }

  return (
    <html lang="pt-BR">
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary: ${store.primaryColor || "#8b5cf6"};
              --primary-rgb: ${primaryRgb};
            }
          `
        }} />
      </head>
      <body>
        <UserProvider>
          <CartProvider>
            <ToastProvider>
              <Header storeName={store.storeName} storeLogo={store.storeLogo} />
              <main>{children}</main>
              <CartDrawer />
              <footer className="footer">
                <div className="container">
                  <div className="footer-logo">
                    {store.storeLogo ? (
                      <span dangerouslySetInnerHTML={{ __html: store.storeLogo }} style={{ marginRight: 8 }} />
                    ) : null}
                    {store.storeName}
                  </div>
                  <p className="footer-sub">
                    © {new Date().getFullYear()} {store.storeName}. Pagamento 100% seguro via Pix.
                  </p>
                </div>
              </footer>
            </ToastProvider>
          </CartProvider>
        </UserProvider>
      </body>
    </html>
  );
}
