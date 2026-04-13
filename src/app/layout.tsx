import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { CartProvider } from "@/context/CartContext";
import { UserProvider } from "@/context/UserContext";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import ToastProvider from "@/components/ToastProvider";
import StoreShell from "@/components/StoreShell";
import MarqueeBanner from "@/components/MarqueeBanner";
import Footer from "@/components/Footer";
import PixelScripts from "@/components/PixelScripts";
import UTMCapture from "@/components/UTMCapture";
import { readStoreData } from "@/lib/store-data";
import { getTenant } from "@/lib/tenant";

export const dynamic = 'force-dynamic';

// Supported Google Fonts — name → URL family parameter
const GOOGLE_FONT_MAP: Record<string, string> = {
  "Inter":            "Inter:wght@300;400;500;600;700;800",
  "Roboto":           "Roboto:wght@300;400;500;600;700;800",
  "Poppins":          "Poppins:wght@300;400;500;600;700;800",
  "Montserrat":       "Montserrat:wght@300;400;500;600;700;800",
  "Raleway":          "Raleway:wght@300;400;500;600;700;800",
  "Nunito":           "Nunito:wght@300;400;500;600;700;800",
  "Lato":             "Lato:wght@300;400;700",
  "Oswald":           "Oswald:wght@300;400;500;600;700",
  "Playfair Display": "Playfair+Display:wght@400;500;600;700;800",
  "DM Sans":          "DM+Sans:wght@300;400;500;600;700",
};

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  const store = readStoreData(tenant);
  return {
    title: `${store.storeName} — ${store.storeTagline}`,
    description: store.storeTagline,
    keywords: "loja online, comprar online, pix",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();
  const store = readStoreData(tenant);

  // Convert hex to rgb for CSS variables
  let primaryRgb = "139, 92, 246";
  const hex = store.primaryColor?.replace("#", "");
  if (hex && hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    primaryRgb = `${r}, ${g}, ${b}`;
  }

  const secondaryStr = store.secondaryColor || "#ec4899";
  const textValue    = store.titleColor     || "#f0f0f8";
  const fontFamily   = store.fontFamily     || "Inter";
  const fontWeight   = store.fontWeight     || 400;

  // Build Google Fonts URL
  const fontParam = GOOGLE_FONT_MAP[fontFamily] ?? GOOGLE_FONT_MAP["Inter"];
  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`;

  const marqueeAbove = store.marqueePosition === "above-nav";

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={googleFontsUrl} />
      </head>
      <body
        suppressHydrationWarning
        style={{
        '--font-body':        `'${fontFamily}'`,
        '--font-weight-base': fontWeight,
        '--accent':           store.primaryColor || "#8b5cf6",
        '--accent-rgb':       primaryRgb,
        '--accent-dim':       `rgba(${primaryRgb}, 0.15)`,
        '--accent-glow':      `rgba(${primaryRgb}, 0.4)`,
        '--accent-bright':    store.primaryColor || "#a78bfa",
        '--bg':               store.tertiaryColor || "#0a0a0f",
        '--bg-card':          store.tertiaryColor ? `color-mix(in srgb, ${store.tertiaryColor} 95%, ${textValue})` : "#12121a",
        '--bg-elevated':      store.tertiaryColor ? `color-mix(in srgb, ${store.tertiaryColor} 90%, ${textValue})` : "#1a1a26",
        '--header-bg':        store.headerColor  || "rgba(10, 10, 15, 0.85)",
        '--text':             textValue,
        '--text-muted':       store.textColor    || "#8888a8",
        '--price-color':      store.priceColor   || "#f0f0f8",
        '--btn-text':         store.btnTextColor || "#ffffff",
        '--border':           `color-mix(in srgb, ${textValue} 12%, transparent)`,
        '--border-hover':     `rgba(${primaryRgb}, 0.5)`,
        '--radius':           store.borderRadius || "14px",
        '--radius-lg':        store.borderRadius ? `calc(${store.borderRadius} * 1.5)` : "20px",
        '--radius-xl':        store.borderRadius ? `calc(${store.borderRadius} * 2)`   : "28px",
        '--radius-sm':        store.borderRadius ? `calc(${store.borderRadius} * 0.6)` : "8px",
        '--card-radius':      store.cardRadius   || store.borderRadius || "14px",
        '--success':          secondaryStr,
        '--gradient':         `linear-gradient(135deg, ${store.primaryColor || "#a78bfa"}, ${secondaryStr})`,
        '--product-title-align': store.productTitleAlign === "center" ? "center" : "left",
      } as React.CSSProperties}>
        <Script
          src="https://cdn.utmify.com.br/scripts/utms/latest.js"
          data-utmify-prevent-xcod-sck=""
          data-utmify-prevent-subids=""
          strategy="afterInteractive"
        />
        <PixelScripts
          pixels={(store.pixels ?? []).map(({ accessToken: _omit, ...safe }) => safe)}
        />
        <UTMCapture />
        <UserProvider>
          <CartProvider>
            <ToastProvider>
              <StoreShell
                header={<Header />}
                marquee={<MarqueeBanner />}
                marqueeAbove={marqueeAbove}
                footer={<Footer store={store} />}
              >
                {children}
              </StoreShell>
              <CartDrawer />
            </ToastProvider>
          </CartProvider>
        </UserProvider>
      </body>
    </html>
  );
}
