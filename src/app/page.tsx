"use client";

import { useState, useEffect } from "react";
import { AdminProduct } from "@/lib/admin-types";
import { CATEGORIES } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

const marqueeItems = [
  "🚀 Frete Grátis",
  "⚡ Pix — Aprovação Instantânea",
  "🔒 Compra 100% Segura",
  "🎁 Até 12x sem juros",
  "📦 Entrega em Todo Brasil",
  "💎 Produtos Selecionados",
];

export default function StorePage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/store/products")
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const matchCat = activeCategory === "Todos" || p.category === activeCategory;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      {/* Marquee Banner */}
      <div className="marquee-bar" aria-hidden>
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="marquee-item">{item}</span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-tag">✨ Nova coleção disponível</div>
          <h1 className="hero-title">
            Descubra os Melhores<br />Produtos do Mercado
          </h1>
          <p className="hero-subtitle">
            Os melhores produtos com entrega rápida. Pague com Pix e receba em tempo recorde.
          </p>
        </div>
      </section>

      {/* Products Section */}
      <div className="container">
        <div style={{ marginBottom: "12px" }}>
          <input
            type="search"
            placeholder="🔍 Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ maxWidth: 380 }}
            id="search-input"
            aria-label="Buscar produtos"
          />
        </div>

        <div className="filter-bar">
          <span className="filter-label">Categoria:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              id={`filter-${cat}`}
              className={`filter-chip ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="section-header">
          <h2 className="section-title">
            {activeCategory === "Todos" ? "Todos os Produtos" : activeCategory}
          </h2>
          <span className="product-count">{filtered.length} produtos</span>
        </div>

        {loading ? (
          <div className="product-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                <div className="skeleton" style={{ aspectRatio: "1", width: "100%" }} />
                <div style={{ padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 var(--radius-lg) var(--radius-lg)" }}>
                  <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 16, width: "90%", marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 12, width: "80%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
            <p style={{ fontSize: "2rem", marginBottom: "12px" }}>🔍</p>
            <p style={{ fontWeight: 600 }}>Nenhum produto encontrado</p>
            <p style={{ fontSize: "0.875rem", marginTop: "6px" }}>Tente outro filtro ou busca</p>
          </div>
        ) : (
          <div className="product-grid">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
