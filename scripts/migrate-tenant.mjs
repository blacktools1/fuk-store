/**
 * Migration script: copies data/store-data.json → data/tenants/{domain}/store-data.json
 *
 * Usage:
 *   node scripts/migrate-tenant.mjs <domain>
 *
 * Example:
 *   node scripts/migrate-tenant.mjs minhaloja.com.br
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const domain = process.argv[2];

if (!domain) {
  console.error("Erro: informe o domínio como argumento.");
  console.error("  Exemplo: node scripts/migrate-tenant.mjs minhaloja.com.br");
  process.exit(1);
}

const safe = domain.toLowerCase().replace(/[^a-z0-9.-]/g, "_");
const srcFile = path.join(root, "data", "store-data.json");
const destDir = path.join(root, "data", "tenants", safe);
const destFile = path.join(destDir, "store-data.json");

if (!fs.existsSync(srcFile)) {
  console.error(`Arquivo não encontrado: ${srcFile}`);
  process.exit(1);
}

if (fs.existsSync(destFile)) {
  console.warn(`⚠️  Já existe dados para o tenant "${safe}". Sobrescrevendo...`);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(srcFile, destFile);

console.log(`✅ Dados migrados com sucesso!`);
console.log(`   ${srcFile}`);
console.log(`   → ${destFile}`);
console.log(``);
console.log(`Próximos passos:`);
console.log(`  1. Aponte o DNS de "${domain}" para o IP desta VPS`);
console.log(`  2. Configure .env.local com MASTER_DOMAIN, MASTER_PASSWORD, etc.`);
console.log(`  3. Execute: npm run build && npm start`);
