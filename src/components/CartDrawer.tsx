"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { cartCount, cartTotal } from "@/lib/cart";
import { formatPrice } from "@/lib/products";

export default function CartDrawer() {
  const { items, isOpen, closeCart, remove, update } = useCart();
  const count = cartCount(items);
  const total = cartTotal(items);

  return (
    <>
      {/* Overlay */}
      <div
        className={`cart-overlay ${isOpen ? "open" : ""}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`cart-drawer ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-label="Carrinho de compras"
        aria-modal="true"
      >
        {/* Header */}
        <div className="cart-drawer-header">
          <h2 className="cart-drawer-title">
            🛒 Carrinho
            <span className="cart-drawer-count">({count} {count === 1 ? "item" : "itens"})</span>
          </h2>
          <button className="cart-close-btn" onClick={closeCart} aria-label="Fechar carrinho">
            ✕
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛍️</div>
            <p className="cart-empty-title">Carrinho vazio</p>
            <p className="cart-empty-sub">Adicione produtos para começar a comprar</p>
          </div>
        ) : (
          <div className="cart-items">
            {items.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-img">
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    width={72}
                    height={72}
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div className="cart-item-info">
                  <p className="cart-item-name">{item.product.name}</p>
                  {item.variation && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Opção: {item.variation}
                    </p>
                  )}
                  <p className="cart-item-price">{formatPrice(item.product.price)} cada</p>
                  <div className="cart-item-controls">
                    <button
                      className="qty-btn"
                      onClick={() => update(item.id, item.quantity - 1)}
                      aria-label="Diminuir quantidade"
                    >
                      −
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => update(item.id, item.quantity + 1)}
                      aria-label="Aumentar quantidade"
                    >
                      +
                    </button>
                    <button
                      className="cart-item-remove"
                      onClick={() => remove(item.id)}
                      aria-label="Remover item"
                    >
                      remover
                    </button>
                  </div>
                </div>
                <div className="cart-item-subtotal">
                  {formatPrice(item.product.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-summary-row">
              <span>{count} {count === 1 ? "produto" : "produtos"}</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="cart-summary-row">
              <span>Frete</span>
              <span style={{ color: "var(--success)" }}>Grátis</span>
            </div>
            <div className="cart-summary-row total">
              <span>Total</span>
              <span className="cart-total-value">{formatPrice(total)}</span>
            </div>

            <Link
              href="/checkout"
              className="checkout-btn"
              onClick={closeCart}
              id="checkout-btn"
            >
              <span>Finalizar Compra</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            <div className="pix-badge">
              Pague com <span>⚡ Pix — Aprovação Instantânea</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
