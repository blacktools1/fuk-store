"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { cartCount, cartTotal } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { buildExternalCheckoutUrl } from "@/lib/checkout-redirect";

export default function CartPage() {
  const { items, remove, update, clear } = useCart();
  const count = cartCount(items);
  const total = cartTotal(items);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [freeShippingMin, setFreeShippingMin] = useState(199);
  useEffect(() => {
    fetch("/api/store/config")
      .then((r) => r.json())
      .then((cfg) => {
        setCheckoutUrl(cfg.checkoutUrl || "");
        setFreeShippingMin(cfg.freeShippingMin ?? 199);
      })
      .catch(() => {});
  }, []);

  function handleProceed() {
    const lines = items.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      qty: item.quantity,
      price: item.product.price,
      ...(item.product.oldPrice ? { oldPrice: item.product.oldPrice } : {}),
      image: item.product.image,
    }));
    if (checkoutUrl.trim()) {
      // O PHP checkout busca os pixel IDs diretamente da API da loja via cURL
      // (STORE_BASE_URL + /api/store/config) — não precisa passar pela URL.
      window.location.href = buildExternalCheckoutUrl(checkoutUrl, lines);
    } else {
      window.location.href = "/checkout";
    }
  }

  const freeShipping = total >= freeShippingMin;
  const remaining = freeShippingMin - total;
  // Parcelas (ex: 10x)
  const installments = Math.min(10, Math.max(1, Math.floor(total / 10)));
  const installmentValue = total / installments;

  return (
    <div className="cart-page">
      <div className="container">

        {/* Stepper */}
        <div className="cart-stepper">
          <div className="cart-step active">
            <span className="cart-step-num">1</span>
            <span className="cart-step-label">Carrinho</span>
          </div>
          <div className="cart-step-sep" />
          <div className="cart-step">
            <span className="cart-step-num">2</span>
            <span className="cart-step-label">Pagamento</span>
          </div>
          <div className="cart-step-sep" />
          <div className="cart-step">
            <span className="cart-step-num">3</span>
            <span className="cart-step-label">Conclusão</span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="cart-page-empty">
            <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>🛒</div>
            <h2>Seu carrinho está vazio</h2>
            <p>Adicione produtos para continuar</p>
            <Link href="/" className="cart-page-continue-btn">← Voltar para a loja</Link>
          </div>
        ) : (
          <div className="cart-page-layout">

            {/* Tabela de produtos */}
            <div className="cart-page-main">

              {/* Frete grátis */}
              {!freeShipping && (
                <div className="cart-free-shipping-bar">
                  <div className="cart-free-label">
                    <span className="cart-free-label-text">
                      Faltam <strong>{formatPrice(remaining)}</strong> para frete grátis
                    </span>
                    <span className="cart-free-label-pct">
                      {Math.round((total / freeShippingMin) * 100)}%
                    </span>
                  </div>
                  <div className="cart-free-progress">
                    <div className="cart-free-progress-fill" style={{ width: `${Math.min((total / freeShippingMin) * 100, 100)}%` }} />
                  </div>
                </div>
              )}
              {freeShipping && (
                <div className="cart-free-shipping-bar success">
                  <div className="cart-free-success-text">
                    Frete grátis desbloqueado —{" "}
                    <span>seu pedido qualifica para entrega gratuita.</span>
                  </div>
                </div>
              )}

              {/* Itens */}
              <div className="cart-page-items">
                {items.map((item) => {
                  const lineTotal = item.product.price * item.quantity;
                  return (
                    <div key={item.id} className="cart-page-row">
                      {/* Imagem */}
                      <div className="cart-row-img">
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          fill
                          sizes="100px"
                          style={{ objectFit: "cover" }}
                        />
                      </div>

                      {/* Info: nome + preço */}
                      <div className="cart-row-info">
                        <Link href={`/product/${item.product.id}`} className="cart-row-name-link">
                          {item.product.name}
                        </Link>
                        {item.variation && (
                          <span className="cart-row-variation">Variação: {item.variation}</span>
                        )}
                        <div className="cart-row-prices">
                          {item.product.oldPrice && item.product.oldPrice > item.product.price && (
                            <span className="cart-row-old">{formatPrice(item.product.oldPrice)}</span>
                          )}
                          <span className="cart-row-price-current">{formatPrice(item.product.price)}</span>
                        </div>
                      </div>

                      {/* Qty + Subtotal */}
                      <div className="cart-row-right">
                        <span className="cart-row-subtotal">{formatPrice(lineTotal)}</span>
                        <div className="cart-row-qty">
                          <button onClick={() => update(item.id, item.quantity - 1)} className="qty-btn">−</button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                              const v = parseInt(e.target.value);
                              if (!isNaN(v) && v > 0) update(item.id, v);
                            }}
                            className="cart-qty-input"
                          />
                          <button onClick={() => update(item.id, item.quantity + 1)} className="qty-btn">+</button>
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        className="cart-row-remove"
                        onClick={() => remove(item.id)}
                        aria-label="Remover produto"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Ações inferiores */}
              <div className="cart-page-actions">
                <Link href="/" className="cart-action-btn secondary">
                  ← Continuar Comprando
                </Link>
                <button
                  className="cart-action-btn ghost"
                  onClick={() => {
                    if (confirm("Deseja limpar o carrinho?")) clear();
                  }}
                >
                  Limpar Carrinho
                </button>
              </div>
            </div>

            {/* Resumo */}
            <aside className="cart-page-summary">
              <h3 className="cart-summary-title">TOTAL NO CARRINHO</h3>

              <div className="cart-summary-line">
                <span>Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="cart-summary-line">
                <span>Frete</span>
                <span style={{ color: freeShipping ? "var(--success)" : "inherit" }}>
                  {freeShipping ? "Grátis" : `A partir de R$ 0,00`}
                </span>
              </div>
              <div className="cart-summary-divider" />
              <div className="cart-summary-line total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              {installments > 1 && (
                <p className="cart-summary-installments">
                  Em até {installments}x de {formatPrice(installmentValue)}
                </p>
              )}

              <button className="cart-checkout-btn" onClick={handleProceed}>
                CONTINUAR PARA FINALIZAÇÃO
              </button>

              <div className="cart-security-badges">
                <span>Compra 100% Segura</span>
                <span>PIX · Aprovação Imediata</span>
              </div>
            </aside>

          </div>
        )}
      </div>
    </div>
  );
}
