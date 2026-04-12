"use client";

import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { StoreData, AdminProduct, Banner, TopBannerConfig, StorePixel } from "@/lib/admin-types";
import { PIX_PROVIDER_CATALOG, getPixProviderEntry } from "@/lib/pix-providers";
import { formatPrice } from "@/lib/products";

/** Exibe credencial mascarada (somente leitura no painel). */
function maskPixCredential(value: string): string {
  const v = value.trim();
  if (!v) return "—";
  if (v.length <= 12) return "••••••••" + v.slice(-4);
  return `${v.slice(0, 4)}${"•".repeat(8)}${v.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────
let toastId = 0;
function useAdminToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "error" }[]>([]);
  const show = (msg: string, type: "success" | "error" = "success") => {
    const id = ++toastId;
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  };
  return { toasts, show };
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Section = "dashboard" | "products" | "banners" | "settings" | "pixels" | "checkout";
// ─────────────────────────────────────────────────────────────
// Main Admin Page
// ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const { toasts, show } = useAdminToast();
  const [section, setSection] = useState<Section>("dashboard");
  const [data, setData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [devTenant, setDevTenant] = useState<string | null>(null);

  // Detecta tenant de desenvolvimento (cookie __dev_tenant no localhost)
  useEffect(() => {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isLocal) return;
    const match = document.cookie.split("; ").find((c) => c.startsWith("__dev_tenant="));
    if (match) {
      const val = match.split("=")[1];
      if (val && val !== "localhost") setDevTenant(decodeURIComponent(val));
    }
  }, []);

  const navigate = (s: Section) => { setSection(s); setSidebarOpen(false); };

  // Product modal state
  const [productModal, setProductModal] = useState<{ open: boolean; product: AdminProduct | null }>({
    open: false,
    product: null,
  });

  // Banner modal state
  const [bannerModal, setBannerModal] = useState<{ open: boolean; banner: Banner | null }>({
    open: false,
    banner: null,
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/store");
      if (res.status === 401) { router.push("/admin/login"); return; }
      const json = await res.json();
      setData(json);
    } catch {
      show("Erro ao carregar dados", "error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = async (patch: Partial<StoreData>) => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      setData((d) => d ? { ...d, ...patch } : d);
      show("Salvo com sucesso!");
    } catch {
      show("Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  // ── Product operations ──
  const toggleProduct = (id: string) => {
    if (!data) return;
    const products = data.products.map((p) =>
      p.id === id ? { ...p, active: !p.active } : p
    );
    save({ products });
  };

  const deleteProduct = (id: string) => {
    if (!data || !confirm("Excluir este produto?")) return;
    const products = data.products.filter((p) => p.id !== id);
    save({ products });
  };

  const saveProduct = (product: AdminProduct) => {
    if (!data) return;
    const exists = data.products.find((p) => p.id === product.id);
    const products = exists
      ? data.products.map((p) => (p.id === product.id ? product : p))
      : [...data.products, product];
    save({ products });
    setProductModal({ open: false, product: null });
  };

  // ── Banner operations ──
  const toggleBanner = (id: string) => {
    if (!data) return;
    const banners = data.banners.map((b) =>
      b.id === id ? { ...b, active: !b.active } : b
    );
    save({ banners });
  };

  const deleteBanner = (id: string) => {
    if (!data || !confirm("Excluir este banner?")) return;
    const banners = data.banners.filter((b) => b.id !== id);
    save({ banners });
  };

  const saveBanner = (banner: Banner) => {
    if (!data) return;
    const exists = data.banners.find((b) => b.id === banner.id);
    const banners = exists
      ? data.banners.map((b) => (b.id === banner.id ? banner : b))
      : [...data.banners, banner];
    save({ banners });
    setBannerModal({ open: false, banner: null });
  };

  if (loading) {
    return (
      <div className="admin-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", color: "var(--adm-text-muted)" }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "8px" }}>⏳</p>
          Carregando painel...
        </div>
      </div>
    );
  }

  const activeProducts = data?.products.filter((p) => p.active).length ?? 0;
  const totalProducts = data?.products.length ?? 0;

  const carouselBanners = data?.banners ?? [];
  const carouselTotal = carouselBanners.length;
  const carouselActive = carouselBanners.filter((b) => b.active).length;
  const hasTopBannerHero =
    !!(data?.topBannerMobile?.image?.trim()) ||
    !!(data?.topBannerDesktop?.image?.trim());
  const totalBanners = carouselTotal + (hasTopBannerHero ? 1 : 0);
  const activeBanners = carouselActive + (hasTopBannerHero ? 1 : 0);

  return (
    <div className="admin-shell">
      {/* ─── Toasts ─── */}
      <div className="admin-toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`admin-toast ${t.type === "error" ? "error" : ""}`}>
            {t.type === "success" ? "✅" : "❌"} {t.msg}
          </div>
        ))}
      </div>

      {/* ─── Mobile overlay ─── */}
      {sidebarOpen && (
        <div
          className="admin-mobile-overlay admin-mobile-overlay--visible"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside className={`admin-sidebar${sidebarOpen ? " admin-sidebar--open" : ""}`}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <span className="admin-sidebar-logo">{data?.storeName || "Minha Loja"}</span>
            <span className="admin-sidebar-sub">Painel Admin</span>
          </div>
        </div>

        <nav className="admin-nav">
          <div className="admin-nav-section">
            {([
              { key: "dashboard", icon: "📊", label: "Dashboard" },
              { key: "settings",  icon: "🎨", label: "Aparência" },
              { key: "banners",   icon: "🖼️", label: "Banners" },
              { key: "products",  icon: "📦", label: "Produtos" },
              { key: "checkout",  icon: "💳", label: "Checkout PIX" },
              { key: "pixels",    icon: "📡", label: "Pixels" },
            ] as { key: Section; icon: string; label: string }[]).map((item) => (
              <button
                key={item.key}
                id={`nav-${item.key}`}
                className={`admin-nav-link ${section === item.key ? "active" : ""}`}
                onClick={() => navigate(item.key)}
              >
                <span className="admin-nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="admin-nav-section">
            <p className="admin-nav-section-title">Externo</p>
            <a href="/" target="_blank" className="admin-nav-link">
              <span className="admin-nav-icon">🌐</span>
              Ver Loja
            </a>
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-nav-link" onClick={logout} id="logout-btn" style={{ color: "#fca5a5" }}>
            <span className="admin-nav-icon">🚪</span>
            Sair
          </button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="admin-main">
        <div className="admin-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="admin-hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
              <span /><span /><span />
            </button>
            <h1 className="admin-topbar-title">
              {section === "dashboard" && "Dashboard"}
              {section === "products"  && "Produtos"}
              {section === "banners"   && "Banners"}
              {section === "settings"  && "Aparência da Loja"}
              {section === "pixels"    && "Pixels de Rastreamento"}
              {section === "checkout"  && "Checkout PIX"}
            </h1>
          </div>
          <div className="admin-topbar-actions">
            <a href="/" target="_blank" className="admin-store-link">🌐 Ver Loja</a>
          </div>
        </div>

        <div className="admin-content">
          {/* Banner de dev tenant (só aparece no localhost quando há override) */}
          {devTenant && (
            <div style={{
              background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)",
              borderRadius: 8, padding: "8px 14px", marginBottom: 20,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 10, fontSize: "0.8rem", color: "#b45309", flexWrap: "wrap",
            }}>
              <span>
                🛠 <strong>Modo dev</strong> — editando loja:{" "}
                <code style={{ background: "rgba(0,0,0,.06)", padding: "1px 5px", borderRadius: 4 }}>{devTenant}</code>
              </span>
              <a
                href="/?__tenant=__clear"
                style={{ color: "inherit", fontWeight: 700, fontSize: "0.75rem", textDecoration: "underline", whiteSpace: "nowrap" }}
              >
                Voltar ao padrão
              </a>
            </div>
          )}
          {/* ── Dashboard ── */}
          {section === "dashboard" && (
            <DashboardSection
              totalProducts={totalProducts}
              activeProducts={activeProducts}
              activeBanners={activeBanners}
              totalBanners={totalBanners}
              storeData={data}
              onSaveConfig={save}
            />
          )}

          {/* ── Products ── */}
          {section === "products" && data && (
            <>
              <ProductsSection
                products={data.products}
                onToggle={toggleProduct}
                onDelete={deleteProduct}
                onEdit={(p) => setProductModal({ open: true, product: p })}
                onReorder={(products) => save({ products })}
                onBulkImport={(items) => {
                  const products = [...data.products, ...items];
                  save({ products });
                }}
                onAdd={() =>
                  setProductModal({
                    open: true,
                    product: {
                      id: `prod-${Date.now()}`,
                      name: "",
                      description: "",
                      price: 0,
                      image: "/products/placeholder.jpg",
                      category: "Eletrônicos",
                      badge: undefined,
                      stock: 10,
                      active: true,
                      createdAt: new Date().toISOString(),
                    },
                  })
                }
              />
              <OrderBumpsSection
                storeData={data}
                onSaveConfig={save}
              />
            </>
          )}

          {/* ── Banners ── */}
          {section === "banners" && data && (
            <BannersSection
              banners={data.banners}
              topBannerDesktop={data.topBannerDesktop}
              topBannerMobile={data.topBannerMobile}
              onSaveTopBanners={(desktop, mobile) =>
                save({ topBannerDesktop: desktop, topBannerMobile: mobile })
              }
              onToggle={toggleBanner}
              onDelete={deleteBanner}
              onEdit={(b) => setBannerModal({ open: true, banner: b })}
              onAdd={() =>
                setBannerModal({
                  open: true,
                  banner: {
                    id: `banner-${Date.now()}`,
                    title: "",
                    subtitle: "",
                    image: "",
                    active: true,
                    link: "/",
                    createdAt: new Date().toISOString(),
                  },
                })
              }
            />
          )}

          {/* ── Settings ── */}
          {section === "settings" && data && (
            <SettingsSection data={data} onSave={save} saving={saving} />
          )}

          {/* ── Pixels ── */}
          {section === "pixels" && data && (
            <PixelsSection
              pixels={data.pixels ?? []}
              onSave={(pixels) => save({ pixels })}
              saving={saving}
            />
          )}

          {/* ── Checkout PIX ── */}
          {section === "checkout" && (
            <CheckoutSection storeData={data} onSaveConfig={save} />
          )}
        </div>
      </div>

      {/* ── Product Modal ── */}
      {productModal.open && productModal.product && (
        <ProductModal
          product={productModal.product}
          onSave={saveProduct}
          onClose={() => setProductModal({ open: false, product: null })}
        />
      )}

      {/* ── Banner Modal ── */}
      {bannerModal.open && bannerModal.banner && (
        <BannerModal
          banner={bannerModal.banner}
          onSave={saveBanner}
          onClose={() => setBannerModal({ open: false, banner: null })}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboard Section
// ─────────────────────────────────────────────────────────────
function DashboardSection({
  totalProducts,
  activeProducts,
  activeBanners,
  totalBanners,
  storeData,
  onSaveConfig,
}: {
  totalProducts: number;
  activeProducts: number;
  activeBanners: number;
  totalBanners: number;
  storeData: StoreData | null;
  onSaveConfig: (patch: Partial<StoreData>) => Promise<void>;
}) {
  const [pixEnabled, setPixEnabled] = useState(storeData?.pixDiscountEnabled ?? true);
  const [pixPct, setPixPct]         = useState(storeData?.pixDiscount ?? 5);
  const [freeShip, setFreeShip]     = useState(storeData?.freeShippingMin ?? 199);
  const [saving, setSaving]         = useState(false);

  const cc = storeData?.checkoutConfig;
  const providerId = String(cc?.pixProvider ?? "paradise").toLowerCase();
  const pixProviderLabel = getPixProviderEntry(providerId)?.name ?? providerId;
  const hasInternalCheckout =
    providerId === "orama"
      ? !!(cc?.oramaApiKey?.trim() && cc?.oramaPublicKey?.trim())
      : !!(cc?.paradiseApiKey?.trim());
  const pixelList = storeData?.pixels ?? [];
  const pixelsActive = pixelList.filter((p) => p.active).length;
  const utmifyCount = (cc?.utmifyAccounts ?? []).length;
  const webhooksPending = (cc?.salePendingWebhooks ?? []).filter(Boolean).length;
  const webhooksApproved = (cc?.saleApprovedWebhooks ?? []).filter(Boolean).length;

  const handleSave = async () => {
    setSaving(true);
    await onSaveConfig({ pixDiscountEnabled: pixEnabled, pixDiscount: pixPct, freeShippingMin: freeShip });
    setSaving(false);
  };

  return (
    <>
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-icon">📦</span>
          <div className="admin-stat-value">{totalProducts}</div>
          <div className="admin-stat-label">Produtos Cadastrados</div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon">✅</span>
          <div className="admin-stat-value">{activeProducts}</div>
          <div className="admin-stat-label">Produtos Ativos</div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon">🖼️</span>
          <div className="admin-stat-value">{totalBanners}</div>
          <div className="admin-stat-label">Banners Cadastrados</div>
          <div style={{ fontSize: "0.68rem", color: "var(--adm-text-faint)", marginTop: 6, lineHeight: 1.35 }}>
            Slides do carrossel + banner do topo (se houver imagem)
          </div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon">⚡</span>
          <div className="admin-stat-value">{activeBanners}</div>
          <div className="admin-stat-label">Banners Ativos</div>
          <div style={{ fontSize: "0.68rem", color: "var(--adm-text-faint)", marginTop: 6, lineHeight: 1.35 }}>
            Slides ativos no carrossel + topo quando configurado
          </div>
        </div>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-icon" aria-hidden>PIX</span>
          <div className="admin-stat-value" style={{ fontSize: "1.05rem", lineHeight: 1.3 }}>
            {pixProviderLabel}
          </div>
          <div className="admin-stat-label">Provedor PIX ativo</div>
          <div style={{ fontSize: "0.68rem", color: hasInternalCheckout ? "#10b981" : "#f59e0b", marginTop: 8, fontWeight: 600 }}>
            {hasInternalCheckout ? "API configurada" : "Credenciais incompletas"}
          </div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon" aria-hidden>◎</span>
          <div className="admin-stat-value">
            {pixelsActive}/{pixelList.length}
          </div>
          <div className="admin-stat-label">Pixels ativos / total</div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon" aria-hidden>U</span>
          <div className="admin-stat-value">{utmifyCount}</div>
          <div className="admin-stat-label">Contas UTMify</div>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon" aria-hidden>↗</span>
          <div className="admin-stat-value" style={{ fontSize: "0.95rem" }}>
            {webhooksPending}+{webhooksApproved}
          </div>
          <div className="admin-stat-label">Webhooks (pendente + aprovada)</div>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 28 }}>
        <h2 className="admin-card-title">Resumo operacional</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: "0.88rem", color: "var(--adm-text-muted)", lineHeight: 1.75 }}>
          <li>
            <strong style={{ color: "var(--adm-text)" }}>Checkout interno:</strong>{" "}
            {hasInternalCheckout
              ? `ativo com ${pixProviderLabel} — o cliente paga na sua loja.`
              : "ainda não está pronto: abra Checkout PIX e preencha as credenciais do provedor selecionado."}
          </li>
          <li>
            <strong style={{ color: "var(--adm-text)" }}>Redirecionamento pós-compra:</strong>{" "}
            {cc?.redirectEnabled !== false
              ? (cc?.redirectUrl?.trim()
                ? `habilitado → ${cc.redirectUrl.trim()}`
                : "habilitado, mas sem URL definida (configure em Checkout PIX).")
              : "desligado — o cliente permanece na página de confirmação."}
          </li>
          <li>
            <strong style={{ color: "var(--adm-text)" }}>Rastreamento:</strong>{" "}
            {pixelList.length === 0
              ? "nenhum pixel cadastrado."
              : `${pixelList.length} pixel(is) cadastrado(s), ${pixelsActive} ativo(s).`}
            {" "}
            {utmifyCount > 0 ? `UTMify com ${utmifyCount} dashboard(s) vinculado(s).` : "UTMify não configurado."}
          </li>
          <li>
            <strong style={{ color: "var(--adm-text)" }}>Webhooks próprios:</strong>{" "}
            {webhooksPending + webhooksApproved === 0
              ? "nenhuma URL — use Checkout PIX → Webhooks HTTP para notificar apps externos."
              : `${webhooksPending} URL(s) em venda pendente e ${webhooksApproved} em venda aprovada.`}
          </li>
        </ul>
      </div>

      {/* ── Configurações Rápidas ── */}
      <div className="admin-card">
        <h2 className="admin-card-title">⚙️ Configurações Rápidas</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Desconto PIX */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--adm-text)" }}>Desconto no PIX</div>
                <div style={{ fontSize: "0.75rem", color: "var(--adm-text-faint)", marginTop: 2 }}>Exibido como "X% OFF no Pix" na página do produto</div>
              </div>
              <label className="admin-toggle">
                <input type="checkbox" checked={pixEnabled} onChange={(e) => setPixEnabled(e.target.checked)} />
                <span className="admin-toggle-slider" />
              </label>
            </div>
            {pixEnabled && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  className="admin-form-input"
                  type="number" min="1" max="50" step="1"
                  value={pixPct}
                  onChange={(e) => setPixPct(Math.min(50, Math.max(1, parseInt(e.target.value) || 5)))}
                  style={{ width: 80, marginBottom: 0 }}
                />
                <span style={{ fontSize: "0.85rem", color: "var(--adm-text-muted)" }}>% sobre o preço atual</span>
              </div>
            )}
          </div>

          {/* Frete Grátis */}
          <div style={{ borderTop: "1px solid var(--adm-border)", paddingTop: 16 }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--adm-text)", marginBottom: 4 }}>Frete Grátis a partir de</div>
            <div style={{ fontSize: "0.75rem", color: "var(--adm-text-faint)", marginBottom: 10 }}>Exibido na página do produto e no rodapé da loja</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "0.88rem", color: "var(--adm-text-muted)", fontWeight: 600 }}>R$</span>
              <input
                className="admin-form-input"
                type="number" min="0" step="1"
                value={freeShip}
                onChange={(e) => setFreeShip(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: 100, marginBottom: 0 }}
              />
            </div>
          </div>

          <button
            className="admin-btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ alignSelf: "flex-start" }}
          >
            {saving ? "Salvando…" : "Salvar Configurações"}
          </button>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">📋 Início Rápido</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem", color: "var(--adm-text-muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.2rem" }}>📦</span>
            <span>Gerencie seus produtos em <strong style={{ color: "var(--adm-text)" }}>Produtos</strong> — ative, pause, edite preços e estoque</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.2rem" }}>🖼️</span>
            <span>Controle banners em <strong style={{ color: "var(--adm-text)" }}>Banners</strong> — ligue/desligue sem excluir</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.2rem" }}>💳</span>
            <span>Configure o PIX em <strong style={{ color: "var(--adm-text)" }}>Checkout PIX</strong> — API Paradise, UTMify, Order Bumps</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.2rem" }}>📡</span>
            <span>Instale pixels de rastreamento em <strong style={{ color: "var(--adm-text)" }}>Pixels</strong> — Facebook e TikTok</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Checkout Section
// ─────────────────────────────────────────────────────────────
function CheckoutSection({
  storeData,
  onSaveConfig,
}: {
  storeData: StoreData | null;
  onSaveConfig: (patch: Partial<StoreData>) => Promise<void>;
}) {
  const [saving, setSaving]               = useState(false);
  const [saveStatus, setSaveStatus]       = useState<"idle" | "saved" | "error">("idle");
  const [isDirty, setIsDirty]             = useState(false);
  const [apiKey, setApiKey]               = useState(storeData?.checkoutConfig?.paradiseApiKey ?? "");
  const [oramaApiKey, setOramaApiKey]     = useState(storeData?.checkoutConfig?.oramaApiKey ?? "");
  const [oramaPublicKey, setOramaPublicKey] = useState(storeData?.checkoutConfig?.oramaPublicKey ?? "");
  const [oramaWebhookSecret, setOramaWebhookSecret] = useState(
    storeData?.checkoutConfig?.oramaWebhookSecret ?? ""
  );
  const [providerQuery, setProviderQuery] = useState("");
  const [redirectUrl, setRedirectUrl]     = useState(storeData?.checkoutConfig?.redirectUrl ?? "");
  const [redirectOn, setRedirectOn]       = useState(storeData?.checkoutConfig?.redirectEnabled ?? true);
  const [isTest, setIsTest]               = useState(storeData?.checkoutConfig?.utmifyIsTest ?? false);
  const [pixProvider, setPixProvider]     = useState<string>(storeData?.checkoutConfig?.pixProvider ?? "paradise");
  const [orderbumpStyle, setOrderbumpStyle] = useState<"style1" | "style2">(storeData?.checkoutConfig?.orderbumpStyle ?? "style1");

  // Shipping options
  const [shippingOptions, setShippingOptions] = useState<import("@/lib/admin-types").ShippingOption[]>(
    () => storeData?.checkoutConfig?.shippingOptions ?? []
  );
  const [newShip, setNewShip] = useState({ name: "", price: "0", days: "" });

  // UTMify — múltiplas contas
  const [utmifyAccounts, setUtmifyAccounts] = useState<import("@/lib/admin-types").UtmifyAccount[]>(
    storeData?.checkoutConfig?.utmifyAccounts ?? []
  );
  const [newUtmLabel, setNewUtmLabel] = useState("");
  const [newUtmToken, setNewUtmToken] = useState("");

  const [salePendingWebhooks, setSalePendingWebhooks] = useState<string[]>(
    () => storeData?.checkoutConfig?.salePendingWebhooks ?? []
  );
  const [saleApprovedWebhooks, setSaleApprovedWebhooks] = useState<string[]>(
    () => storeData?.checkoutConfig?.saleApprovedWebhooks ?? []
  );

  const addUtmifyAccount = () => {
    const token = newUtmToken.trim();
    if (!token) return;
    const label = newUtmLabel.trim() || `Dashboard ${utmifyAccounts.length + 1}`;
    setUtmifyAccounts((prev) => [...prev, { id: Date.now().toString(), label, token }]);
    setNewUtmLabel("");
    setNewUtmToken("");
    markDirty();
  };
  const removeUtmifyAccount = (id: string) => {
    setUtmifyAccounts((prev) => prev.filter((a) => a.id !== id));
    markDirty();
  };

  const filteredPixProviders = useMemo(() => {
    const q = providerQuery.trim().toLowerCase();
    if (!q) return PIX_PROVIDER_CATALOG;
    return PIX_PROVIDER_CATALOG.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [providerQuery]);

  const activeProviderMeta =
    getPixProviderEntry(pixProvider) ?? {
      id: pixProvider,
      name: pixProvider,
      description: "Provedor salvo na configuração.",
      available: true,
      authType: "—",
      apiHost: "—",
    };

  const [publicOrigin, setPublicOrigin] = useState("");
  useEffect(() => {
    setPublicOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  const internalWebhookUrl = publicOrigin
    ? `${publicOrigin}/api/checkout/webhook`
    : "/api/checkout/webhook";

  const isProviderConfigured = (id: string) => {
    if (id === "paradise") return apiKey.trim().length > 0;
    if (id === "orama") return !!(oramaApiKey.trim() && oramaPublicKey.trim());
    return false;
  };

  const markDirty = () => { setIsDirty(true); setSaveStatus("idle"); };

  const hasKey = pixProvider === "orama"
    ? oramaApiKey.trim().length > 0 && oramaPublicKey.trim().length > 0
    : apiKey.trim().length > 0;

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      await onSaveConfig({
        checkoutUrl: "",
        checkoutConfig: {
          ...storeData?.checkoutConfig,
          pixProvider,
          paradiseApiKey: apiKey.trim(),
          oramaApiKey: oramaApiKey.trim(),
          oramaPublicKey: oramaPublicKey.trim(),
          oramaWebhookSecret: oramaWebhookSecret.trim(),
          redirectUrl: redirectUrl.trim(),
          redirectEnabled: redirectOn,
          utmifyAccounts,
          utmifyIsTest: isTest,
          orderbumpStyle,
          shippingOptions,
          salePendingWebhooks: salePendingWebhooks.map((u) => u.trim()).filter(Boolean),
          saleApprovedWebhooks: saleApprovedWebhooks.map((u) => u.trim()).filter(Boolean),
        },
      });
      setSaveStatus("saved");
      setIsDirty(false);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const addShippingOption = () => {
    const name = newShip.name.trim();
    if (!name) return;
    const opt: import("@/lib/admin-types").ShippingOption = {
      id: `ship-${Date.now()}`,
      active: true,
      name,
      price: parseFloat(newShip.price) || 0,
      days: newShip.days.trim(),
    };
    setShippingOptions((p) => [...p, opt]);
    setNewShip({ name: "", price: "0", days: "" });
    markDirty();
  };
  const removeShipping = (id: string) => { setShippingOptions((p) => p.filter((o) => o.id !== id)); markDirty(); };
  const toggleShipping = (id: string) => { setShippingOptions((p) => p.map((o) => o.id === id ? { ...o, active: !o.active } : o)); markDirty(); };

  return (
    <>
      {/* Banner alterações não salvas */}
      {isDirty && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.35)",
          borderRadius: 8, padding: "10px 16px", marginBottom: 4,
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.83rem", color: "#b45309" }}>
            Você tem alterações não salvas
          </span>
          <button
            className="admin-btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "6px 18px", fontSize: "0.83rem" }}
          >
            {saving ? "Salvando…" : "Salvar agora"}
          </button>
        </div>
      )}

      {/* Hub Provedores PIX — sidebar + painel (referência layout) */}
      <div className="admin-pix-hub-wrap admin-card" style={{ padding: "20px 22px" }}>
        <header className="admin-pix-hub-header">
          <div>
            <h2 className="admin-pix-hub-title">Provedores PIX</h2>
            <p className="admin-pix-hub-sub">Gerencie e alterne entre provedores de API.</p>
          </div>
          <div className={`admin-pix-hub-status-pill${hasKey ? "" : " admin-pix-hub-status-pill--warn"}`}>
            <span className="admin-pix-hub-status-dot" aria-hidden />
            Provedor ativo: {activeProviderMeta.name}
          </div>
        </header>

        <div className="admin-pix-hub">
          <aside className="admin-pix-sidebar" aria-label="Lista de provedores">
            <label className="admin-form-label">Pesquisar provedor</label>
            <input
              className="admin-form-input admin-pix-provider-search"
              type="search"
              placeholder="Pesquisar provedor…"
              value={providerQuery}
              onChange={(e) => setProviderQuery(e.target.value)}
              autoComplete="off"
            />
            <div className="admin-pix-provider-scroll" role="listbox" aria-label="Provedores">
              {filteredPixProviders.length === 0 ? (
                <div className="admin-pix-provider-empty">Nenhum provedor corresponde à busca.</div>
              ) : (
                filteredPixProviders.map((p) => {
                  const isSel = pixProvider === p.id;
                  const configured = isProviderConfigured(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      disabled={!p.available}
                      className={`admin-pix-provider-row${isSel ? " admin-pix-provider-row--active" : ""}`}
                      onClick={() => {
                        if (!p.available) return;
                        setPixProvider(p.id);
                        markDirty();
                      }}
                    >
                      <div className="admin-pix-provider-meta">
                        <div className="admin-pix-provider-name">{p.name}</div>
                        <div className="admin-pix-provider-row-status">
                          {p.available ? (
                            <>
                              <span className={`admin-pix-dot${configured ? " admin-pix-dot--on" : ""}`} aria-hidden />
                              <span>
                                {configured ? "Configurado" : "Não configurado"}
                                {isSel ? " · Ativo na loja" : ""}
                              </span>
                            </>
                          ) : (
                            <span className="admin-pix-provider-soon">Em breve</span>
                          )}
                        </div>
                      </div>
                      {p.available && (
                        <span
                          className={
                            isSel
                              ? "admin-pix-provider-pill admin-pix-provider-pill--sel"
                              : "admin-pix-provider-pill"
                          }
                        >
                          {isSel ? "Ativo" : "Disponível"}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className="admin-pix-main">
            <div className="admin-pix-hero-strip">
              <div className="admin-pix-hero-text">
                <div className="admin-pix-hero-name">{activeProviderMeta.name}</div>
                <div className="admin-pix-hero-meta">
                  Autenticação: {activeProviderMeta.authType}
                  <span className="admin-pix-hero-sep">·</span>
                  Endpoint: {activeProviderMeta.apiHost}
                </div>
              </div>
              {hasKey ? (
                <span className="admin-pix-hero-badge">Provedor ativo na loja</span>
              ) : (
                <span className="admin-pix-hero-badge admin-pix-hero-badge--muted">Complete as credenciais abaixo</span>
              )}
            </div>

            {/* Uma única URL de webhook para qualquer provedor PIX (postback → esta loja) */}
            <div className="admin-pix-webhook-strip">
              <div className="admin-pix-webhook-strip-text">
                <div className="admin-pix-webhook-strip-title">URL de webhook / postback desta loja</div>
                <p className="admin-pix-webhook-strip-hint">
                  É sempre a mesma para Paradise, OramaPay e outros: cadastre-a no painel do provedor como URL de notificação.
                  O checkout também confirma pagamento por polling se você não configurar webhook no gateway.
                </p>
              </div>
              <div className="admin-pix-webhook-strip-row">
                <input
                  type="text"
                  readOnly
                  className="admin-form-input admin-pix-webhook-input"
                  value={internalWebhookUrl}
                  onFocus={(e) => e.target.select()}
                  aria-label="URL de webhook da loja"
                />
                <button
                  type="button"
                  className="admin-btn-secondary admin-pix-webhook-copy"
                  onClick={() => navigator.clipboard.writeText(internalWebhookUrl)}
                >
                  Copiar
                </button>
              </div>
            </div>

            <section className="admin-pix-card">
              <h3 className="admin-pix-card-title">Configuração de credenciais</h3>
              <p className="admin-pix-card-lead">
                Dados de autenticação na API do provedor. Não compartilhe estas chaves publicamente.
              </p>

              {pixProvider === "paradise" && (
                <div className="admin-pix-cred-grid admin-pix-cred-grid--single">
                  <div className="admin-pix-field">
                    <label className="admin-form-label">API Key (Secret Key)</label>
                    <input
                      className="admin-form-input"
                      type="password"
                      placeholder="sk_…"
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); markDirty(); }}
                      autoComplete="off"
                    />
                    <p className="admin-pix-field-hint">Painel Paradise → Configurações → API Key</p>
                  </div>
                </div>
              )}

              {pixProvider === "orama" && (
                <div className="admin-pix-cred-grid admin-pix-cred-grid--orama">
                  <div className="admin-pix-field">
                    <label className="admin-form-label">Secret Key (API Key)</label>
                    <input
                      className="admin-form-input"
                      type="password"
                      placeholder="live_…"
                      value={oramaApiKey}
                      onChange={(e) => { setOramaApiKey(e.target.value); markDirty(); }}
                      autoComplete="off"
                    />
                    <p className="admin-pix-field-hint">OramaPay → Credenciais → API Key</p>
                  </div>
                  <div className="admin-pix-field">
                    <label className="admin-form-label">Public Key</label>
                    <input
                      className="admin-form-input"
                      type="password"
                      placeholder="pk_… / public key"
                      value={oramaPublicKey}
                      onChange={(e) => { setOramaPublicKey(e.target.value); markDirty(); }}
                      autoComplete="off"
                    />
                    <p className="admin-pix-field-hint">Usada com a Secret Key no Basic Auth</p>
                  </div>
                  <div className="admin-pix-field admin-pix-field--full">
                    <label className="admin-form-label">Webhook Secret (opcional)</label>
                    <input
                      className="admin-form-input"
                      type="password"
                      placeholder="Para validar x-webhook-signature"
                      value={oramaWebhookSecret}
                      onChange={(e) => { setOramaWebhookSecret(e.target.value); markDirty(); }}
                      autoComplete="off"
                    />
                    <p className="admin-pix-field-hint">
                      A URL de postback é a faixa &quot;URL de webhook desta loja&quot; acima. Este secret valida o header no servidor.
                    </p>
                  </div>
                </div>
              )}

              {pixProvider !== "paradise" && pixProvider !== "orama" && (
                <p style={{ fontSize: "0.85rem", color: "var(--adm-text-muted)" }}>
                  Este provedor ainda não possui campos de credencial nesta versão.
                </p>
              )}
            </section>

            {(pixProvider === "paradise" && apiKey.trim()) ||
            (pixProvider === "orama" &&
              (oramaApiKey.trim() || oramaPublicKey.trim() || oramaWebhookSecret.trim())) ? (
              <section className="admin-pix-card admin-pix-card--readonly">
                <h3 className="admin-pix-card-title">Credenciais salvas no sistema</h3>
                <p className="admin-pix-card-lead">Pré-visualização mascarada — valores reais ficam apenas no servidor.</p>
                {pixProvider === "paradise" && (
                  <div className="admin-pix-cred-grid admin-pix-cred-grid--single">
                    <div className="admin-pix-field admin-pix-field--readonly">
                      <span className="admin-pix-readonly-label">API Key</span>
                      <code className="admin-pix-readonly-value">{maskPixCredential(apiKey)}</code>
                    </div>
                  </div>
                )}
                {pixProvider === "orama" && (
                  <div className="admin-pix-cred-grid">
                    <div className="admin-pix-field admin-pix-field--readonly">
                      <span className="admin-pix-readonly-label">Secret Key</span>
                      <code className="admin-pix-readonly-value">{maskPixCredential(oramaApiKey)}</code>
                    </div>
                    <div className="admin-pix-field admin-pix-field--readonly">
                      <span className="admin-pix-readonly-label">Public Key</span>
                      <code className="admin-pix-readonly-value">{maskPixCredential(oramaPublicKey)}</code>
                    </div>
                    <div className="admin-pix-field admin-pix-field--readonly">
                      <span className="admin-pix-readonly-label">Webhook Secret</span>
                      <code className="admin-pix-readonly-value">
                        {oramaWebhookSecret.trim() ? maskPixCredential(oramaWebhookSecret) : "—"}
                      </code>
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            <section className="admin-pix-card admin-pix-card--redirect">
              <h3 className="admin-pix-card-title">Redirecionamento do cliente</h3>
              <p className="admin-pix-card-lead">
                Comportamento após pagamento aprovado no checkout. Independe do provedor PIX — só afeta a experiência na loja.
              </p>
              <div className="admin-pix-field">
                <label className="admin-form-label">URL após pagamento confirmado</label>
                <input
                  className="admin-form-input"
                  type="url"
                  placeholder="https://… (opcional)"
                  value={redirectUrl}
                  onChange={(e) => { setRedirectUrl(e.target.value); markDirty(); }}
                />
                <p className="admin-pix-field-hint">Vazio = apenas mensagem de sucesso na própria página de checkout.</p>
              </div>
              <div className="admin-pix-redirect-toggle">
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--adm-text)" }}>
                    Redirecionar automaticamente
                  </div>
                  <div style={{ fontSize: "0.73rem", color: "var(--adm-text-muted)", marginTop: 2 }}>
                    Enviar o cliente para a URL acima após confirmar o pagamento
                  </div>
                </div>
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={redirectOn}
                    onChange={(e) => {
                      setRedirectOn(e.target.checked);
                      markDirty();
                    }}
                  />
                  <span className="admin-toggle-slider" />
                </label>
              </div>
            </section>

            <div className="admin-pix-main-footer">
              <button
                type="button"
                className="admin-btn-primary admin-pix-main-footer-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
              {saveStatus === "saved" && (
                <span className="admin-pix-save-msg admin-pix-save-msg--ok">Salvo com sucesso</span>
              )}
              {saveStatus === "error" && (
                <span className="admin-pix-save-msg admin-pix-save-msg--err">Erro ao salvar</span>
              )}
              <p className="admin-pix-main-footer-hint">
                Salva credenciais do provedor, redirecionamento pós-pagamento, UTMify e order bumps — o mesmo conteúdo do botão &quot;Salvar checkout&quot; no final desta aba.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* UTMify — múltiplos dashboards */}
      <div className="admin-card">
        <h2 className="admin-card-title">📊 UTMify</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--adm-text-faint)", marginBottom: 16, lineHeight: 1.6 }}>
          Adicione quantos dashboards UTMify quiser. O evento de compra será enviado para <strong>todos</strong> simultaneamente.
        </p>

        {/* Lista de contas cadastradas */}
        {utmifyAccounts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {utmifyAccounts.map((acc) => (
              <div key={acc.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px",
                background: "rgba(16,185,129,.05)",
                border: "1px solid rgba(16,185,129,.15)",
                borderRadius: 8,
              }}>
                <span style={{ fontSize: "1rem" }}>📈</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--adm-text)" }}>{acc.label}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--adm-text-faint)", marginTop: 1, fontFamily: "monospace" }}>
                    {"••••••••" + acc.token.slice(-6)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeUtmifyAccount(acc.id)}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--adm-text-faint)", fontSize: "1rem", padding: "4px 6px",
                    borderRadius: 4, lineHeight: 1,
                  }}
                  title="Remover conta"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {utmifyAccounts.length === 0 && (
          <p style={{ fontSize: "0.82rem", color: "var(--adm-text-faint)", marginBottom: 16 }}>
            Nenhum dashboard cadastrado.
          </p>
        )}

        {/* Formulário para adicionar nova conta */}
        <div style={{
          padding: 14, borderRadius: 8,
          border: "1px dashed var(--adm-border)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--adm-text-faint)", margin: 0, textTransform: "uppercase", letterSpacing: ".05em" }}>
            + Adicionar dashboard
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <div>
              <label className="admin-form-label">Nome (identificação)</label>
              <input
                className="admin-form-input"
                type="text"
                placeholder="ex: Dashboard Principal"
                value={newUtmLabel}
                onChange={(e) => setNewUtmLabel(e.target.value)}
                style={{ marginBottom: 0 }}
              />
            </div>
            <div>
              <label className="admin-form-label">Token da API UTMify</label>
              <input
                className="admin-form-input"
                type="password"
                placeholder="Cole o token aqui"
                value={newUtmToken}
                onChange={(e) => setNewUtmToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addUtmifyAccount()}
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>
          <div>
            <button
              type="button"
              className="admin-btn-primary"
              onClick={addUtmifyAccount}
              disabled={!newUtmToken.trim()}
              style={{ padding: "7px 20px", fontSize: "0.85rem" }}
            >
              + Adicionar
            </button>
          </div>
        </div>

        {/* Modo Teste */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--adm-border)" }}>
          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--adm-text)" }}>Modo Teste</div>
            <div style={{ fontSize: "0.73rem", color: "var(--adm-text-faint)", marginTop: 2 }}>Ative apenas para testes — não contamina relatórios reais</div>
          </div>
          <label className="admin-toggle">
            <input type="checkbox" checked={isTest} onChange={(e) => { setIsTest(e.target.checked); markDirty(); }} />
            <span className="admin-toggle-slider" />
          </label>
        </div>
      </div>

      {/* Webhooks HTTP (loja) */}
      <div className="admin-card">
        <h2 className="admin-card-title">Webhooks HTTP</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--adm-text-faint)", marginBottom: 16, lineHeight: 1.6 }}>
          Cadastre uma ou mais URLs (https) que recebem <code style={{ fontSize: "0.78em" }}>POST</code> com JSON quando uma venda entra em
          pendência (PIX gerado) ou quando o pagamento é aprovado. O corpo inclui <code style={{ fontSize: "0.78em" }}>event</code>,{" "}
          <code style={{ fontSize: "0.78em" }}>sentAt</code> e dados do pedido.
        </p>

        <div style={{ display: "grid", gap: 20 }}>
          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--adm-text)", marginBottom: 6 }}>
              Venda pendente (PIX gerado)
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--adm-text-faint)", marginBottom: 10, lineHeight: 1.5 }}>
              Disparado logo após criar o código PIX — <code style={{ fontSize: "0.78em" }}>event: &quot;sale_pending&quot;</code>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {salePendingWebhooks.map((url, idx) => (
                <div key={`p-${idx}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    className="admin-form-input"
                    type="url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => {
                      const next = [...salePendingWebhooks];
                      next[idx] = e.target.value;
                      setSalePendingWebhooks(next);
                      markDirty();
                    }}
                    style={{ marginBottom: 0, flex: 1, minWidth: 0 }}
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: "8px 12px", flexShrink: 0 }}
                    onClick={() => {
                      setSalePendingWebhooks((prev) => prev.filter((_, i) => i !== idx));
                      markDirty();
                    }}
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="admin-btn-secondary"
                style={{ alignSelf: "flex-start", fontSize: "0.82rem" }}
                onClick={() => {
                  setSalePendingWebhooks((prev) => [...prev, ""]);
                  markDirty();
                }}
              >
                + Adicionar URL
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--adm-border)", paddingTop: 16 }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--adm-text)", marginBottom: 6 }}>
              Venda aprovada (pagamento confirmado)
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--adm-text-faint)", marginBottom: 10, lineHeight: 1.5 }}>
              Disparado quando o checkout confirma o PIX — <code style={{ fontSize: "0.78em" }}>event: &quot;sale_approved&quot;</code>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {saleApprovedWebhooks.map((url, idx) => (
                <div key={`a-${idx}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    className="admin-form-input"
                    type="url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => {
                      const next = [...saleApprovedWebhooks];
                      next[idx] = e.target.value;
                      setSaleApprovedWebhooks(next);
                      markDirty();
                    }}
                    style={{ marginBottom: 0, flex: 1, minWidth: 0 }}
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: "8px 12px", flexShrink: 0 }}
                    onClick={() => {
                      setSaleApprovedWebhooks((prev) => prev.filter((_, i) => i !== idx));
                      markDirty();
                    }}
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="admin-btn-secondary"
                style={{ alignSelf: "flex-start", fontSize: "0.82rem" }}
                onClick={() => {
                  setSaleApprovedWebhooks((prev) => [...prev, ""]);
                  markDirty();
                }}
              >
                + Adicionar URL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Estilo dos Order Bumps */}
      <div className="admin-card">
        <h2 className="admin-card-title">🎨 Estilo dos Order Bumps</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--adm-text-faint)", marginBottom: 16, lineHeight: 1.6 }}>
          Escolha como os order bumps aparecem para o cliente no checkout. Gerencie os order bumps na aba <strong>Produtos</strong>.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {([
            { id: "style1", label: "Estilo 1 — Clássico", desc: "Caixa simples com botão de aceitar e preço em destaque." },
            { id: "style2", label: "Estilo 2 — Card com imagem", desc: "Card visual com badge, imagem do produto, preço + desconto e botão Adicionar oferta." },
          ] as const).map((s) => (
            <label
              key={s.id}
              style={{
                flex: "1 1 200px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "14px 16px",
                border: `2px solid ${orderbumpStyle === s.id ? "var(--adm-accent)" : "var(--adm-border)"}`,
                borderRadius: 10,
                cursor: "pointer",
                background: orderbumpStyle === s.id ? "rgba(139,92,246,.07)" : "var(--adm-bg-card)",
                transition: "all .15s",
              }}
            >
              <input
                type="radio"
                name="orderbumpStyle"
                value={s.id}
                checked={orderbumpStyle === s.id}
                onChange={() => { setOrderbumpStyle(s.id); markDirty(); }}
                style={{ marginTop: 3, accentColor: "var(--adm-accent)" }}
              />
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--adm-text)", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--adm-text-faint)", lineHeight: 1.45 }}>{s.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Opções de Frete */}
      <div className="admin-card">
        <h2 className="admin-card-title">🚚 Opções de Frete</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--adm-text-faint)", marginBottom: 16, lineHeight: 1.6 }}>
          Exibidas no checkout para o cliente escolher. O preço selecionado é somado ao valor do pedido.
        </p>

        {shippingOptions.length === 0 && (
          <p style={{ fontSize: "0.83rem", color: "var(--adm-text-faint)", marginBottom: 12 }}>Nenhuma opção de frete cadastrada.</p>
        )}

        {shippingOptions.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--adm-border)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--adm-text-faint)" }}>
                {s.price === 0 ? "Grátis" : `R$ ${s.price.toFixed(2)}`}
                {s.days ? ` · ${s.days}` : ""}
              </div>
            </div>
            <button type="button" onClick={() => toggleShipping(s.id)}
              style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 4, border: "1px solid var(--adm-border)", background: s.active ? "rgba(16,185,129,.15)" : "transparent", color: s.active ? "#10b981" : "var(--adm-text-muted)", cursor: "pointer" }}>
              {s.active ? "Ativo" : "Inativo"}
            </button>
            <button type="button" onClick={() => removeShipping(s.id)}
              style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(248,113,113,.3)", background: "rgba(248,113,113,.1)", color: "#f87171", cursor: "pointer" }}>
              Remover
            </button>
          </div>
        ))}

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
          <input className="admin-form-input" placeholder="Nome da transportadora *" value={newShip.name}
            onChange={(e) => setNewShip((p) => ({ ...p, name: e.target.value }))} style={{ marginBottom: 0 }} />
          <input className="admin-form-input" type="number" min="0" step="0.01" placeholder="Preço (R$)" value={newShip.price}
            onChange={(e) => setNewShip((p) => ({ ...p, price: e.target.value }))} style={{ marginBottom: 0 }} />
          <input className="admin-form-input" placeholder="Prazo (ex: 6 a 7 dias)" value={newShip.days}
            onChange={(e) => setNewShip((p) => ({ ...p, days: e.target.value }))} style={{ marginBottom: 0 }} />
        </div>
        <button type="button" className="admin-btn-secondary" onClick={addShippingOption} disabled={!newShip.name.trim()} style={{ marginTop: 10, fontSize: "0.82rem" }}>
          + Adicionar Frete
        </button>
      </div>

      {/* Salvar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, paddingBottom: 40, flexWrap: "wrap" }}>
        {saveStatus === "saved" && (
          <span style={{ fontSize: "0.82rem", color: "#10b981" }}>Todas as configurações salvas</span>
        )}
        {saveStatus === "error" && (
          <span style={{ fontSize: "0.82rem", color: "#ef4444" }}>Erro ao salvar</span>
        )}
        <button className="admin-btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 180 }}>
          {saving ? "Salvando…" : isDirty ? "Salvar checkout (alterações pendentes)" : "Salvar checkout"}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Order Bumps Section (exibida na aba Produtos)
// ─────────────────────────────────────────────────────────────
function OrderBumpsSection({
  storeData,
  onSaveConfig,
}: {
  storeData: StoreData | null;
  onSaveConfig: (patch: Partial<StoreData>) => Promise<void>;
}) {
  const [list, setList] = useState<import("@/lib/admin-types").Orderbump[]>(
    () => storeData?.checkoutConfig?.orderbumps ?? []
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", price: "0", oldPrice: "",
    badge: "", imageUrl: "", offerHash: "",
  });

  const update = (next: import("@/lib/admin-types").Orderbump[]) => { setList(next); setDirty(true); };

  const addOb = () => {
    const title = form.title.trim();
    if (!title) return;
    const newOb: import("@/lib/admin-types").Orderbump = {
      id: Date.now().toString(),
      active: true,
      title,
      description: form.description.trim(),
      price: parseFloat(form.price) || 0,
      oldPrice: form.oldPrice ? parseFloat(form.oldPrice) || undefined : undefined,
      badge: form.badge.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      offerHash: form.offerHash.trim(),
    };
    update([...list, newOb]);
    setForm({ title: "", description: "", price: "0", oldPrice: "", badge: "", imageUrl: "", offerHash: "" });
  };

  const removeOb  = (id: string) => update(list.filter((o) => o.id !== id));
  const toggleOb  = (id: string) => update(list.map((o) => o.id === id ? { ...o, active: !o.active } : o));
  const setField  = (id: string, patch: Partial<import("@/lib/admin-types").Orderbump>) =>
    update(list.map((o) => o.id === id ? { ...o, ...patch } : o));

  const handleSave = async () => {
    setSaving(true);
    await onSaveConfig({
      checkoutConfig: {
        ...storeData?.checkoutConfig,
        orderbumps: list,
      },
    });
    setSaving(false);
    setDirty(false);
  };

  return (
    <div className="admin-card" style={{ marginTop: 24 }}>
      <h2 className="admin-card-title">🛒 Order Bumps</h2>
      <p style={{ fontSize: "0.82rem", color: "var(--adm-text-faint)", marginBottom: 16, lineHeight: 1.6 }}>
        Ofertas exibidas no checkout antes do pagamento. O cliente pode adicioná-las com um clique.
        O estilo de exibição é configurado em <strong>Checkout PIX</strong>.
      </p>

      {/* Lista */}
      {list.length === 0 && (
        <p style={{ fontSize: "0.83rem", color: "var(--adm-text-faint)", marginBottom: 16 }}>Nenhum order bump cadastrado.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {list.map((ob) => (
          <div key={ob.id} style={{
            border: "1px solid var(--adm-border)", borderRadius: 10, padding: "14px 16px",
            opacity: ob.active ? 1 : 0.62,
            background: "var(--adm-bg-card)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{ob.title}</div>
                <div style={{ fontSize: "0.73rem", color: "var(--adm-text-faint)", marginTop: 2 }}>
                  {ob.badge && <span style={{ marginRight: 8, background: "rgba(139,92,246,.15)", color: "var(--adm-accent)", fontSize: "0.68rem", fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>{ob.badge}</span>}
                  R$ {ob.price.toFixed(2)}
                  {ob.oldPrice ? ` (de R$ ${ob.oldPrice.toFixed(2)})` : ""}
                  {ob.description ? ` · ${ob.description.substring(0, 50)}` : ""}
                </div>
              </div>
              <button type="button" onClick={() => toggleOb(ob.id)}
                style={{ fontSize: "0.72rem", padding: "3px 9px", borderRadius: 4, border: "1px solid var(--adm-border)", background: ob.active ? "rgba(16,185,129,.15)" : "transparent", color: ob.active ? "#10b981" : "var(--adm-text-muted)", cursor: "pointer" }}>
                {ob.active ? "Ativo" : "Inativo"}
              </button>
              <button type="button" onClick={() => removeOb(ob.id)}
                style={{ fontSize: "0.72rem", padding: "3px 9px", borderRadius: 4, border: "1px solid rgba(248,113,113,.3)", background: "rgba(248,113,113,.1)", color: "#f87171", cursor: "pointer" }}>
                Remover
              </button>
            </div>

            {/* Campos editáveis inline */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
              <div>
                <label className="admin-form-label">Título</label>
                <input className="admin-form-input" value={ob.title} style={{ marginBottom: 0 }}
                  onChange={(e) => setField(ob.id, { title: e.target.value })} />
              </div>
              <div>
                <label className="admin-form-label">Preço (R$)</label>
                <input className="admin-form-input" type="number" min="0" step="0.01" value={ob.price} style={{ marginBottom: 0 }}
                  onChange={(e) => setField(ob.id, { price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="admin-form-label">Preço original (R$) — Estilo 2</label>
                <input className="admin-form-input" type="number" min="0" step="0.01" value={ob.oldPrice ?? ""} placeholder="Opcional" style={{ marginBottom: 0 }}
                  onChange={(e) => setField(ob.id, { oldPrice: e.target.value ? parseFloat(e.target.value) || undefined : undefined })} />
              </div>
              <div>
                <label className="admin-form-label">Badge — Estilo 2</label>
                <input className="admin-form-input" value={ob.badge ?? ""} placeholder="ex: BRINDE 1" style={{ marginBottom: 0 }}
                  onChange={(e) => setField(ob.id, { badge: e.target.value || undefined })} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="admin-form-label">URL da Imagem — Estilo 2</label>
                <input className="admin-form-input" value={ob.imageUrl ?? ""} placeholder="https://... ou /products/..." style={{ marginBottom: 0 }}
                  onChange={(e) => setField(ob.id, { imageUrl: e.target.value || undefined })} />
              </div>
              <div>
                <label className="admin-form-label">Descrição</label>
                <input className="admin-form-input" value={ob.description} style={{ marginBottom: 0 }}
                  onChange={(e) => setField(ob.id, { description: e.target.value })} />
              </div>
              <div>
                <label className="admin-form-label">Offer Hash UTMify</label>
                <input className="admin-form-input" value={ob.offerHash} style={{ marginBottom: 0 }}
                  onChange={(e) => setField(ob.id, { offerHash: e.target.value })} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Adicionar novo */}
      <div style={{ border: "1px dashed var(--adm-border)", borderRadius: 10, padding: "16px" }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--adm-text-faint)", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: ".05em" }}>+ Novo order bump</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
          <div>
            <label className="admin-form-label">Título *</label>
            <input className="admin-form-input" placeholder="Nome do produto" value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label className="admin-form-label">Preço (R$)</label>
            <input className="admin-form-input" type="number" min="0" step="0.01" placeholder="0,00" value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label className="admin-form-label">Preço original (R$)</label>
            <input className="admin-form-input" type="number" min="0" step="0.01" placeholder="Opcional" value={form.oldPrice}
              onChange={(e) => setForm((p) => ({ ...p, oldPrice: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label className="admin-form-label">Badge (Estilo 2)</label>
            <input className="admin-form-input" placeholder="ex: BRINDE 1" value={form.badge}
              onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="admin-form-label">URL da imagem (Estilo 2)</label>
            <input className="admin-form-input" placeholder="https://..." value={form.imageUrl}
              onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label className="admin-form-label">Descrição</label>
            <input className="admin-form-input" placeholder="Descrição curta" value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
          <div>
            <label className="admin-form-label">Offer Hash UTMify</label>
            <input className="admin-form-input" placeholder="hash" value={form.offerHash}
              onChange={(e) => setForm((p) => ({ ...p, offerHash: e.target.value }))} style={{ marginBottom: 0 }} />
          </div>
        </div>
        <button type="button" className="admin-btn-primary" onClick={addOb} disabled={!form.title.trim()} style={{ marginTop: 14, fontSize: "0.85rem" }}>
          + Adicionar Order Bump
        </button>
      </div>

      {dirty && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button className="admin-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "💾 Salvar Order Bumps"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Products Section
// ─────────────────────────────────────────────────────────────
function ProductsSection({
  products,
  onToggle,
  onDelete,
  onEdit,
  onAdd,
  onBulkImport,
  onReorder,
}: {
  products: AdminProduct[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (p: AdminProduct) => void;
  onAdd: () => void;
  onBulkImport: (items: AdminProduct[]) => void;
  onReorder: (products: AdminProduct[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const isSearching = search.trim().length > 0;
  const filtered = isSearching
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOver(index);
  };
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); setDragOver(null); return; }
    const reordered = [...products];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    onReorder(reordered);
    setDragIndex(null);
    setDragOver(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOver(null); };

  return (
    <>
      <div className="admin-section-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h2 className="admin-section-title">Produtos ({products.length})</h2>
          <input
            type="search"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-form-input"
            style={{ width: 200, marginBottom: 0 }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="admin-btn admin-btn-secondary" onClick={() => setShowBulk(true)}>
            📋 Importar em Massa
          </button>
          <button className="admin-btn admin-btn-primary" onClick={onAdd} id="add-product-btn">
            + Novo Produto
          </button>
        </div>
      </div>

      {isSearching && (
        <p style={{ fontSize: "0.8rem", color: "var(--adm-text-muted)", marginBottom: 12 }}>
          ℹ️ Limpe a busca para reordenar produtos arrastando.
        </p>
      )}

      {showBulk && (
        <BulkImportModal
          onImport={(items) => { onBulkImport(items); setShowBulk(false); }}
          onClose={() => setShowBulk(false)}
        />
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {!isSearching && <th style={{ width: 32 }}></th>}
              <th>Produto</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isSearching ? 6 : 7} style={{ textAlign: "center", padding: "32px", color: "var(--adm-text-faint)" }}>
                  Nenhum produto encontrado
                </td>
              </tr>
            ) : (
              filtered.map((p, idx) => (
                <tr
                  key={p.id}
                  draggable={!isSearching}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  style={{
                    opacity: dragIndex === idx ? 0.4 : 1,
                    background: dragOver === idx && dragIndex !== idx ? "var(--adm-accent-dim)" : undefined,
                    transition: "background 0.15s",
                  }}
                >
                  {!isSearching && (
                    <td style={{ cursor: "grab", color: "var(--adm-text-faint)", fontSize: "1.1rem", userSelect: "none", paddingRight: 4 }}>
                      ⠿
                    </td>
                  )}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Image
                        src={p.image}
                        alt={p.name}
                        width={44}
                        height={44}
                        className="admin-table-img"
                        style={{ objectFit: "cover" }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{p.name}</div>
                        {p.badge && (
                          <span style={{ fontSize: "0.7rem", color: "var(--adm-accent-bright)" }}>{p.badge}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--adm-text-muted)", fontSize: "0.82rem" }}>{p.category}</td>
                  <td className="admin-price">{formatPrice(p.price)}</td>
                  <td style={{ color: "var(--adm-text-muted)" }}>{p.stock}</td>
                  <td>
                    <label className="admin-toggle" title={p.active ? "Ativo" : "Inativo"}>
                      <input
                        type="checkbox"
                        checked={p.active}
                        onChange={() => onToggle(p.id)}
                        aria-label={`Toggle ${p.name}`}
                      />
                      <span className="admin-toggle-slider" />
                    </label>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => onEdit(p)}>
                        ✏️ Editar
                      </button>
                      <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => onDelete(p.id)}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** True se o banner de topo tem imagem configurada (desktop ou mobile). */
function topBannerHasImage(cfg: TopBannerConfig | undefined): boolean {
  return !!(cfg?.image && String(cfg.image).trim());
}

// ─────────────────────────────────────────────────────────────
// Single-banner editor (reused for Desktop and Mobile)
// ─────────────────────────────────────────────────────────────
function BannerEditor({
  label,
  hint,
  config,
  onChange,
}: {
  label: string;
  hint?: string;
  config: TopBannerConfig;
  onChange: (c: TopBannerConfig) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const set = (patch: Partial<TopBannerConfig>) => onChange({ ...config, ...patch });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro no upload");
      set({ image: json.url });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const orientation = config.orientation || "horizontal";
  const padding     = config.padding     ?? 0;
  const radius      = config.borderRadius ?? 0;

  return (
    <div style={{ border: "1px solid var(--adm-border)", borderRadius: 10, padding: "18px 20px", marginBottom: 20, background: "var(--adm-bg-elevated)" }}>
      <h3 style={{ color: "var(--adm-text)", fontWeight: 700, fontSize: "0.95rem", marginBottom: hint ? 4 : 14 }}>{label}</h3>
      {hint && <p style={{ fontSize: "0.78rem", color: "var(--adm-text-faint)", marginBottom: 14 }}>{hint}</p>}

      {/* Image */}
      <div className="admin-form-field" style={{ marginBottom: 14 }}>
        <label className="admin-form-label">Imagem</label>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <label style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "var(--adm-bg-card)", border: "1.5px dashed var(--adm-border)",
            borderRadius: "8px", padding: "8px 14px", cursor: "pointer",
            fontSize: "0.82rem", fontWeight: 600, color: "var(--adm-text-muted)",
            transition: "all 0.18s ease", whiteSpace: "nowrap",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--adm-accent)"; e.currentTarget.style.color = "var(--adm-accent-bright)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--adm-border)"; e.currentTarget.style.color = "var(--adm-text-muted)"; }}
          >
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} disabled={uploading} />
            {uploading ? "⏳ Enviando..." : "📁 Enviar arquivo"}
          </label>
          <span style={{ fontSize: "0.8rem", color: "var(--adm-text-faint)" }}>ou</span>
          <input
            className="admin-form-input"
            value={config.image || ""}
            onChange={(e) => set({ image: e.target.value })}
            placeholder="/uploads/banner.jpg  ou  https://..."
            style={{ marginBottom: 0, flex: 1 }}
          />
        </div>
        {uploadError && <p style={{ fontSize: "0.78rem", color: "#fca5a5", marginBottom: 6 }}>⚠️ {uploadError}</p>}
        {config.image && (
          <div style={{ marginTop: 8, position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--adm-border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={config.image} alt="Preview" style={{ width: "100%", maxHeight: 160, objectFit: "cover", display: "block" }} />
            <button type="button" onClick={() => set({ image: "" })}
              style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.65)", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "0.8rem", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}
            >✕ Remover</button>
          </div>
        )}
      </div>

      {/* Link */}
      <div className="admin-form-field" style={{ marginBottom: 14 }}>
        <label className="admin-form-label">Link ao Clicar (opcional)</label>
        <input className="admin-form-input" value={config.link || ""} onChange={(e) => set({ link: e.target.value })} placeholder="https://... ou /produto/123" />
      </div>

      {/* Orientation */}
      <div className="admin-form-field" style={{ marginBottom: 14 }}>
        <label className="admin-form-label">Formato / Orientação</label>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          {([
            { value: "horizontal", label: "⬛ Horizontal", sub: "21:7" },
            { value: "square",     label: "🟥 Quadrado",   sub: "1:1"  },
            { value: "vertical",   label: "📱 Vertical",   sub: "3:4"  },
          ] as const).map((opt) => (
            <button key={opt.value} type="button" onClick={() => set({ orientation: opt.value })} style={{
              flex: 1, padding: "9px 6px", borderRadius: 8,
              fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
              border: orientation === opt.value ? "2px solid var(--adm-accent)" : "1.5px solid var(--adm-border)",
              background: orientation === opt.value ? "var(--adm-accent-dim)" : "var(--adm-bg-card)",
              color: orientation === opt.value ? "var(--adm-accent-bright)" : "var(--adm-text-muted)",
              transition: "all 0.18s ease", textAlign: "center",
            }}>
              <div>{opt.label}</div>
              <div style={{ fontSize: "0.68rem", opacity: 0.7, marginTop: 2 }}>{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Border radius */}
      <div className="admin-form-field" style={{ marginBottom: 14 }}>
        <label className="admin-form-label">Bordas</label>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          {([
            { value: 0,  label: "Retas" },
            { value: 8,  label: "Pequenas" },
            { value: 16, label: "Médias" },
            { value: 24, label: "Grandes" },
          ] as const).map((opt) => (
            <button key={opt.value} type="button" onClick={() => set({ borderRadius: opt.value })} style={{
              flex: 1, padding: "8px 4px", borderRadius: 8,
              fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
              border: radius === opt.value ? "2px solid var(--adm-accent)" : "1.5px solid var(--adm-border)",
              background: radius === opt.value ? "var(--adm-accent-dim)" : "var(--adm-bg-card)",
              color: radius === opt.value ? "var(--adm-accent-bright)" : "var(--adm-text-muted)",
              transition: "all 0.18s ease",
            }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Padding */}
      <div className="admin-form-field">
        <label className="admin-form-label">
          Espaço lateral — {padding === 0 ? "Borda a borda" : `${padding}px`}
        </label>
        <input
          type="range" min={0} max={48} step={4} value={padding}
          onChange={(e) => set({ padding: Number(e.target.value) })}
          style={{ width: "100%", marginTop: 6, accentColor: "var(--adm-accent)" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "var(--adm-text-faint)", marginTop: 4 }}>
          <span>Sem margem</span>
          <span>48px</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Banners Section
// ─────────────────────────────────────────────────────────────
function BannersSection({
  banners,
  topBannerDesktop: initialDesktop,
  topBannerMobile: initialMobile,
  onSaveTopBanners,
  onToggle,
  onDelete,
  onEdit,
  onAdd,
}: {
  banners: Banner[];
  topBannerDesktop?: TopBannerConfig;
  topBannerMobile?: TopBannerConfig;
  onSaveTopBanners: (desktop: TopBannerConfig, mobile: TopBannerConfig) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (b: Banner) => void;
  onAdd: () => void;
}) {
  const desktopSig = JSON.stringify(initialDesktop ?? {});
  const mobileSig = JSON.stringify(initialMobile ?? {});

  const [desktop, setDesktop] = useState<TopBannerConfig>(() => ({ ...(initialDesktop ?? {}) }));
  const [mobile, setMobile] = useState<TopBannerConfig>(() => ({ ...(initialMobile ?? {}) }));
  /** "Usar banner diferente no desktop" — deve refletir se há banner desktop salvo, não o mobile. */
  const [separateDesktopBanner, setSeparateDesktopBanner] = useState(() =>
    topBannerHasImage(initialDesktop)
  );

  useEffect(() => {
    const d = { ...(JSON.parse(desktopSig) as TopBannerConfig) };
    const m = { ...(JSON.parse(mobileSig) as TopBannerConfig) };
    setDesktop(d);
    setMobile(m);
    setSeparateDesktopBanner(topBannerHasImage(d));
  }, [desktopSig, mobileSig]);

  return (
    <>
      {/* ── Banner do Topo ── */}
      <div className="admin-card" style={{ marginBottom: 28 }}>
        <h2 className="admin-card-title">🖼️ Banner do Topo da Loja</h2>
        <p style={{ fontSize: "0.83rem", color: "var(--adm-text-muted)", marginBottom: 20 }}>
          Configure um banner para desktop e, opcionalmente, um diferente para mobile. Se não houver banner mobile, o banner desktop será exibido em todos os dispositivos.
        </p>

        <BannerEditor
          label="📱 Banner Mobile (Principal)"
          hint="Exibido em todos os dispositivos por padrão. Recomendado: quadrado ou vertical."
          config={mobile}
          onChange={setMobile}
        />

        {/* Ocultar no desktop */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <label className="admin-toggle">
            <input type="checkbox" checked={!!mobile.hideOnDesktop} onChange={(e) => setMobile({ ...mobile, hideOnDesktop: e.target.checked })} />
            <span className="admin-toggle-slider" />
          </label>
          <span style={{ fontSize: "0.88rem", color: "var(--adm-text)", fontWeight: 500 }}>
            Ocultar este banner no desktop
          </span>
        </div>

        {/* Toggle desktop */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: separateDesktopBanner ? 16 : 0 }}>
          <label className="admin-toggle">
            <input type="checkbox" checked={separateDesktopBanner} onChange={(e) => {
              setSeparateDesktopBanner(e.target.checked);
              if (!e.target.checked) setDesktop({});
            }} />
            <span className="admin-toggle-slider" />
          </label>
          <span style={{ fontSize: "0.88rem", color: "var(--adm-text)", fontWeight: 500 }}>
            Usar banner diferente no desktop
          </span>
        </div>

        {separateDesktopBanner && (
          <BannerEditor
            label="🖥️ Banner Desktop (Opcional)"
            hint="Exibido apenas em telas ≥ 768px quando configurado. Recomendado: horizontal."
            config={desktop}
            onChange={setDesktop}
          />
        )}

        <button
          className="admin-btn admin-btn-primary"
          style={{ marginTop: 8 }}
          onClick={() => onSaveTopBanners(separateDesktopBanner ? desktop : {}, mobile)}
        >
          💾 Salvar Banners do Topo
        </button>
      </div>

      {/* ── Banners Carrossel ── */}
      <div className="admin-section-header">
        <h2 className="admin-section-title">Banners Carrossel ({banners.length})</h2>
        <button className="admin-btn admin-btn-primary" onClick={onAdd} id="add-banner-btn">
          + Novo Banner
        </button>
      </div>

      {banners.length === 0 ? (
        <div className="admin-empty">
          <span className="admin-empty-icon">🖼️</span>
          <p className="admin-empty-title">Nenhum banner cadastrado</p>
          <p style={{ fontSize: "0.85rem" }}>Crie banners para destacar promoções e novidades na loja.</p>
        </div>
      ) : (
        <div className="admin-banner-grid">
          {banners.map((b) => (
            <div key={b.id} className="admin-banner-card">
              {b.image ? (
                <img src={b.image} alt={b.title} className="admin-banner-img" />
              ) : (
                <div className="admin-banner-img-placeholder">🖼️</div>
              )}
              <div className="admin-banner-body">
                <p className="admin-banner-title">{b.title || "(sem título)"}</p>
                <p style={{ fontSize: "0.78rem", color: "var(--adm-text-muted)", marginBottom: "8px" }}>
                  {b.subtitle || ""}
                </p>
                <div className="admin-banner-meta">
                  <span className={`admin-badge ${b.active ? "admin-badge-active" : "admin-badge-inactive"}`}>
                    {b.active ? "Ativo" : "Inativo"}
                  </span>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <label className="admin-toggle" title="Ativar/Desativar">
                      <input
                        type="checkbox"
                        checked={b.active}
                        onChange={() => onToggle(b.id)}
                        aria-label={`Toggle ${b.title}`}
                      />
                      <span className="admin-toggle-slider" />
                    </label>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => onEdit(b)}>✏️</button>
                    <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => onDelete(b.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SettingsGroup — card de seção com step indicator
// ─────────────────────────────────────────────────────────────
function SettingsGroup({ step, icon, title, children }: {
  step: number; icon: string; title: string; children: ReactNode;
}) {
  return (
    <div className="settings-group">
      <div className="settings-group-header">
        <span className="settings-group-step">{step}</span>
        <span className="settings-group-icon">{icon}</span>
        <span className="settings-group-title">{title}</span>
      </div>
      <div className="settings-group-body">
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ColorField — input de cor sincronizado (picker + hex)
// ─────────────────────────────────────────────────────────────
function ColorField({ label, value, onChange, span2 }: { label: string; value: string; onChange: (v: string) => void; span2?: boolean }) {
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  const handleHexChange = (v: string) => {
    setHex(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
  };
  return (
    <div className={`admin-form-field${span2 ? " span-2" : ""}`}>
      <label className="admin-form-label">{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="color"
          value={value}
          onChange={(e) => { onChange(e.target.value); setHex(e.target.value); }}
          style={{ width: 44, height: 40, padding: "2px", cursor: "pointer", borderRadius: 8, border: "1px solid var(--adm-border)", background: "none", flexShrink: 0 }}
        />
        <input
          type="text"
          className="admin-form-input"
          value={hex}
          onChange={(e) => handleHexChange(e.target.value)}
          style={{ fontFamily: "monospace", width: 108, marginBottom: 0 }}
          maxLength={7}
          placeholder="#000000"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Settings Section
// ─────────────────────────────────────────────────────────────
function SettingsSection({
  data,
  onSave,
  saving,
}: {
  data: StoreData;
  onSave: (p: Partial<StoreData>) => void;
  saving: boolean;
}) {
  const [storeName, setStoreName] = useState(data.storeName);
  const [tagline, setTagline] = useState(data.storeTagline);
  const [logo, setLogo] = useState(data.storeLogo);
  const [showHero, setShowHero] = useState(data.showHero ?? true);
  const [heroPosition, setHeroPosition] = useState<"before-banner" | "after-banner">(data.heroPosition ?? "after-banner");
  const [heroAlign, setHeroAlign] = useState<"left" | "center">(data.heroAlign ?? "center");
  const [heroTag, setHeroTag] = useState(data.heroTag ?? "✨ Nova coleção disponível");
  const [heroTitle, setHeroTitle] = useState(
    data.heroTitle ?? "Descubra os Melhores\nProdutos do Mercado"
  );
  const [heroSubtitle, setHeroSubtitle] = useState(
    data.heroSubtitle ??
      "Os melhores produtos com entrega rápida. Pague com Pix e receba em tempo recorde."
  );
  const [productTitleAlign, setProductTitleAlign] = useState<"left" | "center">(
    data.productTitleAlign ?? "left"
  );
  const [stickyHeader, setStickyHeader] = useState(data.stickyHeader !== false);
  const [logoUrl, setLogoUrl] = useState(data.logoUrl || "");
  const [logoDisplay, setLogoDisplay] = useState<"image-text" | "image-only" | "text-only">(data.logoDisplay ?? "image-text");
  const [logoSize, setLogoSize] = useState(data.logoSize ?? 36);
  const [logoPosition, setLogoPosition] = useState<"left" | "center" | "right">(data.logoPosition ?? "left");
  const [fontFamily, setFontFamily] = useState(data.fontFamily || "Inter");
  const [fontWeight, setFontWeight] = useState(data.fontWeight || 400);
  const [cardStyle, setCardStyle] = useState<"default"|"minimal"|"clean"|"bold"|"neon"|"cinematic">(data.cardStyle ?? "default");
  const [marqueeText1, setMarqueeText1] = useState(data.marqueeTexts?.[0] || "");
  const [marqueeText2, setMarqueeText2] = useState(data.marqueeTexts?.[1] || "");
  const [marqueeText3, setMarqueeText3] = useState(data.marqueeTexts?.[2] || "");
  const [marqueePosition, setMarqueePosition] = useState<"above-nav"|"below-nav">(data.marqueePosition ?? "below-nav");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro no upload");
      setLogoUrl(json.url);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const [primaryColor, setPrimaryColor] = useState(data.primaryColor || "#8b5cf6");
  const [secondaryColor, setSecondaryColor] = useState(data.secondaryColor || "#ec4899");
  const [tertiaryColor, setTertiaryColor] = useState(data.tertiaryColor || "#0a0a0f");
  const [headerColor, setHeaderColor] = useState(data.headerColor || "#0a0a0f");
  const [titleColor, setTitleColor] = useState(data.titleColor || "#ffffff");
  const [textColor, setTextColor] = useState(data.textColor || "#9ca3af");
  const [priceColor, setPriceColor] = useState(data.priceColor || "#ffffff");
  const [btnTextColor, setBtnTextColor] = useState(data.btnTextColor || "#ffffff");
  const [borderRadius, setBorderRadius] = useState(data.borderRadius || "14px");
  const [cardRadius,   setCardRadius]   = useState(data.cardRadius   || data.borderRadius || "14px");

  return (
    <>
      {/* ── 1. Identidade ── */}
      <SettingsGroup step={1} icon="🏪" title="Identidade da Loja">
        <div className="admin-form-grid">
          <div className="admin-form-field span-2">
            <label className="admin-form-label">Nome da Loja</label>
            <input className="admin-form-input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </div>
          <div className="admin-form-field span-2">
            <label className="admin-form-label">Tagline / Descrição</label>
            <input className="admin-form-input" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
          <div className="admin-form-field">
            <label className="admin-form-label">Emoji Substituto (ex: 🛍️)</label>
            <input className="admin-form-input" value={logo} onChange={(e) => setLogo(e.target.value)} />
          </div>
          <div className="admin-form-field span-2">
            <label className="admin-form-label">Logo (Imagem Principal)</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--adm-bg-elevated)", border: "1.5px dashed var(--adm-border)", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "var(--adm-text-muted)", transition: "all 0.18s ease", whiteSpace: "nowrap" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--adm-accent)"; e.currentTarget.style.color = "var(--adm-accent-bright)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--adm-border)"; e.currentTarget.style.color = "var(--adm-text-muted)"; }}>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} disabled={uploading} />
                {uploading ? "⏳ Enviando..." : "📁 Upload"}
              </label>
              <span style={{ fontSize: "0.8rem", color: "var(--adm-text-faint)" }}>ou</span>
              <input className="admin-form-input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="/uploads/logo.png ou https://..." style={{ marginBottom: 0, flex: 1 }} />
            </div>
            {uploadError && <p style={{ fontSize: "0.8rem", color: "#fca5a5", marginBottom: "6px" }}>⚠️ {uploadError}</p>}
            {logoUrl && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="preview" style={{ height: 48, maxWidth: 160, objectFit: "contain", borderRadius: 6, background: "rgba(255,255,255,0.08)", padding: 6, border: "1px solid var(--adm-border)" }} />
                <button type="button" onClick={() => setLogoUrl("")} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "0.78rem" }}>✕ Remover</button>
              </div>
            )}
          </div>
        </div>
      </SettingsGroup>

      {/* ── 2. Navbar ── */}
      <SettingsGroup step={2} icon="🔝" title="Navbar">
        <div className="admin-form-grid">
          <div className="admin-form-field span-2">
            <label className="admin-form-label">Exibição da Logo</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {([
                { value: "image-text", label: "Imagem + Texto" },
                { value: "image-only", label: "Só Imagem" },
                { value: "text-only",  label: "Só Texto" },
              ] as const).map((opt) => (
                <button key={opt.value} type="button" onClick={() => setLogoDisplay(opt.value)} style={{ flex: 1, padding: "8px 6px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", border: logoDisplay === opt.value ? "2px solid var(--adm-accent)" : "1.5px solid var(--adm-border)", background: logoDisplay === opt.value ? "var(--adm-accent-dim)" : "var(--adm-bg-elevated)", color: logoDisplay === opt.value ? "var(--adm-accent-bright)" : "var(--adm-text-muted)", transition: "all 0.18s ease" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-form-field span-2">
            <label className="admin-form-label">Posição da Logo</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {(["left","center","right"] as const).map((pos) => (
                <button key={pos} type="button" onClick={() => setLogoPosition(pos)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", border: logoPosition === pos ? "2px solid var(--adm-accent)" : "1.5px solid var(--adm-border)", background: logoPosition === pos ? "var(--adm-accent-dim)" : "var(--adm-bg-elevated)", color: logoPosition === pos ? "var(--adm-accent-bright)" : "var(--adm-text-muted)", transition: "all 0.18s ease" }}>
                  {pos === "left" ? "⬅ Esquerda" : pos === "center" ? "↔ Centro" : "➡ Direita"}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-form-field span-2">
            <label className="admin-form-label">Tamanho da Logo — {logoSize}px</label>
            <input type="range" min={20} max={110} step={2} value={logoSize} onChange={(e) => setLogoSize(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--adm-accent)", marginTop: 6 }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "var(--adm-text-faint)", marginTop: 4 }}><span>20px</span><span>{logoSize}px</span><span>110px</span></div>
          </div>
          <ColorField label="Cor de Fundo da Navbar" value={headerColor} onChange={setHeaderColor} />
          <div className="admin-form-field" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label className="admin-toggle">
              <input type="checkbox" checked={stickyHeader} onChange={(e) => setStickyHeader(e.target.checked)} />
              <span className="admin-toggle-slider" />
            </label>
            <span style={{ fontSize: "0.88rem", color: "var(--adm-text-muted)" }}>Fixar navbar no topo ao rolar</span>
          </div>
        </div>
      </SettingsGroup>

      {/* ── 3. Faixa de Destaque ── */}
      <SettingsGroup step={3} icon="✨" title="Faixa de Destaque">
        <div className="admin-form-grid">
          <div className="admin-form-field">
            <label className="admin-form-label">Texto 1 (obrigatório)</label>
            <input className="admin-form-input" value={marqueeText1} onChange={(e) => setMarqueeText1(e.target.value)} placeholder="ex: 🚀 Frete Grátis" />
          </div>
          <div className="admin-form-field">
            <label className="admin-form-label">Texto 2 (opcional)</label>
            <input className="admin-form-input" value={marqueeText2} onChange={(e) => setMarqueeText2(e.target.value)} placeholder="ex: 🔒 Compra Segura" />
          </div>
          <div className="admin-form-field span-2">
            <label className="admin-form-label">Texto 3 (opcional)</label>
            <input className="admin-form-input" value={marqueeText3} onChange={(e) => setMarqueeText3(e.target.value)} placeholder="ex: 🎁 Até 12x sem juros" />
          </div>
          <div className="admin-form-field span-2">
            <label className="admin-form-label">Posição da Faixa</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {([
                { value: "below-nav", label: "⬇ Abaixo da Navbar" },
                { value: "above-nav", label: "⬆ Acima da Navbar" },
              ] as const).map((opt) => (
                <button key={opt.value} type="button" onClick={() => setMarqueePosition(opt.value)} style={{ flex: 1, padding: "9px 6px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", border: marqueePosition === opt.value ? "2px solid var(--adm-accent)" : "1.5px solid var(--adm-border)", background: marqueePosition === opt.value ? "var(--adm-accent-dim)" : "var(--adm-bg-elevated)", color: marqueePosition === opt.value ? "var(--adm-accent-bright)" : "var(--adm-text-muted)", transition: "all 0.18s ease" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SettingsGroup>

      {/* ── 4. Hero ── */}
      <SettingsGroup step={4} icon="🎭" title="Seção de Boas-vindas (Hero)">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <label className="admin-toggle">
            <input type="checkbox" checked={showHero} onChange={(e) => setShowHero(e.target.checked)} />
            <span className="admin-toggle-slider" />
          </label>
          <div>
            <div style={{ fontSize: "0.9rem", color: "var(--adm-text)", fontWeight: 500 }}>Exibir seção Hero na página inicial</div>
            <div style={{ fontSize: "0.78rem", color: "var(--adm-text-faint)", marginTop: 2 }}>Textos editáveis abaixo. Pode ficar vazia a etiqueta superior.</div>
          </div>
        </div>

        {showHero && (
          <>
            <div className="admin-form-field span-2" style={{ marginBottom: 16 }}>
              <label className="admin-form-label">Posição em relação ao banner de topo</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                {([
                  { value: "after-banner" as const, label: "Depois do banner", sub: "Padrão — hero abaixo das imagens" },
                  { value: "before-banner" as const, label: "Antes do banner", sub: "Hero aparece primeiro" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setHeroPosition(opt.value)}
                    style={{
                      flex: "1 1 200px", padding: "10px 12px", borderRadius: 8, textAlign: "left",
                      cursor: "pointer", border: heroPosition === opt.value ? "2px solid var(--adm-accent)" : "1.5px solid var(--adm-border)",
                      background: heroPosition === opt.value ? "var(--adm-accent-dim)" : "var(--adm-bg-elevated)",
                      color: "var(--adm-text-muted)", transition: "all 0.18s ease",
                    }}
                  >
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--adm-text)" }}>{opt.label}</div>
                    <div style={{ fontSize: "0.72rem", marginTop: 4, opacity: 0.85 }}>{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-form-field span-2" style={{ marginBottom: 16 }}>
              <label className="admin-form-label">Alinhamento do texto do Hero</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {([
                  { value: "center" as const, label: "Centralizado" },
                  { value: "left" as const, label: "À esquerda" },
                ]).map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setHeroAlign(opt.value)} style={{ flex: 1, padding: "9px 8px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", border: heroAlign === opt.value ? "2px solid var(--adm-accent)" : "1.5px solid var(--adm-border)", background: heroAlign === opt.value ? "var(--adm-accent-dim)" : "var(--adm-bg-elevated)", color: heroAlign === opt.value ? "var(--adm-accent-bright)" : "var(--adm-text-muted)", transition: "all 0.18s ease" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-form-field span-2">
              <label className="admin-form-label">Etiqueta (badge) — opcional</label>
              <input className="admin-form-input" value={heroTag} onChange={(e) => setHeroTag(e.target.value)} placeholder="ex: ✨ Nova coleção disponível" />
              <p style={{ fontSize: "0.74rem", color: "var(--adm-text-faint)", marginTop: 6 }}>Deixe em branco para ocultar a etiqueta.</p>
            </div>
            <div className="admin-form-field span-2">
              <label className="admin-form-label">Título principal</label>
              <textarea
                className="admin-form-textarea"
                rows={3}
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="Uma linha ou várias — use Enter para quebrar"
                style={{ minHeight: 72 }}
              />
            </div>
            <div className="admin-form-field span-2">
              <label className="admin-form-label">Subtítulo</label>
              <textarea
                className="admin-form-textarea"
                rows={3}
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                placeholder="Texto de apoio abaixo do título"
              />
            </div>
          </>
        )}
      </SettingsGroup>

      {/* ── 5. Cores ── */}
      <SettingsGroup step={5} icon="🎨" title="Cores e Aparência">
        <div className="admin-form-grid">
          <ColorField label="Cor Principal (Botões e Hover)" value={primaryColor}   onChange={setPrimaryColor} />
          <ColorField label="Cor Secundária (Degradês)"      value={secondaryColor} onChange={setSecondaryColor} />
          <ColorField label="Cor de Fundo da Loja"           value={tertiaryColor}  onChange={setTertiaryColor} />
          <div className="admin-form-field">
            <label className="admin-form-label">Arredondamento Geral — Botões, Modais, Inputs</label>
            <select className="admin-form-select" value={borderRadius} onChange={(e) => setBorderRadius(e.target.value)}>
              <option value="0px">Retos (0px)</option>
              <option value="8px">Pouco Arredondados (8px)</option>
              <option value="14px">Arredondados — Padrão (14px)</option>
              <option value="24px">Bem Arredondados (24px)</option>
              <option value="999px">Pílula / Totalmente Arredondados</option>
            </select>
          </div>
        </div>
      </SettingsGroup>

      {/* ── 6. Tipografia ── */}
      <SettingsGroup step={6} icon="🔤" title="Tipografia">
        <div className="admin-form-grid">
          <div className="admin-form-field span-2">
            <label className="admin-form-label">Fonte Principal</label>
            <select className="admin-form-select" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
              {["Inter","Roboto","Poppins","Montserrat","Raleway","Nunito","Lato","Oswald","Playfair Display","DM Sans"].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="admin-form-field span-2">
            <label className="admin-form-label">Peso / Boldness</label>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {([
                { value: 300, label: "Light" },
                { value: 400, label: "Regular" },
                { value: 500, label: "Medium" },
                { value: 600, label: "Semibold" },
                { value: 700, label: "Bold" },
              ] as const).map((opt) => (
                <button key={opt.value} type="button" onClick={() => setFontWeight(opt.value)} style={{ flex: 1, minWidth: 60, padding: "8px 4px", borderRadius: 8, fontSize: "0.78rem", fontWeight: opt.value, cursor: "pointer", border: fontWeight === opt.value ? "2px solid var(--adm-accent)" : "1.5px solid var(--adm-border)", background: fontWeight === opt.value ? "var(--adm-accent-dim)" : "var(--adm-bg-elevated)", color: fontWeight === opt.value ? "var(--adm-accent-bright)" : "var(--adm-text-muted)", transition: "all 0.18s ease" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-form-field span-2">
            <label className="admin-form-label">Títulos dos produtos (listagem)</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {([
                { value: "left" as const, label: "⬅ À esquerda" },
                { value: "center" as const, label: "↔ Centralizado" },
              ]).map((opt) => (
                <button key={opt.value} type="button" onClick={() => setProductTitleAlign(opt.value)} style={{ flex: 1, padding: "9px 8px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", border: productTitleAlign === opt.value ? "2px solid var(--adm-accent)" : "1.5px solid var(--adm-border)", background: productTitleAlign === opt.value ? "var(--adm-accent-dim)" : "var(--adm-bg-elevated)", color: productTitleAlign === opt.value ? "var(--adm-accent-bright)" : "var(--adm-text-muted)", transition: "all 0.18s ease" }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: "0.74rem", color: "var(--adm-text-faint)", marginTop: 8 }}>Nome e descrição curta nos cards da página inicial.</p>
          </div>
          <ColorField label="Cor dos Títulos"   value={titleColor}   onChange={setTitleColor} />
          <ColorField label="Cor das Descrições" value={textColor}    onChange={setTextColor} />
          <ColorField label="Cor dos Preços"     value={priceColor}   onChange={setPriceColor} />
          <ColorField label="Texto dos Botões"   value={btnTextColor} onChange={setBtnTextColor} />
        </div>
      </SettingsGroup>

      {/* ── 7. Cards ── */}
      <SettingsGroup step={7} icon="🃏" title="Design dos Cards de Produto">
        {/* Card style */}
        <div style={{ marginBottom: 20 }}>
          <label className="admin-form-label" style={{ marginBottom: 10, display: "block" }}>Estilo do Card</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {([
              { value: "default",   label: "Padrão",     sub: "Borda + sombra suave",       icon: "🟦" },
              { value: "minimal",   label: "Minimal",    sub: "Sem borda, sombra leve",     icon: "⬜" },
              { value: "clean",     label: "Clean",      sub: "Sem moldura, só conteúdo",   icon: "✦" },
              { value: "bold",      label: "Bold",       sub: "Tipografia forte, barra accent", icon: "▰" },
              { value: "neon",      label: "Neon",       sub: "Borda brilhante no hover",   icon: "◈" },
              { value: "cinematic", label: "Cinemático", sub: "Texto sobre imagem",         icon: "🎬" },
            ] as const).map((opt) => (
              <button key={opt.value} type="button" onClick={() => setCardStyle(opt.value)} style={{ padding: "12px 8px", borderRadius: 10, cursor: "pointer", textAlign: "center", border: cardStyle === opt.value ? "2px solid var(--adm-accent)" : "1.5px solid var(--adm-border)", background: cardStyle === opt.value ? "var(--adm-accent-dim)" : "var(--adm-bg-elevated)", color: cardStyle === opt.value ? "var(--adm-accent-bright)" : "var(--adm-text-muted)", transition: "all 0.18s ease" }}>
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>{opt.icon}</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>{opt.label}</div>
                <div style={{ fontSize: "0.69rem", opacity: 0.65, marginTop: 3 }}>{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Card border radius */}
        <div>
          <label className="admin-form-label" style={{ marginBottom: 10, display: "block" }}>Arredondamento dos Cards</label>
          <div style={{ display: "flex", gap: 8 }}>
            {([
              { value: "0px",   label: "Reto",      preview: "0" },
              { value: "8px",   label: "Suave",     preview: "8" },
              { value: "14px",  label: "Médio",     preview: "14" },
              { value: "20px",  label: "Arredond.", preview: "20" },
              { value: "28px",  label: "Grande",    preview: "28" },
            ] as const).map((opt) => (
              <button key={opt.value} type="button" onClick={() => setCardRadius(opt.value)}
                style={{ flex: 1, padding: "10px 4px", cursor: "pointer", textAlign: "center",
                  border: cardRadius === opt.value ? "2px solid var(--adm-accent)" : "1.5px solid var(--adm-border)",
                  background: cardRadius === opt.value ? "var(--adm-accent-dim)" : "var(--adm-bg-elevated)",
                  color: cardRadius === opt.value ? "var(--adm-accent-bright)" : "var(--adm-text-muted)",
                  borderRadius: 8, transition: "all 0.18s ease",
                }}>
                <div style={{ width: 28, height: 22, margin: "0 auto 6px", background: "currentColor", opacity: 0.5, borderRadius: opt.value }} />
                <div style={{ fontSize: "0.75rem", fontWeight: 700 }}>{opt.label}</div>
              </button>
            ))}
          </div>
        </div>
      </SettingsGroup>

      {/* ── Salvar ── */}
      <div style={{ position: "sticky", bottom: 0, background: "var(--adm-bg)", borderTop: "1px solid var(--adm-border)", padding: "16px 0", marginTop: 8 }}>
        <button
          className="admin-btn admin-btn-primary"
          style={{ width: "100%" }}
          disabled={saving}
          id="save-settings-btn"
          onClick={() => onSave({
            storeName, storeTagline: tagline, storeLogo: logo,
            logoUrl, logoDisplay, logoSize, logoPosition,
            fontFamily, fontWeight, cardStyle,
            marqueeTexts: [marqueeText1, marqueeText2, marqueeText3].filter(Boolean),
            marqueePosition,
            primaryColor, secondaryColor, tertiaryColor, borderRadius, cardRadius,
            headerColor, stickyHeader, titleColor, textColor, priceColor, btnTextColor,
            showHero, heroPosition, heroAlign, heroTag, heroTitle, heroSubtitle, productTitleAlign,
          })}
        >
          {saving ? "⏳ Salvando..." : "💾 Salvar todas as configurações"}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Bulk Import Modal
// ─────────────────────────────────────────────────────────────
function BulkImportModal({
  onImport,
  onClose,
}: {
  onImport: (items: AdminProduct[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ name: string; price: number; oldPrice?: number }[]>([]);
  const [error, setError] = useState("");

  const parsePrice = (raw: string): number => {
    // Remove "R$", spaces, and convert comma to dot
    const cleaned = raw.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".").trim();
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  };

  const parseLines = (input: string) => {
    const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
    const result: { name: string; price: number; oldPrice?: number }[] = [];
    const errors: string[] = [];

    for (const line of lines) {
      // Remove leading number prefix like "1." "1)" "1-"
      const clean = line.replace(/^\d+[\.\)\-]\s*/, "").trim();
      if (!clean) continue;

      // Support formats:
      // "Nome - PreçoAtual" 
      // "Nome - PreçoAntigo > PreçoAtual"  or "Nome - PreçoAntigo / PreçoAtual"
      // "Nome | Preço"
      const sepMatch = clean.match(/^(.+?)\s*[-|:]\s*(.+)$/);
      if (!sepMatch) { errors.push(`Linha ignorada: "${line}"`); continue; }

      const name = sepMatch[1].trim();
      const priceStr = sepMatch[2].trim();

      // Check for two prices: "99,90 > 79,90" or "99,90 / 79,90"
      const twoPrices = priceStr.match(/^(.+?)\s*[>\/]\s*(.+)$/);
      if (twoPrices) {
        const oldPrice = parsePrice(twoPrices[1]);
        const price    = parsePrice(twoPrices[2]);
        result.push({ name, price, oldPrice: oldPrice > 0 ? oldPrice : undefined });
      } else {
        const price = parsePrice(priceStr);
        result.push({ name, price });
      }
    }

    return { result, errors };
  };

  const handlePreview = () => {
    setError("");
    const { result, errors } = parseLines(text);
    if (result.length === 0) {
      setError("Nenhum produto reconhecido. Verifique o formato.");
      setPreview([]);
      return;
    }
    if (errors.length > 0) setError(`${errors.length} linha(s) ignorada(s).`);
    setPreview(result);
  };

  const handleImport = () => {
    const { result } = parseLines(text);
    const now = new Date().toISOString();
    const products: AdminProduct[] = result.map((r, i) => ({
      id: `prod-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      name: r.name,
      description: "",
      price: r.price,
      oldPrice: r.oldPrice,
      image: "/products/placeholder.jpg",
      category: "Geral",
      stock: 10,
      active: true,
      createdAt: now,
    }));
    onImport(products);
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal" style={{ maxWidth: 640 }}>
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">📋 Importar Produtos em Massa</h2>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: 14, background: "var(--adm-bg-elevated)", borderRadius: 8, padding: "12px 14px", fontSize: "0.82rem", color: "var(--adm-text-muted)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--adm-text)", display: "block", marginBottom: 6 }}>Formatos aceitos:</strong>
          <code style={{ display: "block", color: "var(--adm-accent-bright)" }}>1. Nome do produto - Preço</code>
          <code style={{ display: "block", color: "var(--adm-accent-bright)" }}>2. Nome do produto - PreçoAntigo &gt; PreçoAtual</code>
          <span style={{ fontSize: "0.78rem" }}>Separador pode ser <code>-</code>, <code>|</code> ou <code>:</code> · Preço: <code>19,90</code> ou <code>R$19,90</code></span>
        </div>

        <div className="admin-form-field">
          <label className="admin-form-label">Lista de Produtos</label>
          <textarea
            className="admin-form-textarea"
            rows={10}
            placeholder={`1. Cesta Premium - 149,90\n2. Vinho Tinto - 89,90 > 69,90\n3. Kit Queijos - R$59,90`}
            value={text}
            onChange={(e) => { setText(e.target.value); setPreview([]); }}
            style={{ fontFamily: "monospace", fontSize: "0.85rem" }}
          />
        </div>

        {error && (
          <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, padding: "8px 12px", fontSize: "0.82rem", color: "#fcd34d", marginBottom: 12 }}>
            ⚠️ {error}
          </div>
        )}

        {preview.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--adm-text-muted)", marginBottom: 8 }}>
              Prévia — {preview.length} produto(s) reconhecido(s):
            </p>
            <div style={{ maxHeight: 200, overflowY: "auto", background: "var(--adm-bg-elevated)", borderRadius: 8, padding: "8px 0" }}>
              {preview.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 14px", fontSize: "0.85rem", borderBottom: "1px solid var(--adm-border)" }}>
                  <span style={{ color: "var(--adm-text)" }}>{p.name}</span>
                  <span style={{ color: "var(--adm-accent-bright)", fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>
                    {p.oldPrice ? <><s style={{ color: "var(--adm-text-faint)", fontWeight: 400 }}>R${p.oldPrice.toFixed(2).replace(".", ",")}</s> → </> : ""}
                    R${p.price.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
          {preview.length === 0 ? (
            <button className="admin-btn admin-btn-primary" onClick={handlePreview} disabled={!text.trim()}>
              👁 Pré-visualizar
            </button>
          ) : (
            <button className="admin-btn admin-btn-primary" onClick={handleImport}>
              ✅ Importar {preview.length} produtos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Product Modal
// ─────────────────────────────────────────────────────────────
const CATEGORIES = ["Eletrônicos", "Moda", "Casa", "Esporte", "Beleza"];
const BADGES = ["", "Novo", "Popular", "Oferta"];

function ProductModal({
  product,
  onSave,
  onClose,
}: {
  product: AdminProduct;
  onSave: (p: AdminProduct) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...product });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const set = (field: keyof AdminProduct, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const PLACEHOLDER = "/products/placeholder.jpg";

  // All real images (excluding placeholder)
  const allImages: string[] = [
    ...(form.image && form.image !== PLACEHOLDER ? [form.image] : []),
    ...(form.images?.filter((img) => img && img !== form.image && img !== PLACEHOLDER) ?? []),
  ];

  const getImagesFromForm = (f: AdminProduct): string[] => [
    ...(f.image && f.image !== PLACEHOLDER ? [f.image] : []),
    ...(f.images?.filter((img) => img && img !== f.image && img !== PLACEHOLDER) ?? []),
  ];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setUploadError("");
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Erro no upload");
        uploaded.push(json.url);
      }
      setForm((f) => {
        const merged = [...getImagesFromForm(f), ...uploaded];
        return { ...f, image: merged[0] ?? PLACEHOLDER, images: merged.slice(1) };
      });
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (url: string) => {
    setForm((f) => {
      const remaining = getImagesFromForm(f).filter((img) => img !== url);
      return { ...f, image: remaining[0] ?? PLACEHOLDER, images: remaining.slice(1) };
    });
  };

  const setMain = (url: string) => {
    setForm((f) => {
      const rest = getImagesFromForm(f).filter((img) => img !== url);
      return { ...f, image: url, images: rest };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.price <= 0) return;
    const finalVariations = typeof form.variations === "string"
      ? (form.variations as string).split(",").map((s) => s.trim()).filter(Boolean)
      : form.variations;
    onSave({
      ...form,
      variations: finalVariations,
      images: form.images ?? [],
    });
  };

  const variationsStr = Array.isArray(form.variations) ? form.variations.join(", ") : (form.variations || "");

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal">
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">{form.id.startsWith("prod-new") ? "Novo Produto" : "Editar Produto"}</h2>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <div className="admin-form-field span-2">
              <label className="admin-form-label">Nome do Produto *</label>
              <input className="admin-form-input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="admin-form-field span-2">
              <label className="admin-form-label">Descrição Longa (Detalhes)</label>
              <textarea className="admin-form-textarea" value={form.longDescription || ""} onChange={(e) => set("longDescription", e.target.value)} rows={4} placeholder="Mais especificações e detalhes para a página do produto..." />
            </div>
            <div className="admin-form-field span-2">
              <label className="admin-form-label">Variações (Separadas por vírgula)</label>
              <input className="admin-form-input" value={variationsStr} onChange={(e) => set("variations", e.target.value)} placeholder="Ex: P, M, G ou Branco, Preto" />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Preço Atual (R$) *</label>
              <input className="admin-form-input" type="number" step="0.01" min="0" value={form.price} onChange={(e) => set("price", parseFloat(e.target.value))} required />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Preço Antigo / De (R$)</label>
              <input className="admin-form-input" type="number" step="0.01" min="0" value={form.oldPrice ?? ""} onChange={(e) => set("oldPrice", e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="Deixe vazio se não houver" />
              {form.oldPrice && form.oldPrice > form.price && (
                <span style={{ fontSize: "0.78rem", color: "var(--adm-success)", marginTop: 4, display: "block" }}>
                  Desconto: -{Math.round((1 - form.price / form.oldPrice) * 100)}%
                </span>
              )}
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Estoque (interno)</label>
              <input className="admin-form-input" type="number" min="0" value={form.stock} onChange={(e) => set("stock", parseInt(e.target.value))} />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Vendas Realizadas</label>
              <input className="admin-form-input" type="number" min="0" value={form.salesCount ?? ""} onChange={(e) => set("salesCount", e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Ex: 1248" />
              <span style={{ fontSize: "0.74rem", color: "var(--adm-text-faint)", marginTop: 4, display: "block" }}>Exibido na página do produto como prova social</span>
            </div>
            <div className="admin-form-field span-2">
              <label className="admin-form-label">Métodos de Pagamento Aceitos</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {(["Pix", "Cartão de Crédito", "Cartão de Débito", "Boleto"] as const).map((method) => {
                  const active = (form.paymentMethods ?? ["Pix","Cartão de Crédito","Cartão de Débito","Boleto"]).includes(method);
                  return (
                    <button key={method} type="button"
                      onClick={() => {
                        const current = form.paymentMethods ?? ["Pix","Cartão de Crédito","Cartão de Débito","Boleto"];
                        set("paymentMethods", active ? current.filter((m) => m !== method) : [...current, method]);
                      }}
                      style={{
                        padding: "7px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                        border: active ? "2px solid var(--adm-accent)" : "1.5px solid var(--adm-border)",
                        background: active ? "var(--adm-accent-dim)" : "var(--adm-bg-card)",
                        color: active ? "var(--adm-accent-bright)" : "var(--adm-text-muted)",
                        transition: "all 0.18s ease",
                      }}>
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Categoria</label>
              <select className="admin-form-select" value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Badge</label>
              <select className="admin-form-select" value={form.badge ?? ""} onChange={(e) => set("badge", e.target.value || undefined)}>
                {BADGES.map((b) => <option key={b} value={b}>{b || "(nenhum)"}</option>)}
              </select>
            </div>

            {/* ── Image Manager ── */}
            <div className="admin-form-field span-2">
              <label className="admin-form-label">Imagens do Produto</label>

              {/* Upload button */}
              <label style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                background: "var(--adm-accent)", color: "#fff",
                fontSize: "0.875rem", fontWeight: 600,
                opacity: uploading ? 0.7 : 1,
              }}>
                {uploading ? "Enviando..." : "📤 Upload de Imagens"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
              <span style={{ fontSize: "0.75rem", color: "var(--adm-text-muted)", marginLeft: 10 }}>
                Selecione uma ou mais imagens (JPG, PNG, WebP, GIF)
              </span>

              {uploadError && (
                <p style={{ color: "#fca5a5", fontSize: "0.8rem", marginTop: 6 }}>{uploadError}</p>
              )}

              {/* Image gallery */}
              {allImages.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                  {allImages.map((url, i) => (
                    <div key={url} style={{ position: "relative", width: 90, flexShrink: 0 }}>
                      <img
                        src={url}
                        alt={`Imagem ${i + 1}`}
                        style={{
                          width: 90, height: 90, objectFit: "cover", borderRadius: 8,
                          border: i === 0 ? "2px solid var(--adm-accent)" : "2px solid var(--adm-border)",
                          display: "block",
                        }}
                      />
                      {i === 0 && (
                        <span style={{
                          position: "absolute", bottom: 4, left: 0, right: 0,
                          textAlign: "center", fontSize: "0.65rem", fontWeight: 700,
                          background: "var(--adm-accent)", color: "#fff", padding: "1px 0",
                          borderRadius: "0 0 6px 6px",
                        }}>
                          PRINCIPAL
                        </span>
                      )}
                      <div style={{ display: "flex", gap: 3, marginTop: 5, justifyContent: "center" }}>
                        {i !== 0 && (
                          <button
                            type="button"
                            title="Definir como principal"
                            onClick={() => setMain(url)}
                            style={{ background: "var(--adm-bg-elevated)", border: "1px solid var(--adm-border)", borderRadius: 5, padding: "2px 6px", fontSize: "0.7rem", cursor: "pointer", color: "var(--adm-text)" }}
                          >
                            ★
                          </button>
                        )}
                        <button
                          type="button"
                          title="Remover imagem"
                          onClick={() => removeImage(url)}
                          style={{ background: "var(--adm-bg-elevated)", border: "1px solid var(--adm-border)", borderRadius: 5, padding: "2px 6px", fontSize: "0.7rem", cursor: "pointer", color: "#fca5a5" }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {allImages.length === 0 && (
                <p style={{ fontSize: "0.8rem", color: "var(--adm-text-faint)", marginTop: 10 }}>
                  Nenhuma imagem adicionada. Faça upload acima.
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end" }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="admin-btn admin-btn-primary">💾 Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Banner Modal
// ─────────────────────────────────────────────────────────────
function BannerModal({
  banner,
  onSave,
  onClose,
}: {
  banner: Banner;
  onSave: (b: Banner) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...banner });
  const set = (field: keyof Banner, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal">
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {banner.title ? "Editar Banner" : "Novo Banner"}
          </h2>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-field">
            <label className="admin-form-label">Título do Banner</label>
            <input className="admin-form-input" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="admin-form-field">
            <label className="admin-form-label">Subtítulo</label>
            <input className="admin-form-input" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </div>
          <div className="admin-form-field">
            <label className="admin-form-label">URL da Imagem</label>
            <input className="admin-form-input" value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="https://... ou /banners/banner.jpg" />
            {form.image && (
              <img src={form.image} alt="preview" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 8, marginTop: 8, border: "1px solid var(--adm-border)" }} />
            )}
          </div>
          <div className="admin-form-field">
            <label className="admin-form-label">Link (opcional)</label>
            <input className="admin-form-input" value={form.link ?? ""} onChange={(e) => set("link", e.target.value)} placeholder="/" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <label className="admin-toggle">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
              <span className="admin-toggle-slider" />
            </label>
            <span style={{ fontSize: "0.875rem", color: "var(--adm-text-muted)" }}>
              {form.active ? "Banner Ativo" : "Banner Inativo"}
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="admin-btn admin-btn-primary">💾 Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pixels Section
// ─────────────────────────────────────────────────────────────
function PixelsSection({
  pixels,
  onSave,
  saving,
}: {
  pixels: StorePixel[];
  onSave: (pixels: StorePixel[]) => void;
  saving: boolean;
}) {
  const [list, setList] = useState<StorePixel[]>(pixels);
  const [newType, setNewType] = useState<"facebook" | "tiktok">("facebook");
  const [newId, setNewId] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pixelFilter, setPixelFilter] = useState("");

  useEffect(() => {
    if (!dirty) setList(pixels);
  }, [pixels, dirty]);

  const update = (updated: StorePixel[]) => { setList(updated); setDirty(true); };

  const addPixel = () => {
    const trimmed = newId.trim();
    if (!trimmed) return;
    update([
      ...list,
      {
        id: `pixel-${Date.now()}`,
        type: newType,
        pixelId: trimmed,
        active: true,
        ...(newType === "facebook" ? { accessToken: "" } : {}),
      },
    ]);
    setNewId("");
  };

  const setPixelField = (id: string, patch: Partial<StorePixel>) => {
    update(list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const toggle = (id: string) =>
    update(list.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));

  const remove = (id: string) => update(list.filter((p) => p.id !== id));

  const filteredRows = useMemo(() => {
    const q = pixelFilter.trim().toLowerCase();
    let rows = [...list];
    if (q) {
      rows = rows.filter((p) => {
        const plat = p.type === "facebook" ? "meta facebook" : "tiktok";
        return (
          p.pixelId.toLowerCase().includes(q) ||
          plat.includes(q) ||
          p.id.toLowerCase().includes(q)
        );
      });
    }
    return rows.sort((a, b) => {
      const t = a.type.localeCompare(b.type);
      if (t !== 0) return t;
      return a.pixelId.localeCompare(b.pixelId);
    });
  }, [list, pixelFilter]);

  return (
    <div>
      <div className="settings-group" style={{ marginBottom: 24 }}>
        <div className="settings-group-header">
          <span className="settings-group-icon">➕</span>
          <span className="settings-group-title">Adicionar Pixel</span>
        </div>
        <div className="settings-group-body">
          <div className="admin-pixels-add-row">
            <div className="admin-form-field" style={{ flex: "0 0 auto", minWidth: "100%", marginBottom: 0 }}>
              <label className="admin-form-label">Plataforma</label>
              <select
                className="admin-form-select"
                value={newType}
                onChange={(e) => setNewType(e.target.value as "facebook" | "tiktok")}
              >
                <option value="facebook">Facebook / Meta</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
            <div className="admin-form-field" style={{ flex: 1, minWidth: 0, marginBottom: 0 }}>
              <label className="admin-form-label">ID do Pixel</label>
              <input
                className="admin-form-input"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder={newType === "facebook" ? "Ex: 1234567890123456" : "Ex: CABCDE12345678901234"}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPixel(); } }}
              />
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              style={{ width: "100%", marginBottom: 0, minHeight: 44 }}
              onClick={addPixel}
            >
              + Adicionar
            </button>
          </div>
          <p className="admin-pixels-hint">
            Você pode adicionar múltiplos pixels do mesmo tipo ou de plataformas diferentes.
          </p>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-group-header">
          <span className="settings-group-icon">📡</span>
          <span className="settings-group-title">Pixels configurados</span>
        </div>
        <div className="settings-group-body">
          {list.length === 0 ? (
            <p className="admin-pixels-empty">Nenhum pixel configurado ainda.</p>
          ) : (
            <>
              <div className="admin-pixels-toolbar">
                <label className="admin-form-label" style={{ marginBottom: 6 }}>Buscar na lista</label>
                <input
                  type="search"
                  className="admin-form-input"
                  placeholder="ID, Meta, TikTok…"
                  value={pixelFilter}
                  onChange={(e) => setPixelFilter(e.target.value)}
                  style={{ marginBottom: 0, maxWidth: 320 }}
                />
                <span className="admin-pixels-toolbar-meta">
                  {filteredRows.length === list.length
                    ? `${list.length} pixel(is)`
                    : `${filteredRows.length} de ${list.length} pixel(is)`}
                </span>
              </div>
              <div className="admin-pixels-table-wrap">
                <table className="admin-pixels-table">
                  <thead>
                    <tr>
                      <th scope="col">Plataforma</th>
                      <th scope="col">ID do pixel</th>
                      <th scope="col">Ativo</th>
                      <th scope="col" className="admin-pixels-table__actions">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((px) => (
                      <tr
                        key={px.id}
                        className={`admin-pixels-table__row${px.active ? "" : " admin-pixels-table__row--dim"}`}
                      >
                        <td>
                          <span
                            className={
                              px.type === "facebook"
                                ? "admin-pixels-badge admin-pixels-badge--meta"
                                : "admin-pixels-badge admin-pixels-badge--tiktok"
                            }
                          >
                            {px.type === "facebook" ? "Meta" : "TikTok"}
                          </span>
                        </td>
                        <td>
                          <input
                            className="admin-form-input admin-pixels-table-input"
                            value={px.pixelId}
                            onChange={(e) => setPixelField(px.id, { pixelId: e.target.value })}
                            aria-label={`ID do pixel ${px.type}`}
                          />
                          {px.type === "facebook" && (
                            <details className="admin-pixels-capi-details">
                              <summary>Token CAPI (opcional)</summary>
                              <input
                                className="admin-form-input"
                                type="password"
                                autoComplete="new-password"
                                value={px.accessToken ?? ""}
                                onChange={(e) => setPixelField(px.id, { accessToken: e.target.value })}
                                placeholder="EAAB… (API de Conversões)"
                              />
                            </details>
                          )}
                        </td>
                        <td>
                          <label className="admin-toggle" title={px.active ? "Ativo" : "Inativo"}>
                            <input type="checkbox" checked={px.active} onChange={() => toggle(px.id)} />
                            <span className="admin-toggle-slider" />
                          </label>
                        </td>
                        <td className="admin-pixels-table__actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger admin-btn-sm"
                            onClick={() => remove(px.id)}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="settings-group" style={{ marginTop: 24 }}>
        <div className="settings-group-header">
          <span className="settings-group-icon">⚡</span>
          <span className="settings-group-title">Eventos no navegador (automáticos)</span>
        </div>
        <div className="settings-group-body">
          <p className="admin-pixels-events-intro">
            Estes eventos são disparados pelo JavaScript da loja (fbq / ttq). A API de Conversões é outra camada: envia os mesmos eventos do servidor da Meta, com melhor atribuição quando cookies são bloqueados.
          </p>
          <div className="admin-pixels-events">
            {[
              { event: "PageView",         desc: "Cada página visitada na loja" },
              { event: "ViewContent",      desc: "Página de produto visualizada" },
              { event: "AddToCart",        desc: "Produto adicionado ao carrinho" },
              { event: "InitiateCheckout", desc: "No carrinho ao continuar, ou ao abrir /checkout (sem duplicar)" },
              { event: "Purchase",         desc: "Pagamento PIX confirmado — 1 conversão; valor = total do pedido" },
            ].map(({ event, desc }) => (
              <div key={event} className="admin-pixels-event-row">
                <span className="admin-pixels-event-name">{event}</span>
                <span className="admin-pixels-event-desc">{desc}</span>
                <span className="admin-pixels-event-badge">✓ navegador</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {dirty && (
        <div className="admin-pixels-save-bar">
          <button
            className="admin-btn admin-btn-primary"
            onClick={() => { onSave(list); setDirty(false); }}
            disabled={saving}
          >
            {saving ? "Salvando..." : "💾 Salvar Pixels"}
          </button>
        </div>
      )}
    </div>
  );
}
