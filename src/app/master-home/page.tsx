"use client";

import Link from "next/link";

const FEATURES = [
  {
    icon: "🏪",
    title: "Lojas Personalizáveis",
    desc: "Crie e gerencie múltiplas lojas com identidade visual própria — cores, logo, fontes e banners configuráveis pelo painel.",
  },
  {
    icon: "🎯",
    title: "Gestão de Ofertas",
    desc: "Monte suas páginas de produto com preço 'de/por', desconto PIX, prova social de vendas e métodos de pagamento por produto.",
  },
  {
    icon: "⚡",
    title: "Integração PIX Fácil",
    desc: "Checkout com geração de QR Code PIX e confirmação automática de pagamento via API, sem complicação.",
  },
  {
    icon: "📊",
    title: "UTMify Nativo",
    desc: "Rastreamento UTMify já integrado em todas as lojas. Acompanhe UTMs, origens de tráfego e vendas em tempo real.",
  },
  {
    icon: "📘",
    title: "Facebook Pixel",
    desc: "Adicione múltiplos pixels Meta por loja e dispare PageView, AddToCart, InitiateCheckout e Purchase automaticamente.",
  },
  {
    icon: "🎵",
    title: "TikTok Pixel",
    desc: "Integração completa com TikTok Pixel. Todos os eventos de funil rastreados da loja até o checkout PIX.",
  },
];

