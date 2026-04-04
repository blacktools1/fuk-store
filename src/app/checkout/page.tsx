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
}

interface CustomerForm {
  name: string;
  email: string;
  cpf: string;
  phone: string;
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

  // Fetch checkout config
  useEffect(() => {
    fetch("/api/store/config")
      .then((r) => r.json())
      .then((cfg) => {
        setConfig({
          orderbumps: [],
          redirectUrl: "",
          redirectEnabled: true,
          hasInternalCheckout: cfg.hasInternalCheckout,
        });
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
    pollRef.current = setInterval(async () => {
      seconds += 3;
      setPollSeconds(seconds);
      if (seconds > 600) {
        clearInterval(pollRef.current!);
        return;
      }
      try {
        const res = await fetch("/api/checkout/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId: pixResult.transactionId }),
        });
        const data = await res.json();
        if (data.paid) {
          clearInterval(pollRef.current!);
          // Dispara Purchase pixel
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
            setTimeout(() => {
              window.location.href = data.redirectUrl;
            }, 3000);
          }
        }
      } catch (_) {}
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [stage, pixResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "cpf") {
      setForm((p) => ({ ...p, cpf: formatCPF(value) }));
    } else if (name === "phone") {
      setForm((p) => ({ ...p, phone: formatPhone(value) }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
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
    // Também tenta UTMify individual keys como fallback
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

  const copyCode = () => {
    if (!pixResult?.copyPaste) return;
    navigator.clipboard.writeText(pixResult.copyPaste).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // ── Empty cart
  if (items.length === 0 && stage === "form") {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "3rem", marginBottom: 16 }}>🛒</p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 12 }}>
          Carrinho vazio
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
          Adicione produtos antes de finalizar a compra.
        </p>
        <Link href="/" className="pix-back-btn">← Voltar à Loja</Link>
      </div>
    );
  }

  // ── Paid
  if (stage === "paid") {
    return (
      <div className="pix-checkout-page">
        <div className="pix-checkout-container">
          <div className="pix-paid-screen">
            <div className="pix-paid-icon">✓</div>
            <h1>Pagamento Confirmado!</h1>
            <p>Seu pedido foi recebido com sucesso. Em breve você receberá a confirmação por e-mail.</p>
            <Link href="/" className="pix-back-btn" style={{ marginTop: 24, display: "inline-block" }}>
              Voltar à Loja
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeOrdebumps = (config?.orderbumps ?? []).filter((ob) => ob.active);

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

          {/* ── Left: Form / PIX ── */}
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

                {errorMsg && (
                  <div className="pix-error-banner">{errorMsg}</div>
                )}

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

          {/* ── Right: Order Summary ── */}
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

            {/* Orderbumps */}
            {activeOrdebumps.length > 0 && stage === "form" && (
              <div className="pix-orderbumps">
                <p className="pix-ob-title">Aproveite e adicione ao seu pedido:</p>
                {activeOrdebumps.map((ob) => (
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

            <div className="pix-summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            {bumpTotal > 0 && (
              <div className="pix-summary-row">
                <span>Add-ons</span>
                <span>{formatPrice(bumpTotal)}</span>
              </div>
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
