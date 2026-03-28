"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { StoreData, AdminProduct, Banner } from "@/lib/admin-types";
import { formatPrice } from "@/lib/products";

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
type Section = "dashboard" | "products" | "banners" | "settings";

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
  const activeBanners = data?.banners.filter((b) => b.active).length ?? 0;

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

      {/* ─── Sidebar ─── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-logo">🛍️ Minha Loja</span>
          <span className="admin-sidebar-sub">Painel Administrativo</span>
        </div>

        <nav className="admin-nav">
          <div className="admin-nav-section">
            <p className="admin-nav-section-title">Geral</p>
            {([
              { key: "dashboard", icon: "📊", label: "Dashboard" },
              { key: "products", icon: "📦", label: "Produtos" },
              { key: "banners", icon: "🖼️", label: "Banners" },
              { key: "settings", icon: "⚙️", label: "Configurações" },
            ] as { key: Section; icon: string; label: string }[]).map((item) => (
              <button
                key={item.key}
                id={`nav-${item.key}`}
                className={`admin-nav-link ${section === item.key ? "active" : ""}`}
                onClick={() => setSection(item.key)}
              >
                <span className="admin-nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="admin-nav-section">
            <p className="admin-nav-section-title">Links</p>
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
          <h1 className="admin-topbar-title">
            {section === "dashboard" && "Dashboard"}
            {section === "products" && "Gerenciar Produtos"}
            {section === "banners" && "Gerenciar Banners"}
            {section === "settings" && "Configurações da Loja"}
          </h1>
          <div className="admin-topbar-actions">
            <a href="/" target="_blank" className="admin-store-link">
              🌐 Ver Loja
            </a>
          </div>
        </div>

        <div className="admin-content">
          {/* ── Dashboard ── */}
          {section === "dashboard" && (
            <DashboardSection
              totalProducts={totalProducts}
              activeProducts={activeProducts}
              activeBanners={activeBanners}
              totalBanners={data?.banners.length ?? 0}
            />
          )}

          {/* ── Products ── */}
          {section === "products" && data && (
            <ProductsSection
              products={data.products}
              onToggle={toggleProduct}
              onDelete={deleteProduct}
              onEdit={(p) => setProductModal({ open: true, product: p })}
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
          )}

          {/* ── Banners ── */}
          {section === "banners" && data && (
            <BannersSection
              banners={data.banners}
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
}: {
  totalProducts: number;
  activeProducts: number;
  activeBanners: number;
  totalBanners: number;
}) {
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
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-icon">⚡</span>
          <div className="admin-stat-value">{activeBanners}</div>
          <div className="admin-stat-label">Banners Ativos</div>
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
            <span style={{ fontSize: "1.2rem" }}>⚙️</span>
            <span>Atualize o nome e URL da sua API Pix em <strong style={{ color: "var(--adm-text)" }}>Configurações</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.2rem" }}>💳</span>
            <span>O checkout soma <strong style={{ color: "var(--adm-text)" }}>todos os itens do carrinho</strong> e envia o total ao PHP Pix API</span>
          </div>
        </div>
      </div>
    </>
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
}: {
  products: AdminProduct[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (p: AdminProduct) => void;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
        <button className="admin-btn admin-btn-primary" onClick={onAdd} id="add-product-btn">
          + Novo Produto
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
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
                <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--adm-text-faint)" }}>
                  Nenhum produto encontrado
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id}>
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