export default function MasterHomePage() {
  return (
    <div className="mh-root">
      {/* Navbar */}
      <nav className="mh-nav">
        <div className="mh-nav-inner">
          <span className="mh-brand">⚡ EcomFreedom</span>
          <Link href="/master-admin" className="mh-nav-btn">
            Acessar Painel →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mh-hero">
        <div className="mh-hero-inner">
          <span className="mh-hero-badge">Plataforma SaaS de E-commerce</span>
          <h1 className="mh-hero-title">
            Crie e Gerencie<br />
            <span className="mh-hero-accent">Múltiplas Lojas Online</span>
          </h1>
          <p className="mh-hero-sub">
            Uma plataforma completa para criar lojas personalizadas, integrar checkout PIX,
            rastrear campanhas e escalar suas vendas — tudo em um só lugar.
          </p>
          <div className="mh-hero-actions">
            <Link href="/master-admin" className="mh-btn-primary">
              Acessar Painel Master
            </Link>
            <a href="#features" className="mh-btn-ghost">
              Ver Funcionalidades ↓
            </a>
          </div>
        </div>

        {/* Decorative glow */}
        <div className="mh-hero-glow" aria-hidden="true" />
      </section>

      {/* Stats bar */}
      <div className="mh-stats">
        <div className="mh-stats-inner">
          <div className="mh-stat">
            <strong>Multi-lojas</strong>
            <span>1 painel, N lojas</span>
          </div>
          <div className="mh-stat-sep" />
          <div className="mh-stat">
            <strong>Checkout PIX</strong>
            <span>Aprovação imediata</span>
          </div>
          <div className="mh-stat-sep" />
          <div className="mh-stat">
            <strong>Pixels duplos</strong>
            <span>Meta + TikTok</span>
          </div>
          <div className="mh-stat-sep" />
          <div className="mh-stat">
            <strong>UTMify</strong>
            <span>Rastreamento nativo</span>
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="mh-features" id="features">
        <div className="mh-section-inner">
          <h2 className="mh-section-title">Tudo que você precisa para vender</h2>
          <p className="mh-section-sub">
            Funcionalidades pensadas para quem vende online e precisa de velocidade, rastreamento e conversão.
          </p>
          <div className="mh-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="mh-feature-card">
                <div className="mh-feature-icon">{f.icon}</div>
                <h3 className="mh-feature-title">{f.title}</h3>
                <p className="mh-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="mh-cta">
        <div className="mh-cta-inner">
          <h2 className="mh-cta-title">Pronto para começar?</h2>
          <p className="mh-cta-sub">Acesse o painel e crie sua primeira loja em minutos.</p>
          <Link href="/master-admin" className="mh-btn-primary large">
            Acessar Painel Master →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mh-footer">
        <span>© {new Date().getFullYear()} EcomFreedom · Plataforma de lojas online</span>
      </footer>

      <style>{`
        /* ── Reset / Base ───────────────────────────────────────── */
        .mh-root {
          min-height: 100vh;
          background: #09090b;
          color: #f4f4f5;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* ── Navbar ─────────────────────────────────────────────── */
        .mh-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(9,9,11,.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,.07);
        }
        .mh-nav-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .mh-brand {
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: -0.3px;
        }
        .mh-nav-btn {
          background: #fff;
          color: #09090b;
          font-size: 0.82rem;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 8px;
          text-decoration: none;
          transition: opacity .15s;
        }
        .mh-nav-btn:hover { opacity: .85; }

        /* ── Hero ───────────────────────────────────────────────── */
        .mh-hero {
          position: relative;
          overflow: hidden;
          padding: 96px 24px 80px;
          text-align: center;
        }
        .mh-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 720px;
          margin: 0 auto;
        }
        .mh-hero-badge {
          display: inline-block;
          background: rgba(139,92,246,.15);
          border: 1px solid rgba(139,92,246,.35);
          color: #c4b5fd;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 999px;
          margin-bottom: 28px;
        }
        .mh-hero-title {
          font-size: clamp(2.2rem, 5vw, 3.6rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -1.5px;
          margin: 0 0 20px;
        }
        .mh-hero-accent {
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .mh-hero-sub {
          font-size: 1.05rem;
          color: #a1a1aa;
          line-height: 1.65;
          margin: 0 0 40px;
        }
        .mh-hero-actions {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .mh-hero-glow {
          position: absolute;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(139,92,246,.18) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── Buttons ────────────────────────────────────────────── */
        .mh-btn-primary {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: #fff;
          font-weight: 700;
          font-size: 0.9rem;
          padding: 12px 26px;
          border-radius: 10px;
          text-decoration: none;
          transition: transform .15s, box-shadow .15s;
          box-shadow: 0 4px 18px rgba(139,92,246,.4);
        }
        .mh-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(139,92,246,.5); }
        .mh-btn-primary.large { padding: 15px 36px; font-size: 1rem; }
        .mh-btn-ghost {
          display: inline-flex;
          align-items: center;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          color: #d4d4d8;
          font-weight: 600;
          font-size: 0.9rem;
          padding: 12px 24px;
          border-radius: 10px;
          text-decoration: none;
          transition: background .15s;
        }
        .mh-btn-ghost:hover { background: rgba(255,255,255,.1); }

        /* ── Stats bar ──────────────────────────────────────────── */
        .mh-stats {
          background: rgba(255,255,255,.03);
          border-top: 1px solid rgba(255,255,255,.07);
          border-bottom: 1px solid rgba(255,255,255,.07);
          padding: 24px;
        }
        .mh-stats-inner {
          max-width: 860px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          flex-wrap: wrap;
        }
        .mh-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 36px;
          gap: 3px;
        }
        .mh-stat strong { font-size: 1rem; font-weight: 700; }
        .mh-stat span { font-size: 0.75rem; color: #71717a; }
        .mh-stat-sep {
          width: 1px;
          height: 36px;
          background: rgba(255,255,255,.08);
        }

        /* ── Features ───────────────────────────────────────────── */
        .mh-features {
          padding: 80px 24px;
        }
        .mh-section-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .mh-section-title {
          font-size: clamp(1.6rem, 3vw, 2.2rem);
          font-weight: 800;
          text-align: center;
          letter-spacing: -0.8px;
          margin: 0 0 12px;
        }
        .mh-section-sub {
          color: #a1a1aa;
          text-align: center;
          font-size: 0.95rem;
          margin: 0 0 52px;
          max-width: 540px;
          margin-left: auto;
          margin-right: auto;
        }
        .mh-features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .mh-feature-card {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          padding: 28px 26px;
          transition: border-color .2s, background .2s;
        }
        .mh-feature-card:hover {
          background: rgba(139,92,246,.07);
          border-color: rgba(139,92,246,.3);
        }
        .mh-feature-icon { font-size: 1.8rem; margin-bottom: 14px; }
        .mh-feature-title { font-size: 1rem; font-weight: 700; margin: 0 0 8px; }
        .mh-feature-desc { font-size: 0.85rem; color: #a1a1aa; line-height: 1.6; margin: 0; }

        /* ── CTA ────────────────────────────────────────────────── */
        .mh-cta {
          padding: 80px 24px;
          background: radial-gradient(ellipse at center, rgba(139,92,246,.12) 0%, transparent 70%);
          text-align: center;
          border-top: 1px solid rgba(255,255,255,.06);
        }
        .mh-cta-inner { max-width: 540px; margin: 0 auto; }
        .mh-cta-title {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 800;
          letter-spacing: -0.6px;
          margin: 0 0 12px;
        }
        .mh-cta-sub { color: #a1a1aa; margin: 0 0 36px; font-size: 0.95rem; }

        /* ── Footer ─────────────────────────────────────────────── */
        .mh-footer {
          padding: 24px;
          text-align: center;
          font-size: 0.78rem;
          color: #52525b;
          border-top: 1px solid rgba(255,255,255,.06);
        }

        /* ── Responsive ─────────────────────────────────────────── */
        @media (max-width: 600px) {
          .mh-hero { padding: 64px 20px 56px; }
          .mh-stat-sep { display: none; }
          .mh-stat { padding: 8px 20px; }
          .mh-features-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
