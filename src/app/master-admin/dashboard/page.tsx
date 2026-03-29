"use client";

import { useState, useEffect, useCallback } from "react";
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

  const fetchTenants = useCallback(async () => {
    const res = await fetch("/api/master-admin/tenants");
    if (res.status === 401) { router.replace("/master-admin/login"); return; }
    const data = await res.json();
    setTenants(data);
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

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
    if (!confirm(`Tem certeza que deseja excluir a loja "${domain}"?\n\nEssa ação é IRREVERSÍVEL e apagará todos os dados, produtos e configurações.`)) return;
    setDeletingId(domain);
    const encoded = encodeURIComponent(domain);
    await fetch(`/api/master-admin/tenants/${encoded}`, { method: "DELETE" });
    setDeletingId(null);
    fetchTenants();
  };

  return (
    <div className="master-dash">
      {/* Header */}
      <div className="master-dash-header">
        <div>
          <h1 className="master-dash-title">⚡ Painel Master</h1>
          <p className="master-dash-sub">{tenants.length} loja{tenants.length !== 1 ? "s" : ""} ativa{tenants.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="master-dash-actions">
          <button className="master-btn-primary" onClick={() => setShowCreate(true)}>
            + Nova Loja
          </button>
          <button className="master-btn-ghost" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </div>

      {/* Modal Criar Loja */}
      {showCreate && (
        <div className="master-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="master-modal">
            <h2 className="master-modal-title">Nova Loja</h2>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="master-label">Domínio *</label>
                <input
                  type="text"
                  className="master-input"
                  placeholder="ex: minhaloja.com.br"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  required
                  autoFocus
                />
                <p style={{ fontSize: "0.75rem", color: "#888", marginTop: 4 }}>
                  Deve ser exatamente o domínio que será apontado para esta VPS (sem https://).
                </p>
              </div>

              <div>
                <label className="master-label">Nome da Loja</label>
                <input
                  type="text"
                  className="master-input"
                  placeholder="ex: Minha Loja Incrível"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              {createError && <p className="master-error">{createError}</p>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" className="master-btn-ghost" onClick={() => setShowCreate(false)}>
                  Cancelar
                </button>
                <button type="submit" className="master-btn-primary" disabled={creating}>
                  {creating ? "Criando..." : "Criar Loja"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabela de lojas */}
      {loading ? (
        <div className="master-loading">Carregando lojas...</div>
      ) : tenants.length === 0 ? (
        <div className="master-empty">
          <p>Nenhuma loja cadastrada.</p>
          <button className="master-btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
            Criar primeira loja
          </button>
        </div>
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
              {tenants.map((t) => (
                <tr key={t.domain}>
                  <td>
                    <div className="master-store-name">
                      <span
                        className="master-store-dot"
                        style={{ background: t.primaryColor }}
                      />
                      {t.storeName}
                    </div>
                  </td>
                  <td>
                    <code className="master-domain">{t.domain}</code>
                  </td>
                  <td>{t.productCount} produto{t.productCount !== 1 ? "s" : ""}</td>
                  <td>
                    <div className="master-row-actions">
                      <a
                        href={`https://${t.domain}/admin`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="master-btn-sm"
                      >
                        Abrir Admin
                      </a>
                      <a
                        href={`https://${t.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="master-btn-sm master-btn-sm--ghost"
                      >
                        Ver Loja
                      </a>
                      <button
                        className="master-btn-sm master-btn-sm--danger"
                        onClick={() => handleDelete(t.domain)}
                        disabled={deletingId === t.domain}
                      >
                        {deletingId === t.domain ? "..." : "Excluir"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info rápida */}
      <div className="master-info-box">
        <strong>Como adicionar uma nova loja:</strong>
        <ol>
          <li>Clique em <strong>+ Nova Loja</strong> e informe o domínio (ex: <code>loja1.com.br</code>)</li>
          <li>No provedor DNS do domínio, aponte um registro <strong>A</strong> para o IP desta VPS</li>
          <li>Acesse <code>https://loja1.com.br/admin</code> para personalizar a loja</li>
        </ol>
      </div>
    </div>
  );
}