// ─────────────────────────────────────────────────────────────
// Banners Section
// ─────────────────────────────────────────────────────────────
function BannersSection({
  banners,
  onToggle,
  onDelete,
  onEdit,
  onAdd,
}: {
  banners: Banner[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (b: Banner) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Banners ({banners.length})</h2>
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
  const [logoUrl, setLogoUrl] = useState(data.logoUrl || "");
  const [primaryColor, setPrimaryColor] = useState(data.primaryColor || "#8b5cf6");
  const [secondaryColor, setSecondaryColor] = useState(data.secondaryColor || "#ec4899");
  const [tertiaryColor, setTertiaryColor] = useState(data.tertiaryColor || "#0a0a0f");
  const [headerColor, setHeaderColor] = useState(data.headerColor || "#0a0a0f");
  const [titleColor, setTitleColor] = useState(data.titleColor || "#ffffff");
  const [textColor, setTextColor] = useState(data.textColor || "#9ca3af");
  const [priceColor, setPriceColor] = useState(data.priceColor || "#ffffff");
  const [btnTextColor, setBtnTextColor] = useState(data.btnTextColor || "#ffffff");
  const [borderRadius, setBorderRadius] = useState(data.borderRadius || "14px");

  return (
    <div className="admin-card" style={{ maxWidth: 800 }}>
      <h2 className="admin-card-title">Configurações e Personalização</h2>

      <div style={{ padding: "16px", borderRadius: "12px", background: "var(--adm-bg-elevated)", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", fontWeight: "600", color: "var(--accent-bright)" }}>1. Informações Básicas</h3>
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
            <label className="admin-form-label">Emoji Substitutito (ex: 🛍️)</label>
            <input className="admin-form-input" value={logo} onChange={(e) => setLogo(e.target.value)} />
          </div>
          <div className="admin-form-field span-2">
            <label className="admin-form-label">URL da Logo (Imagem Principal)</label>
            <input className="admin-form-input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://exemplo.com/sua-logo.png" />
            {logoUrl && (
              <img src={logoUrl} alt="Logo" style={{ marginTop: 8, height: 40, objectFit: "contain", borderRadius: 4, background: "rgba(255,255,255,0.1)", padding: 4 }} />
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", borderRadius: "12px", background: "var(--adm-bg-elevated)", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", fontWeight: "600", color: "var(--accent-bright)" }}>2. Estrutura e Fundos</h3>
        <div className="admin-form-grid">
          <div className="admin-form-field">
            <label className="admin-form-label">Cor do Fundo da Loja (Terciária)</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input className="admin-form-input" type="color" value={tertiaryColor} onChange={(e) => setTertiaryColor(e.target.value)} style={{ width: 60, padding: "2px", height: 40 }} />
              <span style={{ fontFamily: "monospace", color: "var(--adm-text-muted)" }}>{tertiaryColor}</span>
            </div>
          </div>
          <div className="admin-form-field">
            <label className="admin-form-label">Fundo do Cabeçalho (Navbar)</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input className="admin-form-input" type="color" value={headerColor} onChange={(e) => setHeaderColor(e.target.value)} style={{ width: 60, padding: "2px", height: 40 }} />
              <span style={{ fontFamily: "monospace", color: "var(--adm-text-muted)" }}>{headerColor}</span>
            </div>
          </div>
          <div className="admin-form-field span-2">
            <label className="admin-form-label">Arredondamento dos Cards (Bordas)</label>
            <select className="admin-form-select" value={borderRadius} onChange={(e) => setBorderRadius(e.target.value)}>
              <option value="0px">Retos (0px)</option>
              <option value="8px">Pouco Arredondados (8px)</option>
              <option value="14px">Arredondados (Padrão 14px)</option>
              <option value="24px">Bem Arredondados (24px)</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", borderRadius: "12px", background: "var(--adm-bg-elevated)", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", fontWeight: "600", color: "var(--accent-bright)" }}>3. Ações e Destaques</h3>
        <div className="admin-form-grid">
          <div className="admin-form-field">
            <label className="admin-form-label">Cor Principal (Botões e Hover)</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input className="admin-form-input" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ width: 60, padding: "2px", height: 40 }} />
              <span style={{ fontFamily: "monospace", color: "var(--adm-text-muted)" }}>{primaryColor}</span>
            </div>
          </div>
          <div className="admin-form-field">
            <label className="admin-form-label">Cor Secundária (Degradês)</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input className="admin-form-input" type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} style={{ width: 60, padding: "2px", height: 40 }} />
              <span style={{ fontFamily: "monospace", color: "var(--adm-text-muted)" }}>{secondaryColor}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", borderRadius: "12px", background: "var(--adm-bg-elevated)", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", fontWeight: "600", color: "var(--accent-bright)" }}>4. Fontes e Textos</h3>
        <div className="admin-form-grid">
          <div className="admin-form-field">
            <label className="admin-form-label">Cor dos Títulos Principais</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input className="admin-form-input" type="color" value={titleColor} onChange={(e) => setTitleColor(e.target.value)} style={{ width: 60, padding: "2px", height: 40 }} />
              <span style={{ fontFamily: "monospace", color: "var(--adm-text-muted)" }}>{titleColor}</span>
            </div>
          </div>
          <div className="admin-form-field">
            <label className="admin-form-label">Cor das Descrições</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input className="admin-form-input" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ width: 60, padding: "2px", height: 40 }} />
              <span style={{ fontFamily: "monospace", color: "var(--adm-text-muted)" }}>{textColor}</span>
            </div>
          </div>
          <div className="admin-form-field">
            <label className="admin-form-label">Cor dos Preços</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input className="admin-form-input" type="color" value={priceColor} onChange={(e) => setPriceColor(e.target.value)} style={{ width: 60, padding: "2px", height: 40 }} />
              <span style={{ fontFamily: "monospace", color: "var(--adm-text-muted)" }}>{priceColor}</span>
            </div>
          </div>
          <div className="admin-form-field">
            <label className="admin-form-label">Texto Dentro dos Botões</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input className="admin-form-input" type="color" value={btnTextColor} onChange={(e) => setBtnTextColor(e.target.value)} style={{ width: 60, padding: "2px", height: 40 }} />
              <span style={{ fontFamily: "monospace", color: "var(--adm-text-muted)" }}>{btnTextColor}</span>
            </div>
          </div>
        </div>
      </div>

      <hr className="admin-divider" />

      <div style={{ background: "var(--adm-bg-elevated)", borderRadius: "10px", padding: "16px", fontSize: "0.875rem" }}>
        <p style={{ fontWeight: 700, marginBottom: "10px" }}>🔌 Integração Pix PHP</p>
        <p style={{ color: "var(--adm-text-muted)", fontSize: "0.82rem", marginBottom: "8px" }}>
          Configure a URL do PHP no arquivo <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: "4px" }}>.env.local</code>:
        </p>
        <pre style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px", fontSize: "0.78rem", color: "#a78bfa", overflow:"auto" }}>
{`PHP_PIX_URL=http://localhost:8080/pix-widget.php?action=create-payment
PHP_PIX_STATUS_URL=http://localhost:8080/pix-widget.php?action=check-status`}
        </pre>
      </div>

      <div style={{ marginTop: "20px" }}>
        <button
          className="admin-btn admin-btn-primary"
          disabled={saving}
          onClick={() => onSave({ 
            storeName, storeTagline: tagline, storeLogo: logo, 
            logoUrl, primaryColor, secondaryColor, tertiaryColor, borderRadius,
            headerColor, titleColor, textColor, priceColor, btnTextColor
          })}
          id="save-settings-btn"
        >
          {saving ? "Salvando..." : "💾 Salvar Configurações"}
        </button>
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

  const set = (field: keyof AdminProduct, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.price <= 0) return;
    
    // Convert variations comma-separated string back to array if modified
    let finalVariations = typeof form.variations === 'string' 
      ? (form.variations as string).split(',').map(s => s.trim()).filter(Boolean)
      : form.variations;
      
    onSave({ ...form, variations: finalVariations });
  };

  // Convert array to string for the input field
  const variationsStr = Array.isArray(form.variations) ? form.variations.join(', ') : (form.variations || "");

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
              <label className="admin-form-label">Resumo</label>
              <textarea className="admin-form-textarea" value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
            </div>
            <div className="admin-form-field span-2">
              <label className="admin-form-label">Descrição Longa (Detalhes)</label>
              <textarea className="admin-form-textarea" value={form.longDescription || ""} onChange={(e) => set("longDescription", e.target.value)} rows={4} placeholder="Mais especificações e detalhes para a página do produto..." />
            </div>
            <div className="admin-form-field span-2">
              <label className="admin-form-label">Variações (Separadas por vírgula, ex: P, M, G ou Branco, Preto)</label>
              <input className="admin-form-input" value={variationsStr} onChange={(e) => set("variations", e.target.value)} placeholder="Deixe em branco se não houver" />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Preço (R$) *</label>
              <input className="admin-form-input" type="number" step="0.01" min="0" value={form.price} onChange={(e) => set("price", parseFloat(e.target.value))} required />
            </div>
            <div className="admin-form-field">
              <label className="admin-form-label">Estoque</label>
              <input className="admin-form-input" type="number" min="0" value={form.stock} onChange={(e) => set("stock", parseInt(e.target.value))} />
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
            <div className="admin-form-field span-2">
              <label className="admin-form-label">URL da Imagem</label>
              <input className="admin-form-input" value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="/products/foto.jpg" />
              {form.image && (
                <img src={form.image} alt="preview" className="admin-img-preview" style={{ marginTop: "8px" }} />
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
