import fs from "fs";
import path from "path";
import { StoreData } from "./admin-types";
import { PRODUCTS, STORE_CONFIG } from "./products";
import { sanitizeTenant } from "./tenant";

// Root directory that holds all tenant data
const TENANTS_ROOT = path.join(process.cwd(), "data", "tenants");

/** Absolute path to a tenant's data directory */
export function tenantDir(tenant: string): string {
  return path.join(TENANTS_ROOT, sanitizeTenant(tenant));
}

/** Absolute path to a tenant's store-data.json */
function dataFile(tenant: string): string {
  return path.join(tenantDir(tenant), "store-data.json");
}

function ensureDir(tenant: string) {
  const dir = tenantDir(tenant);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const DEFAULT_STORE: () => StoreData = () => ({
  storeName: STORE_CONFIG.name,
  storeTagline: STORE_CONFIG.tagline,
  storeLogo: STORE_CONFIG.logo,
  primaryColor: "#8b5cf6",
  banners: [],
  products: PRODUCTS.map((p) => ({
    ...p,
    active: true,
    createdAt: new Date().toISOString(),
  })),
});

export function readStoreData(tenant: string = "localhost"): StoreData {
  ensureDir(tenant);
  const file = dataFile(tenant);
  if (!fs.existsSync(file)) {
    const defaults = DEFAULT_STORE();
    fs.writeFileSync(file, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw) as StoreData;
}

export function writeStoreData(data: StoreData, tenant: string = "localhost"): void {
  ensureDir(tenant);
  fs.writeFileSync(dataFile(tenant), JSON.stringify(data, null, 2));
}

/** List all registered tenant domain names */
export function listTenants(): string[] {
  if (!fs.existsSync(TENANTS_ROOT)) return [];
  return fs
    .readdirSync(TENANTS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/** Create a new tenant with default store data and an optional initial store name */
export function createTenant(domain: string, storeName?: string): StoreData {
  const data: StoreData = {
    ...DEFAULT_STORE(),
    storeName: storeName ?? domain,
    storeTagline: "Loja online",
    products: [],
    banners: [],
  };
  writeStoreData(data, domain);
  return data;
}

/** Delete a tenant's entire data directory. Returns false if it didn't exist. */
export function deleteTenant(domain: string): boolean {
  const dir = tenantDir(domain);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}
