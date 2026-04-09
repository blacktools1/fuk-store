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

/**
 * Provedores de pagamento PIX disponíveis.
 * Adicionar novos valores aqui conforme cada integração for implementada.
 */
export type PixProvider = "paradise" | "orama";

/** Uma conta UTMify (dashboard) com label para identificação */
export interface UtmifyAccount {
  id: string;
  label: string;   // nome amigável ex: "Dashboard Principal"
  token: string;   // token real da API (nunca mascarado no servidor)
}

export interface CheckoutConfig {
  pixProvider?: PixProvider | string;   // provedor ativo (default: "paradise")
  paradiseApiKey?: string;              // chave da API Paradise Pags
  oramaApiKey?: string;                 // chave da API OramaPay (prefixo live_)
  oramaPublicKey?: string;              // public key da conta OramaPay
  /** Secret para validar assinatura HMAC dos webhooks Orama (header x-webhook-signature) */
  oramaWebhookSecret?: string;
  redirectUrl?: string;
  redirectEnabled?: boolean;
  backLink?: string;
  /** @deprecated use utmifyAccounts */
  utmifyToken?: string;
  utmifyAccounts?: UtmifyAccount[];     // múltiplos dashboards UTMify
  utmifyIsTest?: boolean;
  orderbumps?: Orderbump[];
  /** POST JSON quando o PIX é gerado (pedido aguardando pagamento) */
  salePendingWebhooks?: string[];
  /** POST JSON quando o pagamento é confirmado */
  saleApprovedWebhooks?: string[];
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
  /** Hero acima ou abaixo do banner de topo (página inicial) */
  heroPosition?: "before-banner" | "after-banner";
  /** Alinhamento do texto na seção Hero */
  heroAlign?: "left" | "center";
  heroTag?: string;
  /** Título — use quebras de linha para mais de uma linha */
  heroTitle?: string;
  heroSubtitle?: string;
  /** Alinhamento do título/descrição nos cards de produto na listagem */
  productTitleAlign?: "left" | "center";
  stickyHeader?: boolean;
  banners: Banner[];
  products: AdminProduct[];
  pixels?: StorePixel[];
}
