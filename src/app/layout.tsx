import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { UserProvider } from "@/context/UserContext";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import ToastProvider from "@/components/ToastProvider";
import { readStoreData } from "@/lib/store-data";

export const dynamic = 'force-dynamic';

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

  let secondaryStr = store.secondaryColor || "#ec4899";
  let textValue = store.titleColor || "#f0f0f8";
  
  return (
    <html lang="pt-BR">
      <body style={{
        '--accent': store.primaryColor || "#8b5cf6",
        '--accent-rgb': primaryRgb,
        '--accent-dim': `rgba(${primaryRgb}, 0.15)`,
        '--accent-glow': `rgba(${primaryRgb}, 0.4)`,
        '--accent-bright': store.primaryColor || "#a78bfa",
        '--bg': store.tertiaryColor || "#0a0a0f",
        '--bg-card': store.tertiaryColor ? `color-mix(in srgb, ${store.tertiaryColor} 95%, ${textValue})` : "#12121a",
        '--bg-elevated': store.tertiaryColor ? `color-mix(in srgb, ${store.tertiaryColor} 90%, ${textValue})` : "#1a1a26",
        '--header-bg': store.headerColor ? `${store.headerColor}E6` : "rgba(10, 10, 15, 0.85)",
        '--text': textValue,
        '--text-muted': store.textColor || "#8888a8",
        '--price-color': store.priceColor || "#f0f0f8",
        '--btn-text': store.btnTextColor || "#ffffff",
        '--border': `color-mix(in srgb, ${textValue} 12%, transparent)`,
        '--border-hover': `rgba(${primaryRgb}, 0.5)`,
        '--radius': store.borderRadius || "14px",
        '--radius-lg': store.borderRadius ? `calc(${store.borderRadius} * 1.5)` : "20px",
        '--radius-xl': store.borderRadius ? `calc(${store.borderRadius} * 2)` : "28px",
        '--radius-sm': store.borderRadius ? `calc(${store.borderRadius} * 0.6)` : "8px",
        '--success': secondaryStr, // We can tie secondary color to success or gradient
        '--gradient': `linear-gradient(135deg, ${store.primaryColor || "#a78bfa"}, ${secondaryStr})`
      } as React.CSSProperties}>
        <UserProvider>
          <CartProvider>
            <ToastProvider>
              <Header storeName={store.storeName} storeLogo={store.storeLogo} />
              <main>{children}</main>
              <CartDrawer />
              <footer className="footer">
                <div className="container">
                  <div className="footer-logo" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {store.logoUrl ? (
                      <Image src={store.logoUrl} alt={store.storeName} width={32} height={32} style={{ objectFit: "contain" }} />
                    ) : store.storeLogo ? (
                      <span dangerouslySetInnerHTML={{ __html: store.storeLogo }} />
                    ) : null}
                    <span>{store.storeName}</span>
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
