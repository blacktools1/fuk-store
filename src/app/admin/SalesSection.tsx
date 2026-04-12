"use client";

import { useEffect, useState, useMemo } from "react";
import type { SaleLogEntry } from "@/lib/sales-log";
import { formatCPF, formatPhone } from "@/lib/cpf";
import { formatPrice } from "@/lib/products";

function formatUtms(utms: Record<string, string>): string {
  const order = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src", "sck"];
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const k of order) {
    const v = utms[k];
    if (v) {
      parts.push(`${k}=${v}`);
      seen.add(k);
    }
  }
  for (const [k, v] of Object.entries(utms)) {
    if (!seen.has(k) && v) parts.push(`${k}=${v}`);
  }
  const s = parts.join(" · ");
  return s.length > 160 ? `${s.slice(0, 157)}…` : s;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface SalesSummary {
  orderCount: number;
  paidCount: number;
  pendingCount: number;
  revenueTotal: number;
  revenueMerchandise: number | null;
  revenueShipping: number | null;
  ordersWithBreakdown: number;
}

export function SalesSection() {
  const [range, setRange] = useState<"today" | "all">("today");
  const [status, setStatus] = useState<"all" | "paid" | "pending">("all");
  const [line, setLine] = useState("");
  const [rows, setRows] = useState<SaleLogEntry[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [lineOptions, setLineOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("range", range);
    p.set("status", status);
    if (line.trim()) p.set("line", line.trim());
    return p.toString();
  }, [range, status, line]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/sales?${query}`, { credentials: "include" })
      .then((r) => {
        if (r.status === 401) return null;
        return r.json();
      })
      .then((j) => {
        if (cancelled) return;
        if (j?.items && Array.isArray(j.items)) setRows(j.items);
        else setRows([]);
        if (j?.summary) setSummary(j.summary as SalesSummary);
        else setSummary(null);
        if (j?.lineOptions && Array.isArray(j.lineOptions)) setLineOptions(j.lineOptions);
        else setLineOptions([]);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setSummary(null);
          setLineOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const breakdownNote =
    summary &&
    summary.orderCount > 0 &&
    summary.ordersWithBreakdown < summary.orderCount;

  return (
    <div className="admin-card">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div>
          <h2 className="admin-card-title" style={{ marginBottom: 0, paddingBottom: 0, border: "none" }}>
            Vendas
          </h2>
          {range === "today" && (
            <p style={{ margin: "8px 0 0", fontSize: "0.75rem", color: "var(--adm-text-faint)", maxWidth: "42ch", lineHeight: 1.45 }}>
              Totais no fuso <strong style={{ color: "var(--adm-text-muted)" }}>America/São_Paulo</strong>.
              Para bater com o card <strong>Faturamento de hoje</strong> no dashboard, use <strong>Hoje</strong> + status <strong>Pagos</strong>.
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.75rem", color: "var(--adm-text-faint)" }}>
            Período
            <select
              className="admin-form-input"
              value={range}
              onChange={(e) => {
                setRange(e.target.value as "today" | "all");
                setLine("");
              }}
              style={{ width: "auto", fontSize: "0.82rem", padding: "6px 10px", marginBottom: 0 }}
            >
              <option value="today">Hoje</option>
              <option value="all">Últimas 200</option>
            </select>
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.75rem", color: "var(--adm-text-faint)" }}>
            Status
            <select
              className="admin-form-input"
              value={status}
              onChange={(e) => setStatus(e.target.value as "all" | "paid" | "pending")}
              style={{ width: "auto", fontSize: "0.82rem", padding: "6px 10px", marginBottom: 0 }}
            >
              <option value="all">Todos</option>
              <option value="paid">Pagos</option>
              <option value="pending">Aguardando PIX</option>
            </select>
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.75rem", color: "var(--adm-text-faint)" }}>
            Produto / oferta
            <select
              className="admin-form-input"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              style={{ maxWidth: 220, fontSize: "0.82rem", padding: "6px 10px", marginBottom: 0 }}
            >
              <option value="">Todos</option>
              {lineOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {summary && summary.orderCount > 0 && (
        <div className="admin-sales-summary">
          <div className="admin-sales-stat">
            <span className="admin-sales-stat-label">Pedidos (filtro)</span>
            <span className="admin-sales-stat-value">{summary.orderCount}</span>
            <span className="admin-sales-stat-sub">
              {summary.paidCount} pago · {summary.pendingCount} pendente
            </span>
          </div>
          <div className="admin-sales-stat">
            <span className="admin-sales-stat-label">Faturamento total</span>
            <span className="admin-sales-stat-value">{formatPrice(summary.revenueTotal)}</span>
          </div>
          <div className="admin-sales-stat">
            <span className="admin-sales-stat-label">Produtos + ofertas</span>
            <span className="admin-sales-stat-value">
              {summary.revenueMerchandise != null ? formatPrice(summary.revenueMerchandise) : "—"}
            </span>
          </div>
          <div className="admin-sales-stat">
            <span className="admin-sales-stat-label">Frete</span>
            <span className="admin-sales-stat-value">
              {summary.revenueShipping != null ? formatPrice(summary.revenueShipping) : "—"}
            </span>
          </div>
        </div>
      )}

      {breakdownNote && (
        <p style={{ fontSize: "0.72rem", color: "var(--adm-text-faint)", margin: "0 0 14px", lineHeight: 1.45 }}>
          Parte dos pedidos é anterior ao detalhamento produtos/frete: totais à direita somam só pedidos com detalhe (
          {summary!.ordersWithBreakdown} de {summary!.orderCount}).
        </p>
      )}

      {loading ? (
        <p style={{ color: "var(--adm-text-muted)", fontSize: "0.88rem" }}>Carregando…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "var(--adm-text-faint)", fontSize: "0.88rem" }}>
          Nenhum pedido com estes filtros. Os registros aparecem ao gerar um PIX no checkout.
        </p>
      ) : (
        <div className="admin-sales-scroll">
          <table className="admin-sales-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Prod.+ofertas</th>
                <th>Frete</th>
                <th>Total</th>
                <th>UTMs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const hasBreak =
                  row.amountCart !== undefined && row.amountShipping !== undefined;
                const merch = hasBreak
                  ? (row.amountCart ?? 0) + (row.amountBumps ?? 0)
                  : null;
                const ship = hasBreak ? row.amountShipping : null;
                return (
                  <tr key={row.id}>
                    <td className="admin-sales-cell-muted">{formatWhen(row.createdAt)}</td>
                    <td>
                      <div className="admin-sales-name">{row.customer.name || "—"}</div>
                      <div className="admin-sales-sub">{row.customer.email || "—"}</div>
                      <div className="admin-sales-sub">
                        {row.customer.phone ? formatPhone(row.customer.phone) : "—"} ·{" "}
                        {row.customer.document ? formatCPF(row.customer.document) : "—"}
                      </div>
                    </td>
                    <td>
                      {row.status === "paid" ? (
                        <span className="admin-sales-badge admin-sales-badge--paid">Pago</span>
                      ) : (
                        <span className="admin-sales-badge admin-sales-badge--wait">Aguardando PIX</span>
                      )}
                    </td>
                    <td className="admin-sales-cell-num">
                      {merch != null ? formatPrice(merch) : "—"}
                    </td>
                    <td className="admin-sales-cell-num">
                      {ship == null
                        ? "—"
                        : ship === 0
                          ? <span style={{ color: "var(--adm-text-faint)" }}>Grátis</span>
                          : formatPrice(ship)}
                    </td>
                    <td className="admin-sales-cell-num admin-sales-cell-strong">
                      {formatPrice(row.amount)}
                    </td>
                    <td className="admin-sales-utm" title={formatUtms(row.utms)}>
                      {Object.keys(row.utms || {}).length ? formatUtms(row.utms) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
