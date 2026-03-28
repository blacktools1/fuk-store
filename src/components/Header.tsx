"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { cartCount } from "@/lib/cart";
import { STORE_CONFIG } from "@/lib/products";

export default function Header() {
  const { items, toggleCart } = useCart();
  const count = cartCount(items);

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="header-logo">
          <span>{STORE_CONFIG.logo}</span>
          {STORE_CONFIG.name}
        </Link>

        <nav className="header-actions">
          <button
            id="cart-toggle-btn"
            className="cart-btn"
            onClick={toggleCart}
            aria-label={`Carrinho com ${count} itens`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Carrinho
            {count > 0 && (
              <span className="cart-badge" key={count}>{count}</span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
