import { readStoreData } from "@/lib/store-data";
import { getTenant } from "@/lib/tenant";

const DEFAULT_ITEMS = [
  "🚀 Frete Grátis",
  "⚡ Pix — Aprovação Instantânea",
  "🔒 Compra 100% Segura",
  "🎁 Até 12x sem juros",
  "📦 Entrega em Todo Brasil",
  "💎 Produtos Selecionados",
];

export default async function MarqueeBanner() {
  const tenant = await getTenant();
  const store = readStoreData(tenant);
  const texts = store.marqueeTexts?.filter(Boolean);
  const items = texts && texts.length > 0 ? texts : DEFAULT_ITEMS;
  // Repeat enough times so the animation loops smoothly
  const repeated = [...items, ...items, ...items, ...items];

  return (
    <div className="marquee-bar" aria-hidden>
      <div className="marquee-track">
        {repeated.map((item, i) => (
          <span key={i} className="marquee-item">{item}</span>
        ))}
      </div>
    </div>
  );
}
