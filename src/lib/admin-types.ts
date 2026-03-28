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
  image: string;
  images?: string[];
  category: string;
  badge?: string;
  stock: number;
  active: boolean;
  variations?: string[];
  createdAt: string;
}

export interface StoreData {
  storeName: string;
  storeTagline: string;
  storeLogo: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  borderRadius?: string;
  banners: Banner[];
  products: AdminProduct[];
}
