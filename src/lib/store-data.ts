import fs from "fs";
import path from "path";
import { StoreData } from "./admin-types";
import { PRODUCTS, STORE_CONFIG } from "./products";

const DATA_FILE = path.join(process.cwd(), "data", "store-data.json");

function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function readStoreData(): StoreData {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) {
    // Bootstrap from products.ts defaults
    const defaults: StoreData = {
      storeName: STORE_CONFIG.name,
      storeTagline: STORE_CONFIG.tagline,
      storeLogo: STORE_CONFIG.logo,
      banners: [
        {
          id: "banner-1",
          title: "Nova Coleção Disponível",
          subtitle: "Os melhores produtos com entrega rápida. Pague com Pix.",
          image: "/banners/banner1.jpg",
          active: true,
          link: "/",
          createdAt: new Date().toISOString(),
        },
      ],
      products: PRODUCTS.map((p) => ({
        ...p,
        active: true,
        createdAt: new Date().toISOString(),
      })),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as StoreData;
}

export function writeStoreData(data: StoreData): void {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
