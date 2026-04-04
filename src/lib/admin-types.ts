// Default store data used by admin panel — stored in data/store-data.json at runtime
export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  active: boolean;
  link?: string;
  createdAt: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  price: number;
  oldPrice?: number;
  image: string;
  images?: string[];
  category: string;
  badge?: string;
  stock: number;
  active: boolean;
  variations?: string[];
  salesCount?: number;
  paymentMethods?: string[];
  createdAt: string;
}

export interface TopBannerConfig {
  image?: string;
  link?: string;
  orientation?: "horizontal" | "vertical" | "square";
  padding?: number;      // 0–48px
  borderRadius?: number; // 0=reto, 8=pequeno, 16=médio, 24=grande
  hideOnDesktop?: boolean;
}

export interface Orderbump {
  id: string;
  active: boolean;
  title: string;
  description: string;
  price: number;
  offerHash: string;
  imageUrl?: string;
}

export interface CheckoutConfig {
  paradiseApiKey?: string;
  redirectUrl?: string;
  redirectEnabled?: boolean;
  backLink?: string;
  utmifyToken?: string;
  utmifyIsTest?: boolean;
  orderbumps?: Orderbump[];
  checkoutTheme?: "theme1" | "theme2" | "theme3";
}

export interface StorePixel {
  id: string;
  type: "facebook" | "tiktok";
  pixelId: string;
  /** Token da API de Conversões (CAPI) — só Meta; não é enviado ao navegador; uso futuro em eventos server-side */
  accessToken?: string;
  active: boolean;
}

export interface StoreData {
  storeName: string;
  storeTagline: string;
  storeLogo: string;
  logoUrl?: string;
  logoDisplay?: "image-text" | "image-only" | "text-only";
  logoSize?: number;
  logoPosition?: "left" | "center" | "right";
  fontFamily?: string;
  fontWeight?: number;
  cardStyle?: "default" | "minimal" | "clean" | "bold" | "neon" | "cinematic";
  marqueeTexts?: string[];
  marqueePosition?: "above-nav" | "below-nav";
  topBannerDesktop?: TopBannerConfig;
  topBannerMobile?: TopBannerConfig;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  headerColor?: string;
  titleColor?: string;
  textColor?: string;
  priceColor?: string;
  btnTextColor?: string;
  borderRadius?: string;
  cardRadius?: string;
  pixDiscountEnabled?: boolean;
  pixDiscount?: number;
  freeShippingMin?: number;
  checkoutUrl?: string;
  checkoutConfig?: CheckoutConfig;
  showHero?: boolean;
  stickyHeader?: boolean;
  banners: Banner[];
  products: AdminProduct[];
  pixels?: StorePixel[];
}
