"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { cartTotal } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { useToast } from "@/components/ToastProvider";

interface CustomerForm {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

interface PixResponse {
  qr_code?: string;
  qr_code_base64?: string;
  code?: string;
  message?: string;
}

export default function CheckoutPage() {
  const { items, clear } = useCart();
  const { user } = useUser();
  const { showToast } = useToast();
  const total = cartTotal(items);

  const [form, setForm] = useState<CustomerForm>({
    name: user?.name || "",
    email: user?.email || "",
    cpf: "",
    phone: "",
  });

  const [pix, setPix] = useState<PixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isFormValid = form.name && form.email && form.cpf && form.phone;

  const handleGeneratePix = async () => {
    if (!isFormValid || items.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/pix/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          customer: form,
          items: items.map((i) => ({
            id: i.id,
            name: i.variation ? `${i.product.name} - ${i.variation}` : i.product.name,
            price: i.product.price,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao gerar Pix");
      setPix(data);
      showToast("QR Code Pix gerado! Escaneie para pagar.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao gerar Pix";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Código Pix copiado!");
  };

  if (items.length === 0 && !paid) {
    return (
      <div className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "3rem", marginBottom: "16px" }}>🛒</p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "12px" }}>
          Carrinho vazio
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          Adicione produtos antes de finalizar a compra.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--accent)",
            color: "var(--btn-text, white)",
            padding: "12px 24px",
            borderRadius: "var(--radius)",
            fontWeight: 600,
          }}
        >
          ← Voltar à Loja
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <nav className="breadcrumb">
          <Link href="/">Loja</Link>
          <span className="breadcrumb-sep">›</span>
          <span>Checkout</span>
        </nav>

        <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-1px", marginBottom: "28px" }}>
          Finalizar Compra
        </h1>

        <div className="checkout-layout">
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Customer Info */}
            <section className="checkout-section">
              <h2 className="checkout-section-title">
                <span className="step-num">1</span>
                Seus Dados
              </h2>
              <div className="form-grid">
                <div className="form-field span-2">
                  <label className="form-label" htmlFor="name">Nome Completo</label>
                  <input
                    id="name"
                    name="name"
                    className="form-input"
                    placeholder="João da Silva"
                    value={form.name}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="email">E-mail</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-input"
                    placeholder="joao@email.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="phone">Telefone</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="form-input"
                    placeholder="(11) 99999-9999"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-field span-2">
                  <label className="form-label" htmlFor="cpf">CPF</label>
                  <input
                    id="cpf"
                    name="cpf"
                    className="form-input"
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={handleChange}
                    maxLength={14}
                  />
                </div>
              </div>
            </section>

            {/* Pix Payment */}
            <section className="checkout-section">
              <h2 className="checkout-section-title">
                <span className="step-num">2</span>
                Pagamento via Pix
              </h2>

              <div className="pix-section">
                {!pix ? (
                  <>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                      Após confirmar seus dados, clique para gerar o QR Code Pix. O pagamento é aprovado instantaneamente.
                    </div>
                    <div style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      padding: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      textAlign: "left",
                      marginBottom: "16px"
                    }}>
                      <span style={{ fontSize: "1.8rem" }}>⚡</span>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>Pix — Pagamento Instantâneo</p>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          Aprovado 24h por dia, 7 dias por semana, incluindo feriados.
                        </p>
                      </div>
                    </div>
                    <button
                      id="generate-pix-btn"
                      className="pix-generate-btn"
                      onClick={handleGeneratePix}
                      disabled={!isFormValid || loading}
                    >
                      {loading ? (
                        <>⏳ Gerando QR Code...</>
                      ) : (
                        <>⚡ Gerar QR Code Pix — {formatPrice(total)}</>
                      )}
                    </button>
                    {!isFormValid && (
                      <p style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginTop: "8px" }}>
                        Preencha seus dados acima para continuar.
                      </p>
                    )}
                  </>
                ) : (
                  <div>
                    <p style={{ fontWeight: 700, color: "var(--success)", marginBottom: "16px" }}>
                      ✅ QR Code gerado! Escaneie com o app do seu banco.
                    </p>

                    {pix.qr_code_base64 ? (
                      <img
                        src={`data:image/png;base64,${pix.qr_code_base64}`}
                        alt="QR Code Pix"
                        style={{ width: 200, height: 200, margin: "0 auto", borderRadius: "var(--radius)" }}
                      />
                    ) : (
                      <div className="pix-qr-placeholder">
                        <span className="qr-icon">◼◻◼</span>
                        <span>QR Code Pix</span>
                      </div>
                    )}

                    {pix.qr_code && (
                      <div style={{ marginTop: "16px" }}>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                          Ou copie o código Pix Copia e Cola:
                        </p>
                        <div className="pix-code-box">{pix.qr_code}</div>
                        <button
                          onClick={() => copyToClipboard(pix.qr_code!)}
                          style={{
                            marginTop: 10,
                            width: "100%",
                            padding: "10px",
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--accent-bright)",
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            cursor: "pointer",
                          }}
                        >
                          📋 Copiar Código
                        </button>
                      </div>
                    )}

                    <div style={{
                      background: "rgba(16,185,129,0.08)",
                      border: "1px solid rgba(16,185,129,0.2)",
                      borderRadius: "var(--radius-sm)",
                      padding: "12px 16px",
                      marginTop: "16px",
                      fontSize: "0.82rem",
                      color: "var(--text-muted)"
                    }}>
                      ⏱️ <strong>Aguardando pagamento...</strong> Você receberá uma confirmação assim que o pagamento for processado.
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right: Order Summary */}
          <div className="order-summary">
            <h2 className="order-summary-title">📦 Resumo do Pedido</h2>

            {items.map((item) => (
              <div key={item.id} className="order-item">
                <div className="order-item-img">
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    width={52}
                    height={52}
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div className="order-item-info">
                  <p className="order-item-name">{item.product.name}</p>
                  {item.variation && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Opção: {item.variation}
                    </p>
                  )}
                  <p className="order-item-qty">Qtd: {item.quantity}</p>
                </div>
                <p className="order-item-price">
                  {formatPrice(item.product.price * item.quantity)}
                </p>
              </div>
            ))}

            <hr className="order-divider" />

            <div className="order-total-row">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="order-total-row">
              <span>Frete</span>
              <span style={{ color: "var(--success)" }}>Grátis</span>
            </div>
            <div className="order-total-row grand">
              <span>Total</span>
              <span className="amount">{formatPrice(total)}</span>
            </div>

            <div style={{
              marginTop: "20px",
              padding: "14px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.8rem",
              color: "var(--text-faint)",
              lineHeight: 1.7,
            }}>
              🔒 Compra 100% segura · Pix aprovado instantaneamente · Dados protegidos
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
