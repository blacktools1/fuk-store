"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { cartTotal } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { firePixelEvent } from "@/lib/pixel";
import { validateCPF, formatCPF, formatPhone, digitsOnly } from "@/lib/cpf";
import type { Orderbump } from "@/lib/admin-types";

interface CheckoutConfig {
  orderbumps?: Orderbump[];
  redirectUrl?: string;
  redirectEnabled?: boolean;
  backLink?: string;
  hasInternalCheckout?: boolean;
  checkoutTheme?: "theme1" | "theme2" | "theme3";
}

interface CustomerForm {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

interface AddressForm {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface PixResult {
  transactionId: string;
  qrCodeBase64: string;
  copyPaste: string;
  total: number;
}

type Stage = "form" | "pix" | "paid" | "error";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src", "sck"];

function readStoredUtms(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem("store_utms") || "{}");
  } catch {
    return {};
  }
}

export default function CheckoutPage() {
  const { items, clear } = useCart();
  const { user } = useUser();
  const total = cartTotal(items);

  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>("form");
  const [pixResult, setPixResult] = useState<PixResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [pollSeconds, setPollSeconds] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState<CustomerForm>({
    name: user?.name || "",
    email: user?.email || "",
    cpf: "",
    phone: "",
  });

  const [addr, setAddr] = useState<AddressForm>({
    cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  });
  const [cepLoading, setCepLoading] = useState(false);

  // Fetch checkout config
  useEffect(() => {
    fetch("/api/store/config")
      .then((r) => r.json())
      .then((cfg) => {
        setConfig((prev) => ({
          orderbumps: [],
          redirectUrl: "",
          redirectEnabled: true,
          ...prev,
          hasInternalCheckout: cfg.hasInternalCheckout,
        }));
      })
      .catch(() => {});

    fetch("/api/admin/checkout-config")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setConfig(d);
      })
      .catch(() => {});
  }, []);

  // Status polling
  useEffect(() => {
    if (stage !== "pix" || !pixResult) return;
    let seconds = 0;
    let utmifyFallbackSent = false; // garante envio único

    pollRef.current = setInterval(async () => {
      seconds += 3;
      setPollSeconds(seconds);
      if (seconds > 600) { clearInterval(pollRef.current!); return; }
      try {
        // Na primeira detecção de pagamento, inclui dados para fallback UTMify
        const fallback = (!utmifyFallbackSent && pixResult) ? {
          customerName:     form.name,
          customerEmail:    form.email,
          customerPhone:    form.phone,
          customerDocument: form.cpf,
          amount:           pixResult.total,
          utms:             readStoredUtms(),
          products:         items.map((i) => ({
            id:           String(i.product.id),
            name:         i.product.name,
            planId:       null,
            planName:     null,
            quantity:     i.quantity,
            priceInCents: Math.round(i.product.price * 100),
          })),
        } : undefined;

        const res = await fetch("/api/checkout/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: pixResult.transactionId,
            ...(fallback ? { utmifyFallback: fallback } : {}),
          }),
        });
        const data = await res.json();
        if (data.paid) {
          utmifyFallbackSent = true;
          clearInterval(pollRef.current!);
          try {
            firePixelEvent("Purchase", {
              content_ids: items.map((i) => String(i.product.id)),
              contents: items.map((i) => ({
                content_id: String(i.product.id),
                content_name: i.product.name,
                quantity: i.quantity,
                price: i.product.price,
              })),
              content_type: "product",
              value: pixResult.total,
              currency: "BRL",
            });
          } catch (_) {}
          setStage("paid");
          clear();
          if (data.redirectEnabled && data.redirectUrl) {
            setTimeout(() => { window.location.href = data.redirectUrl; }, 3000);
          }
        }
      } catch (_) {}
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [stage, pixResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "cpf") setForm((p) => ({ ...p, cpf: formatCPF(value) }));
    else if (name === "phone") setForm((p) => ({ ...p, phone: formatPhone(value) }));
    else setForm((p) => ({ ...p, [name]: value }));
  };

  const handleAddrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "cep") {
      const digits = value.replace(/\D/g, "").slice(0, 8);
      const formatted = digits.length > 5 ? digits.replace(/(\d{5})(\d)/, "$1-$2") : digits;
      setAddr((p) => ({ ...p, cep: formatted }));
      if (digits.length === 8) lookupCep(digits);
    } else {
      setAddr((p) => ({ ...p, [name]: value }));
    }
  };

  const lookupCep = async (digits: string) => {
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddr((p) => ({
          ...p,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        }));
      }
    } catch (_) {}
    setCepLoading(false);
  };

  const toggleBump = (id: string) => {
    setSelectedBumps((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const bumpTotal = (config?.orderbumps ?? [])
    .filter((ob) => ob.active && selectedBumps.includes(ob.id))
    .reduce((s, ob) => s + ob.price, 0);
  const grandTotal = total + bumpTotal;

  const isFormValid =
    form.name.trim().length >= 3 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    validateCPF(form.cpf) &&
    digitsOnly(form.phone).length >= 10;

  const handleGeneratePix = async () => {
    if (!isFormValid || items.length === 0) return;
    setLoading(true);
    setErrorMsg("");

    const cartItems = items.map((i) => ({
      id: i.product.id,
      name: i.variation ? `${i.product.name} — ${i.variation}` : i.product.name,
      price: i.product.price,
      qty: i.quantity,
    }));

    const utms = readStoredUtms();
    UTM_KEYS.forEach((k) => {
      if (!utms[k]) {
        const v = localStorage.getItem(`utmify_${k}`);
        if (v) utms[k] = v;
      }
    });

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: form.name,
            email: form.email,
            cpf: digitsOnly(form.cpf),
            phone: digitsOnly(form.phone),
          },
          cartItems,
          utms,
          selectedOrderbumps: selectedBumps,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar pagamento");
      setPixResult(data);
      setStage("pix");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!pixResult?.copyPaste) return;
    try {
      await navigator.clipboard.writeText(pixResult.copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {}
  };

  const theme = config?.checkoutTheme ?? "theme1";
  const activeOrderbumps = (config?.orderbumps ?? []).filter((ob) => ob.active);

  // ─────────────────────── EMPTY CART ───────────────────────────────────────
  if (items.length === 0 && stage === "form") {
    if (theme === "theme2") {
      return (
        <div className="co2-page">
          <div className="co2-header">PAGAMENTO 100% SEGURO</div>
          <div className="co2-body">
            <div className="co2-card" style={{ textAlign: "center", padding: "48px 24px" }}>
              <p style={{ fontSize: "3rem", marginBottom: 16 }}>🛒</p>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111827", marginBottom: 8 }}>Carrinho vazio</h1>
              <p style={{ color: "#6b7280", marginBottom: 24 }}>Adicione produtos antes de finalizar.</p>
              <Link href="/" className="co2-pay-btn" style={{ display: "inline-flex", textDecoration: "none" }}>← Voltar à Loja</Link>
            </div>
          </div>
        </div>
      );
    }
    if (theme === "theme3") {
      return (
        <div className="co3-page">
          <div className="co3-container" style={{ textAlign: "center", paddingTop: 80 }}>
            <p style={{ fontSize: "3rem", marginBottom: 16 }}>🛒</p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>Carrinho vazio</h1>
            <p style={{ color: "#94a3b8", marginBottom: 24 }}>Adicione produtos antes de finalizar.</p>
            <Link href="/" className="co3-btn">← Voltar à Loja</Link>
          </div>
        </div>
      );
    }
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "3rem", marginBottom: 16 }}>🛒</p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 12 }}>Carrinho vazio</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Adicione produtos antes de finalizar a compra.</p>
        <Link href="/" className="pix-back-btn">← Voltar à Loja</Link>
      </div>
    );
  }

  // ─────────────────────── PAID SCREEN ──────────────────────────────────────
  if (stage === "paid") {
    if (theme === "theme2") {
      return (
        <div className="co2-page">
          <div className="co2-header">PAGAMENTO 100% SEGURO</div>
          <div className="co2-body">
            <div className="co2-card" style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#dcfce7", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", margin: "0 auto 16px" }}>✓</div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#111827", marginBottom: 8 }}>Pagamento Confirmado!</h1>
              <p style={{ color: "#4b5563", lineHeight: 1.6 }}>Seu pedido foi recebido. Você receberá a confirmação por e-mail.</p>
              <Link href="/" className="co2-pay-btn" style={{ display: "inline-flex", marginTop: 24, textDecoration: "none" }}>Voltar à Loja</Link>
            </div>
          </div>
        </div>
      );
    }
    if (theme === "theme3") {
      return (
        <div className="co3-page">
          <div className="co3-container" style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(34,197,94,.15)", border: "2px solid #22c55e", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", margin: "0 auto 20px" }}>✓</div>
            <h1 style={{ fontSize: "1.7rem", fontWeight: 800, color: "#f8fafc", marginBottom: 12 }}>Pagamento Confirmado!</h1>
            <p style={{ color: "#94a3b8", lineHeight: 1.6, marginBottom: 28 }}>Seu pedido foi recebido com sucesso.</p>
            <Link href="/" className="co3-btn">Voltar à Loja</Link>
          </div>
        </div>
      );
    }
    return (
      <div className="pix-checkout-page">
        <div className="pix-checkout-container">
          <div className="pix-paid-screen">
            <div className="pix-paid-icon">✓</div>
            <h1>Pagamento Confirmado!</h1>
            <p>Seu pedido foi recebido com sucesso. Em breve você receberá a confirmação por e-mail.</p>
            <Link href="/" className="pix-back-btn" style={{ marginTop: 24, display: "inline-block" }}>Voltar à Loja</Link>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEMA 2 — Claro (clone fiel do PIX API)
  // ══════════════════════════════════════════════════════════════════════════
  if (theme === "theme2") {
    return (
      <div className="co2-page">
        <div className="co2-header">PAGAMENTO 100% SEGURO</div>

        <main className="co2-body">
          {/* Resumo do pedido */}
          <div className="co2-card">
            <p className="co2-summary-label">Resumo do seu pedido:</p>
            {items.map((item) => (
              <div key={item.id} className="co2-summary-row">
                {item.product.image && (
                  <div className="co2-summary-img">
                    <Image src={item.product.image} alt={item.product.name} fill sizes="48px" style={{ objectFit: "cover" }} />
                  </div>
                )}
                <div className="co2-summary-info">
                  <p className="co2-summary-name">
                    {item.product.name}
                    {item.variation && <span className="co2-summary-var"> — {item.variation}</span>}
                  </p>
                  {item.quantity > 1 && <p className="co2-summary-qty">Qtd: {item.quantity}</p>}
                </div>
                <p className="co2-summary-price">{formatPrice(item.product.price * item.quantity)}</p>
              </div>
            ))}
            <hr className="co2-divider" />
            <div className="co2-total-row">
              <span className="co2-total-label">Total:</span>
              <span className="co2-total-value">{formatPrice(grandTotal)}</span>
            </div>
          </div>

          {/* Identificação */}
          <div className="co2-card">
            <div className="co2-section-header">
              <div className="co2-section-icon">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h2 className="co2-section-title">Identifique-se</h2>
            </div>
            <div className="co2-form-stack">
              <div className="co2-fg">
                <label className="co2-label">Nome e sobrenome</label>
                <input name="name" className="co2-input" value={form.name} onChange={handleFormChange} placeholder="Nome e sobrenome" autoComplete="name" />
              </div>
              <div className="co2-fg">
                <label className="co2-label">CPF</label>
                <input name="cpf" className="co2-input" value={form.cpf} onChange={handleFormChange} placeholder="000.000.000-00" maxLength={14} />
                {form.cpf.length === 14 && !validateCPF(form.cpf) && <span className="co2-field-error">CPF inválido</span>}
              </div>
              <div className="co2-fg">
                <label className="co2-label">Telefone / WhatsApp</label>
                <input name="phone" type="tel" className="co2-input" value={form.phone} onChange={handleFormChange} placeholder="(21) 99999-9999" autoComplete="tel" />
              </div>
              <div className="co2-fg">
                <label className="co2-label">E-mail</label>
                <input name="email" type="email" className="co2-input" value={form.email} onChange={handleFormChange} placeholder="seu@email.com" autoComplete="email" />
              </div>
            </div>
          </div>

          {/* Endereço de Entrega */}
          <div className="co2-card">
            <div className="co2-section-header">
              <div className="co2-section-icon">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <h2 className="co2-section-title">Endereço de Entrega</h2>
            </div>
            <div className="co2-form-stack">
              <div className="co2-fg">
                <label className="co2-label">
                  CEP{cepLoading && <span style={{ fontSize: "0.73rem", color: "#9ca3af", marginLeft: 6 }}>buscando...</span>}
                </label>
                <input name="cep" className="co2-input" value={addr.cep} onChange={handleAddrChange} placeholder="00000-000" maxLength={9} autoComplete="postal-code" />
              </div>
              <div className="co2-fg">
                <label className="co2-label">Rua / Endereço</label>
                <input name="street" className="co2-input" value={addr.street} onChange={handleAddrChange} placeholder="Ex: Av. Paulista" autoComplete="street-address" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <div className="co2-fg">
                  <label className="co2-label">Número</label>
                  <input name="number" className="co2-input" value={addr.number} onChange={handleAddrChange} placeholder="123" />
                </div>
                <div className="co2-fg">
                  <label className="co2-label">Complemento</label>
                  <input name="complement" className="co2-input" value={addr.complement} onChange={handleAddrChange} placeholder="Apto, Casa..." />
                </div>
              </div>
              <div className="co2-fg">
                <label className="co2-label">Bairro</label>
                <input name="neighborhood" className="co2-input" value={addr.neighborhood} onChange={handleAddrChange} placeholder="Seu bairro" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div className="co2-fg">
                  <label className="co2-label">Cidade</label>
                  <input name="city" className="co2-input" value={addr.city} onChange={handleAddrChange} placeholder="Sua cidade" />
                </div>
                <div className="co2-fg">
                  <label className="co2-label">Estado</label>
                  <input name="state" className="co2-input" value={addr.state} onChange={handleAddrChange} placeholder="UF" maxLength={2} style={{ textTransform: "uppercase" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Order Bumps */}
          {activeOrderbumps.length > 0 && (
            <div className="co2-ob-card">
              <p className="co2-ob-title">🎁 Oferta especial para adicionar ao seu pedido:</p>
              {activeOrderbumps.map((ob) => (
                <div key={ob.id} className={`co2-ob-box${selectedBumps.includes(ob.id) ? " selected" : ""}`} onClick={() => toggleBump(ob.id)}>
                  <div style={{ flex: 1 }}>
                    <p className="co2-ob-name">{ob.title}</p>
                    {ob.description && <p className="co2-ob-desc">{ob.description}</p>}
                    <div className="co2-ob-value-row">
                      <span className="co2-ob-value-label">Por apenas</span>
                      <span className="co2-ob-value-amount">{formatPrice(ob.price)}</span>
                    </div>
                    <div className="co2-ob-btn-wrap">
                      <div className="co2-ob-check">{selectedBumps.includes(ob.id) ? "✓" : ""}</div>
                      <span className="co2-ob-btn-text">SIM! QUERO ADICIONAR</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagamento */}
          <div className="co2-card">
            <div className="co2-section-header">
              <div className="co2-section-icon">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 21z" />
                </svg>
              </div>
              <h2 className="co2-section-title">Pagamento</h2>
            </div>
            {errorMsg && <div className="co2-error-banner">{errorMsg}</div>}
            <button className="co2-pay-btn" onClick={handleGeneratePix} disabled={!isFormValid || loading || items.length === 0}>
              {loading
                ? <><span className="co2-loader" /><span>Gerando...</span></>
                : <span>PAGAR AGORA</span>
              }
            </button>
            <div className="co2-pix-badge">
              <svg className="co2-pix-icon" viewBox="0 0 258 258" fill="none">
                <path d="M129 258C200.24 258 258 200.24 258 129C258 57.76 200.24 0 129 0C57.76 0 0 57.76 0 129C0 200.24 57.76 258 129 258Z" fill="#32BCAD" />
                <path d="M136.291 149.337L153.375 132.228H174.19L143.513 162.905H168.083V184.225H89.9174V162.905H114.487L83.8099 132.228H104.625L129 156.618L153.375 132.228L129 107.837L104.625 132.228H83.8099L114.487 101.551H89.9174V80.2305H168.083V101.551H143.513L174.19 132.228L136.291 149.337Z" fill="white" />
              </svg>
              <span>Pagamento seguro via <strong>PIX</strong> com aprovação imediata.</span>
            </div>
          </div>

          <p className="co2-footer">© Ambiente seguro 🔒</p>
        </main>

        {/* PIX Modal Overlay (aparece ao gerar o PIX) */}
        {stage === "pix" && pixResult && (
          <div className="co2-modal-overlay">
            <div className="co2-modal-box">
              <div className="co2-modal-icon-wrap">
                <svg width="28" height="28" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="co2-modal-title">Pagamento Gerado!</h3>
              <p className="co2-modal-sub">Escaneie o QR Code ou copie o código abaixo</p>
              <p className="co2-modal-amount">💰 Valor: {formatPrice(pixResult.total)}</p>
              <div className="co2-qr-wrap">
                {pixResult.qrCodeBase64 ? (
                  <img src={`data:image/png;base64,${pixResult.qrCodeBase64}`} alt="QR Code PIX" className="co2-qr-img" />
                ) : (
                  <div className="co2-qr-fallback">QR Code não disponível</div>
                )}
              </div>
              <input
                type="text"
                className="co2-pix-code-input"
                readOnly
                value={pixResult.copyPaste}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button className="co2-copy-btn" onClick={copyCode}>
                {copied ? (
                  "✅ Copiado!"
                ) : (
                  <>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copiar Código PIX
                  </>
                )}
              </button>
              <p className="co2-modal-hint">
                Aguardando confirmação... ({Math.floor(pollSeconds / 60)}:{String(pollSeconds % 60).padStart(2, "0")})
              </p>
              <p className="co2-modal-note">Ao pagar, você receberá a confirmação imediatamente neste dispositivo.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEMA 3 — Escuro (Dark Minimal)
  // ══════════════════════════════════════════════════════════════════════════
  if (theme === "theme3") {
    return (
      <div className="co3-page">
        <div className="co3-container">
          {/* Resumo */}
          <div className="co3-card">
            <h3 className="co3-card-title">Resumo</h3>
            {items.map((item) => (
              <div key={item.id} className="co3-item">
                <div className="co3-item-img">
                  <Image src={item.product.image} alt={item.product.name} fill sizes="44px" style={{ objectFit: "cover" }} />
                </div>
                <div className="co3-item-info">
                  <p className="co3-item-name">{item.product.name}</p>
                  {item.variation && <p className="co3-item-var">{item.variation}</p>}
                  <p className="co3-item-qty">× {item.quantity}</p>
                </div>
                <span className="co3-item-price">{formatPrice(item.product.price * item.quantity)}</span>
              </div>
            ))}
            {bumpTotal > 0 && (
              <div className="co3-total-sub"><span>Add-ons</span><span>{formatPrice(bumpTotal)}</span></div>
            )}
            <div className="co3-total-final">
              <span>Total</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
          </div>

          {/* Dados do cliente */}
          <div className="co3-card">
            <h3 className="co3-card-title"><span className="co3-step">1</span>Seus Dados</h3>
            <div className="co3-form-stack">
              <div className="co3-fg">
                <label className="co3-label">Nome Completo</label>
                <input name="name" className="co3-input" value={form.name} onChange={handleFormChange} placeholder="João da Silva" autoComplete="name" />
              </div>
              <div className="co3-form-row">
                <div className="co3-fg">
                  <label className="co3-label">E-mail</label>
                  <input name="email" type="email" className="co3-input" value={form.email} onChange={handleFormChange} placeholder="seu@email.com" autoComplete="email" />
                </div>
                <div className="co3-fg">
                  <label className="co3-label">Telefone</label>
                  <input name="phone" type="tel" className="co3-input" value={form.phone} onChange={handleFormChange} placeholder="(11) 99999-9999" autoComplete="tel" />
                </div>
              </div>
              <div className="co3-fg">
                <label className="co3-label">CPF</label>
                <input name="cpf" className="co3-input" value={form.cpf} onChange={handleFormChange} placeholder="000.000.000-00" maxLength={14} />
                {form.cpf.length === 14 && !validateCPF(form.cpf) && <span className="co3-field-error">CPF inválido</span>}
              </div>
            </div>
          </div>

          {/* Order Bumps */}
          {activeOrderbumps.length > 0 && (
            <div className="co3-card">
              <h3 className="co3-card-title">🎁 Adicionar ao pedido</h3>
              {activeOrderbumps.map((ob) => (
                <label key={ob.id} className={`co3-ob-item${selectedBumps.includes(ob.id) ? " selected" : ""}`}>
                  <input type="checkbox" checked={selectedBumps.includes(ob.id)} onChange={() => toggleBump(ob.id)} style={{ display: "none" }} />
                  <div className="co3-ob-check">{selectedBumps.includes(ob.id) ? "✓" : "+"}</div>
                  <div className="co3-ob-info">
                    <p className="co3-ob-name">{ob.title}</p>
                    {ob.description && <p className="co3-ob-desc">{ob.description}</p>}
                  </div>
                  <span className="co3-ob-price">{formatPrice(ob.price)}</span>
                </label>
              ))}
            </div>
          )}

          {/* Pagamento */}
          {stage === "form" && (
            <div className="co3-card">
              <h3 className="co3-card-title"><span className="co3-step">2</span>Pagamento via PIX</h3>
              {errorMsg && <div className="co3-error-banner">{errorMsg}</div>}
              <button className="co3-btn" onClick={handleGeneratePix} disabled={!isFormValid || loading || items.length === 0}>
                {loading ? "Gerando QR Code..." : `Gerar QR Code PIX — ${formatPrice(grandTotal)}`}
              </button>
              {!isFormValid && <p className="co3-hint">Preencha todos os dados para continuar.</p>}
            </div>
          )}

          {stage === "pix" && pixResult && (
            <div className="co3-card">
              <h3 className="co3-card-title"><span className="co3-step">2</span>Escaneie o QR Code</h3>
              <div className="co3-qr-wrap">
                {pixResult.qrCodeBase64 ? (
                  <img src={`data:image/png;base64,${pixResult.qrCodeBase64}`} alt="QR Code PIX" className="co3-qr-img" />
                ) : (
                  <div className="co3-qr-fallback">QR Code indisponível</div>
                )}
              </div>
              <p className="co3-qr-hint">Abra o app do seu banco, escaneie o QR Code ou copie o código abaixo.</p>
              <div className="co3-copy-area">
                <div className="co3-copy-code">{pixResult.copyPaste}</div>
                <button className="co3-copy-btn" onClick={copyCode}>{copied ? "✓ Copiado!" : "Copiar Código"}</button>
              </div>
              <div className="co3-waiting">
                <span className="co3-waiting-dot" />
                Aguardando pagamento... ({Math.floor(pollSeconds / 60)}:{String(pollSeconds % 60).padStart(2, "0")})
              </div>
            </div>
          )}

          <div className="co3-security">
            <span>🔒 Pagamento 100% Seguro</span>
            <span>PIX · Aprovação Imediata</span>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TEMA 1 — Padrão (design atual, duas colunas)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="pix-checkout-page">
      <div className="pix-checkout-container">

        {/* Stepper */}
        <div className="cart-stepper" style={{ marginBottom: 32 }}>
          <div className="cart-step completed"><span className="cart-step-num">✓</span><span className="cart-step-label">Carrinho</span></div>
          <div className="cart-step-sep" />
          <div className={`cart-step ${(stage === "form" || stage === "pix") ? "active" : ""}`}>
            <span className="cart-step-num">2</span>
            <span className="cart-step-label">Pagamento</span>
          </div>
          <div className="cart-step-sep" />
          <div className={`cart-step ${stage === ("paid" as Stage) ? "active" : ""}`}>
            <span className="cart-step-num">3</span>
            <span className="cart-step-label">Conclusão</span>
          </div>
        </div>

        <div className="pix-checkout-grid">

          {/* Esquerda: Formulário / PIX */}
          <div className="pix-checkout-left">

            {stage === "form" && (
              <div className="pix-section-card">
                <h2 className="pix-section-title">
                  <span className="pix-step-badge">1</span>
                  Seus Dados
                </h2>
                <div className="pix-form-grid">
                  <div className="pix-field full">
                    <label>Nome Completo</label>
                    <input name="name" value={form.name} onChange={handleFormChange} placeholder="João da Silva" autoComplete="name" />
                  </div>
                  <div className="pix-field">
                    <label>E-mail</label>
                    <input name="email" type="email" value={form.email} onChange={handleFormChange} placeholder="joao@email.com" autoComplete="email" />
                  </div>
                  <div className="pix-field">
                    <label>Telefone</label>
                    <input name="phone" type="tel" value={form.phone} onChange={handleFormChange} placeholder="(11) 99999-9999" autoComplete="tel" />
                  </div>
                  <div className="pix-field full">
                    <label>CPF</label>
                    <input name="cpf" value={form.cpf} onChange={handleFormChange} placeholder="000.000.000-00" autoComplete="off" maxLength={14} />
                    {form.cpf.length === 14 && !validateCPF(form.cpf) && (
                      <span className="pix-field-error">CPF inválido</span>
                    )}
                  </div>
                </div>

                {errorMsg && <div className="pix-error-banner">{errorMsg}</div>}

                <button
                  className="pix-generate-btn"
                  onClick={handleGeneratePix}
                  disabled={!isFormValid || loading || items.length === 0}
                >
                  {loading ? "Gerando QR Code..." : `Gerar QR Code PIX — ${formatPrice(grandTotal)}`}
                </button>

                {!isFormValid && (
                  <p className="pix-form-hint">Preencha todos os dados corretamente para continuar.</p>
                )}
              </div>
            )}

            {stage === "pix" && pixResult && (
              <div className="pix-section-card">
                <h2 className="pix-section-title">
                  <span className="pix-step-badge">2</span>
                  Escaneie o QR Code
                </h2>

                <div className="pix-qr-wrapper">
                  {pixResult.qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${pixResult.qrCodeBase64}`}
                      alt="QR Code PIX"
                      className="pix-qr-img"
                    />
                  ) : (
                    <div className="pix-qr-placeholder">QR Code não disponível</div>
                  )}
                </div>

                <p className="pix-qr-hint">
                  Abra o app do seu banco e escaneie o QR Code acima, ou copie o código abaixo.
                </p>

                {pixResult.copyPaste && (
                  <div className="pix-copy-area">
                    <div className="pix-copy-code">{pixResult.copyPaste}</div>
                    <button className="pix-copy-btn" onClick={copyCode}>
                      {copied ? "Copiado!" : "Copiar Código"}
                    </button>
                  </div>
                )}

                <div className="pix-waiting-badge">
                  <span className="pix-waiting-dot" />
                  Aguardando pagamento... ({Math.floor(pollSeconds / 60)}:{String(pollSeconds % 60).padStart(2, "0")})
                </div>
              </div>
            )}
          </div>

          {/* Direita: Resumo do Pedido */}
          <aside className="pix-checkout-summary">
            <h3 className="pix-summary-title">Resumo do Pedido</h3>

            {items.map((item) => (
              <div key={item.id} className="pix-summary-item">
                <div className="pix-summary-img">
                  <Image src={item.product.image} alt={item.product.name} fill sizes="52px" style={{ objectFit: "cover" }} />
                </div>
                <div className="pix-summary-info">
                  <p className="pix-summary-name">
                    {item.product.name}
                    {item.variation && <span className="pix-summary-variation"> — {item.variation}</span>}
                  </p>
                  <p className="pix-summary-qty">Qtd: {item.quantity}</p>
                </div>
                <span className="pix-summary-price">{formatPrice(item.product.price * item.quantity)}</span>
              </div>
            ))}

            {activeOrderbumps.length > 0 && stage === "form" && (
              <div className="pix-orderbumps">
                <p className="pix-ob-title">Aproveite e adicione ao seu pedido:</p>
                {activeOrderbumps.map((ob) => (
                  <label key={ob.id} className={`pix-ob-item ${selectedBumps.includes(ob.id) ? "selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={selectedBumps.includes(ob.id)}
                      onChange={() => toggleBump(ob.id)}
                      style={{ display: "none" }}
                    />
                    <div className="pix-ob-check">{selectedBumps.includes(ob.id) ? "✓" : "+"}</div>
                    <div className="pix-ob-info">
                      <p className="pix-ob-name">{ob.title}</p>
                      {ob.description && <p className="pix-ob-desc">{ob.description}</p>}
                    </div>
                    <span className="pix-ob-price">{formatPrice(ob.price)}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="pix-summary-divider" />
            <div className="pix-summary-row"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
            {bumpTotal > 0 && (
              <div className="pix-summary-row"><span>Add-ons</span><span>{formatPrice(bumpTotal)}</span></div>
            )}
            <div className="pix-summary-row">
              <span>Frete</span>
              <span style={{ color: "var(--success)" }}>Grátis</span>
            </div>
            <div className="pix-summary-row grand">
              <span>Total</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>

            <div className="pix-security-badges">
              <span>Compra 100% Segura</span>
              <span>PIX · Aprovação Imediata</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
