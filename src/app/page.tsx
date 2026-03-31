"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminProduct, TopBannerConfig } from "@/lib/admin-types";
import ProductCard from "@/components/ProductCard";

const PER_PAGE_DESKTOP = 16;
const PER_PAGE_MOBILE  = 14;

export default function StorePage() {
  const [products,          setProducts]          = useState<AdminProduct[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [showHero,          setShowHero]          = useState(true);
  const [cardStyle,         setCardStyle]         = useState("default");
  const [topBannerDesktop,  setTopBannerDesktop]  = useState<TopBannerConfig | null>(null);
  const [topBannerMobile,   setTopBannerMobile]   = useState<TopBannerConfig | null>(null);
  const [search,            setSearch]            = useState("");
  const [page,              setPage]              = useState(1);
  const [isMobile,          setIsMobile]          = useState(false);

  // Fallback: se estiver no master domain, redireciona para a landing page.
  // O middleware tenta fazer isso, mas caso falhe (problemas de proxy/header),
  // esta verificação server-side via API garante o comportamento correto.
  useEffect(() => {
    fetch("/api/tenant-type")
      .then((r) => r.json())
      .then(({ isMaster }) => {
        if (isMaster) window.location.replace("/master-home");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    fetch("/api/store/info")
      .then((r) => r.json())
      .then((data) => {
        setShowHero(data.showHero !== false);
        setCardStyle(data.cardStyle || "default");
        setTopBannerDesktop(data.topBannerDesktop || null);
        setTopBannerMobile(data.topBannerMobile   || null);
      })
      .catch(() => {});

    fetch("/api/store/products")
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const perPage   = isMobile ? PER_PAGE_MOBILE : PER_PAGE_DESKTOP;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

  const goToPage = useCallback((p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  return (
    <>
      {/* Top Banner */}
      {(topBannerDesktop?.image || topBannerMobile?.image) && (() => {
        const hasDesktop = !!topBannerDesktop?.image;

        function renderBanner(cfg: TopBannerConfig, extraClass?: string) {
          const { image, link, orientation = "horizontal", padding = 0, borderRadius = 0 } = cfg;
          if (!image) return null;
          const cls = ["top-banner", `top-banner--${orientation}`, extraClass || ""].filter(Boolean).join(" ");
          const wrapStyle: React.CSSProperties = padding > 0 ? { padding: `${padding}px ${padding}px 0` } : {};
          const imgStyle:  React.CSSProperties = borderRadius > 0 ? { borderRadius } : {};
          const inner = (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="Banner" style={imgStyle} />
          );
          return link ? (
            <a key={extraClass} href={link} className={cls} style={wrapStyle} target="_blank" rel="noopener noreferrer">{inner}</a>
          ) : (
            <div key={extraClass} className={cls} style={wrapStyle}>{inner}</div>
          );
        }

        return (
          <>
            {topBannerMobile?.image && renderBanner(
              topBannerMobile,
              (hasDesktop || topBannerMobile.hideOnDesktop) ? "top-banner--mobile-only" : undefined
            )}
            {hasDesktop && renderBanner(topBannerDesktop!, "top-banner--desktop-only")}
          </>
        );
      })()}

      {/* Hero */}
      {showHero && (
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
      )}

      {/* Products Section */}
      <div className="container products-section">
        <div className="products-search-bar">
          <input
            type="search"
            placeholder="🔍 Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ maxWidth: 420 }}
            id="search-input"
            aria-label="Buscar produtos"
          />
        </div>

        <div className="section-header">
          <h2 className="section-title">Todos os Produtos</h2>
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
            <p style={{ fontSize: "0.875rem", marginTop: "6px" }}>Tente outra busca</p>
          </div>
        ) : (
          <>
            <div className={`product-grid cards-${cardStyle}`}>
              {paginated.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                >
                  ←
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
                    ) : (
                      <button
                        key={p}
                        className={`pagination-btn${page === p ? " pagination-btn--active" : ""}`}
                        onClick={() => goToPage(p as number)}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  className="pagination-btn"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
