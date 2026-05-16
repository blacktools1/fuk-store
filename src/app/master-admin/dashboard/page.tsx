"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

type TenantSummary = {
  domain: string;
  storeName: string;
  productCount: number;
  primaryColor: string;
};

export default function MasterDashboard() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setIsLocalhost(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  }, []);

  const fetchTenants = useCallback(async () => {
    const res = await fetch("/api/master-admin/tenants");
    if (res.status === 401) {
      router.replace("/master-admin/login");
      return;
    }
    const data = await res.json();
    setTenants(data);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const totalProducts = useMemo(
    () => tenants.reduce((sum, t) => sum + t.productCount, 0),
    [tenants]
  );

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.domain.toLowerCase().includes(q) ||
        t.storeName.toLowerCase().includes(q)
    );
  }, [tenants, search]);

  const handleLogout = async () => {
    await fetch("/api/master-admin/auth", { method: "DELETE" });
    router.replace("/master-admin/login");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);

    const res = await fetch("/api/master-admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: newDomain, storeName: newName || newDomain }),
    });

    setCreating(false);

    if (res.ok) {
      setShowCreate(false);
      setNewDomain("");
      setNewName("");
      fetchTenants();
    } else {
      const data = await res.json();
      setCreateError(data.message || "Erro ao criar loja");
    }
  };

  const handleDelete = async (domain: string) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir a loja "${domain}"?\n\nEssa ação é IRREVERSÍVEL e apagará todos os dados, produtos e configurações.`
      )
    )
      return;
    setDeletingId(domain);
    const encoded = encodeURIComponent(domain);
    await fetch(`/api/master-admin/tenants/${encoded}`, { method: "DELETE" });
    setDeletingId(null);
    fetchTenants();
  };

  const adminUrl = (domain: string) =>
    isLocalhost ? `/admin?__tenant=${encodeURIComponent(domain)}` : `https://${domain}/admin`;

  const storeUrl = (domain: string) =>
    isLocalhost ? `/?__tenant=${encodeURIComponent(domain)}` : `https://${domain}`;

  return (
    <div className="master-dash">
      <header className="master-topbar">
        <div className="master-topbar__brand">
          <span className="master-logo-mark" aria-hidden>
            M
          </span>
          <div>
            <h1 className="master-dash-title">Painel Master</h1>
            <p className="master-dash-sub">Gerencie todas as lojas da plataforma</p>
          </div>
        </div>
        <div className="master-dash-actions">
          <button type="button" className="master-btn-primary" onClick={() => setShowCreate(true)}>
            + Nova loja
          </button>
          <button type="button" className="master-btn-ghost" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      {isLocalhost && (
        <div className="master-dev-banner">
          <div>
            <strong>Modo desenvolvimento</strong> — Os links &quot;Abrir admin&quot; e &quot;Ver loja&quot; usam{" "}
            <code>?__tenant=</code> para simular o tenant no localhost. Para o tenant padrão:{" "}
            <a href="/?__tenant=__clear">/?__tenant=__clear</a>
          </div>
        </div>
      )}

      {showCreate && (
        <div
          className="master-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="master-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreate(false);
          }}
        >
          <div className="master-modal">
            <div className="master-modal__head">
              <h2 id="master-modal-title" className="master-modal-title">
                Nova loja
              </h2>
              <button
                type="button"
                className="master-modal__close"
                onClick={() => setShowCreate(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <div className="master-modal__body">
              <form onSubmit={handleCreate}>
                <div style={{ marginBottom: 16 }}>
                  <label className="master-label" htmlFor="master-new-domain">
                    Domínio *
                  </label>
                  <input
                    id="master-new-domain"
                    type="text"
                    className="master-input"
                    placeholder="ex: minhaloja.com.br"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    required
                    autoFocus
                  />
                  <p className="master-modal__hint">
                    O domínio que apontará para esta VPS (sem https://).
                  </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="master-label" htmlFor="master-new-name">
                    Nome da loja
                  </label>
                  <input
                    id="master-new-name"
                    type="text"
                    className="master-input"
                    placeholder="ex: Minha Loja Incrível"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                {createError && <p className="master-error">{createError}</p>}

                <div className="master-modal__actions">
                  <button type="button" className="master-btn-ghost" onClick={() => setShowCreate(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="master-btn-primary" disabled={creating}>
                    {creating ? "Criando…" : "Criar loja"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {!loading && tenants.length > 0 && (
        <div className="master-stats">
          <div className="master-stat-card">
            <div className="master-stat-card__label">Lojas</div>
            <div className="master-stat-card__value">{tenants.length}</div>
          </div>
          <div className="master-stat-card">
            <div className="master-stat-card__label">Produtos no total</div>
            <div className="master-stat-card__value">{totalProducts}</div>
          </div>
        </div>
      )}

      {!loading && tenants.length > 0 && (
        <div className="master-search">
          <div className="master-search__wrap">
            <svg className="master-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.2-4.2" />
            </svg>
            <input
              type="search"
              className="master-search__input"
              placeholder="Filtrar por nome ou domínio…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filtrar lojas"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="master-skeleton-block" aria-busy="true" aria-label="Carregando">
          <div className="master-skeleton master-skeleton--short" />
          <div className="master-skeleton" />
          <div className="master-skeleton master-skeleton--table" />
        </div>
      ) : tenants.length === 0 ? (
        <div className="master-empty">
          <p>Ainda não há lojas.</p>
          <p className="master-empty-hint">Crie a primeira loja para começar a configurar DNS e vitrine.</p>
          <button type="button" className="master-btn-primary" onClick={() => setShowCreate(true)}>
            Criar primeira loja
          </button>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="master-filter-empty">Nenhuma loja corresponde à pesquisa.</div>
      ) : (
        <div className="master-table-wrap">
          <table className="master-table">
            <thead>
              <tr>
                <th>Loja</th>
                <th>Domínio</th>
                <th>Produtos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((t) => (
                <tr key={t.domain}>
                  <td>
                    <div className="master-store-name">
                      <span className="master-store-dot" style={{ background: t.primaryColor }} />
                      {t.storeName}
                    </div>
                  </td>
                  <td>
                    <code className="master-domain">{t.domain}</code>
                  </td>
                  <td>
                    {t.productCount} produto{t.productCount !== 1 ? "s" : ""}
                  </td>
                  <td>
                    <div className="master-row-actions">
                      <a
                        href={adminUrl(t.domain)}
                        target={isLocalhost ? "_self" : "_blank"}
                        rel="noopener noreferrer"
                        className="master-btn-sm"
                      >
                        Abrir admin
                      </a>
                      <a
                        href={storeUrl(t.domain)}
                        target={isLocalhost ? "_self" : "_blank"}
                        rel="noopener noreferrer"
                        className="master-btn-sm master-btn-sm--ghost"
                      >
                        Ver loja
                      </a>
                      <button
                        type="button"
                        className="master-btn-sm master-btn-sm--danger"
                        onClick={() => handleDelete(t.domain)}
                        disabled={deletingId === t.domain}
                      >
                        {deletingId === t.domain ? "…" : "Excluir"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="master-info-box">
        <span className="master-info-box__title">Como adicionar uma loja</span>
        <ol>
          <li>
            Use <strong>+ Nova loja</strong> e indique o domínio (ex: <code>loja1.com.br</code>)
          </li>
          <li>
            No DNS do domínio, aponte um registo <strong>A</strong> para o IP desta VPS
          </li>
          <li>
            Abra <code>https://seudominio.com/admin</code> para personalizar a loja
          </li>
        </ol>
      </div>
    </div>
  );
}
