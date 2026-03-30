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

/**
 * Returns the "safe" upload tenant name (dots → underscores),
 * e.g. "queijaria-online.site" → "queijaria-online_site"
 */
function safeTenantName(tenant: string): string {
  return sanitizeTenant(tenant).replace(/\./g, "_");
}

/**
 * Copies all files from the old upload directory (with dots) to the new one
 * (with underscores). Runs once and is a no-op if already done or if tenant
 * name has no dots.
 */
function migrateUploadsDir(tenant: string): void {
  const oldName = sanitizeTenant(tenant);
  const newName = safeTenantName(tenant);
  if (oldName === newName) return;

  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const oldDir = path.join(uploadsRoot, oldName);
  const newDir = path.join(uploadsRoot, newName);

  if (!fs.existsSync(oldDir)) return;

  try {
    if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });
    for (const file of fs.readdirSync(oldDir)) {
      const src = path.join(oldDir, file);
      const dest = path.join(newDir, file);
      if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
    }
  } catch (e) {
    console.warn("[store-data] Could not migrate uploads dir:", e);
  }
}

/**
 * Normalizes a single image URL:
 * - Converts /uploads/{any-tenant}/file  → /api/uploads/{safeName}/file
 * - Leaves /api/uploads/ URLs unchanged (already correct)
 * - Leaves external URLs (http/https) unchanged
 */
function normalizeUrl(url: string | undefined, safeName: string): string {
  if (!url) return "";
  // Already using the API route — no change needed
  if (url.startsWith("/api/uploads/")) return url;
  // Not an upload URL (external URL, placeholder, etc.) — leave as-is
  if (!url.startsWith("/uploads/")) return url;

  // /uploads/{tenant}/{filename...} → /api/uploads/{safeName}/{filename...}
  const parts = url.split("/"); // ["", "uploads", "{tenant}", ...rest]
  if (parts.length < 4) return url;
  const filename = parts.slice(3).join("/");
  return `/api/uploads/${safeName}/${filename}`;
}

/**
 * Normalizes all image paths in a StoreData object:
 *  - /uploads/{any}/  → /api/uploads/{safeTenant}/
 *  - /api/uploads/    → unchanged
 * Returns { data, changed }.
 */
function normalizePaths(data: StoreData, tenant: string): { data: StoreData; changed: boolean } {
  const newName = safeTenantName(tenant);
  let changed = false;

  const fix = (url: string | undefined) => {
    const n = normalizeUrl(url, newName);
    if (n !== (url ?? "")) changed = true;
    return n;
  };

  const products = data.products.map((p) => ({
    ...p,
    image: fix(p.image),
    images: p.images?.map(fix),
  }));

  const banners = data.banners?.map((b) => ({ ...b, image: fix(b.image) }));
  const storeLogo = fix(data.storeLogo);

  return {
    data: { ...data, storeLogo, products, banners: banners ?? [] },
    changed,
  };
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

  // Migrate upload files from old dot-format dir to underscore-format dir
  migrateUploadsDir(tenant);

  const raw = fs.readFileSync(file, "utf-8");
  const parsed = JSON.parse(raw) as StoreData;

  // Normalize all image URLs:
  //  • /uploads/{any-tenant}/  → /api/uploads/{safeTenant}/  (fixes runtime-serving issue)
  //  • fixes dots in tenant segment (legacy format)
  const { data, changed } = normalizePaths(parsed, tenant);
  if (changed) {
    // Persist so migration only runs once per URL
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }

  return data;
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
