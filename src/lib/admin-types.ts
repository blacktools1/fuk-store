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

export interface StorePixel {
  id: string;
  type: "facebook" | "tiktok";
  pixelId: string;
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
  showHero?: boolean;
  stickyHeader?: boolean;
  banners: Banner[];
  products: AdminProduct[];
  pixels?: StorePixel[];
}
