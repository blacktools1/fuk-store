"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { cartCount } from "@/lib/cart";
import { useUser } from "@/context/UserContext";
import { useState } from "react";

interface HeaderProps {
  storeName: string;
  storeLogo: string;
  logoUrl?: string;
}

export default function Header({ storeName = "Minha Loja", storeLogo = "🛍️", logoUrl }: HeaderProps) {
  const { items, toggleCart } = useCart();
  const count = cartCount(items);
  
  const { user, login, logout } = useUser();
  const [showLogin, setShowLogin] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (formName && formEmail) {
      login(formName, formEmail);
      setShowLogin(false);
    }
  };

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Link href="/" className="header-logo" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {logoUrl ? (
              <Image src={logoUrl} alt={storeName} width={36} height={36} style={{ objectFit: "contain" }} />
            ) : (
              <span dangerouslySetInnerHTML={{ __html: storeLogo }} />
            )}
            <span>{storeName}</span>
          </Link>

          <nav className="header-actions">
            {user ? (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button 
                  className="cart-btn" 
                  style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}
                  onClick={logout}
                  title="Sair"
                >
                  <span style={{ fontSize: "1.2rem" }}>👤</span>
                  {user.name.split(" ")[0]}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLogin(true)} 
                className="cart-btn" 
                style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                👤 Entrar
              </button>
            )}

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

      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false); }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '32px', width: '100%', maxWidth: '400px', margin: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Identificação</h2>
              <button onClick={() => setShowLogin(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Insira seus dados para continuar suas compras e salvar suas preferências.
            </p>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Nome Completo *</label>
                <input type="text" className="form-input" value={formName} onChange={e => setFormName(e.target.value)} required placeholder="Ex: João da Silva" autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Email *</label>
                <input type="email" className="form-input" value={formEmail} onChange={e => setFormEmail(e.target.value)} required placeholder="joao@email.com" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', width: '100%' }}>Acessar Conta</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
