"use client";

import { useCart } from "@/context/CartContext";
import { cartCount } from "@/lib/cart";
import { useUser } from "@/context/UserContext";
import { useState, useEffect } from "react";

function IconBag() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

type Tab = "login" | "register";

export default function HeaderActions() {
  const { items, toggleCart } = useCart();
  const { user, login, logout } = useUser();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const count = mounted ? cartCount(items) : 0;
  const isLoggedIn = mounted && !!user;

  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<Tab>("login");
  const [success, setSuccess] = useState(false);
  const [successName, setSuccessName] = useState("");

  // campos login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // campos cadastro
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPass2, setRegPass2] = useState("");
  const [regError, setRegError] = useState("");

  const openModal = (defaultTab: Tab = "login") => {
    setTab(defaultTab);
    setSuccess(false);
    setLoginEmail(""); setLoginPass("");
    setRegName(""); setRegEmail(""); setRegPass(""); setRegPass2(""); setRegError("");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setSuccess(false); };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Extrai nome do e-mail como fallback se não houver nome salvo
    const name = loginEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    login(name, loginEmail);
    setSuccessName(name);
    setSuccess(true);
    setTimeout(closeModal, 1800);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (regPass !== regPass2) { setRegError("As senhas não coincidem."); return; }
    if (regPass.length < 6) { setRegError("A senha deve ter pelo menos 6 caracteres."); return; }
    login(regName, regEmail);
    setSuccessName(regName);
    setSuccess(true);
    setTimeout(closeModal, 1800);
  };

  const navBtnStyle: React.CSSProperties = {
    background: "none", border: "none", outline: "none",
    cursor: "pointer", padding: 0, display: "flex",
    alignItems: "center", justifyContent: "center",
    width: 38, height: 38, borderRadius: "50%",
    color: "var(--text-muted)", transition: "color 0.18s ease",
    flexShrink: 0,
  };

  return (
    <>
      <nav className="header-actions">
        {isLoggedIn ? (
          <div className="nav-user-menu" onMouseLeave={() => setShowDropdown(false)}>
            <button
              className="nav-user-btn"
              onClick={() => setShowDropdown((v) => !v)}
              title={user!.name}
            >
              <IconUser />
              <span className="nav-user-name">{user!.name.split(" ")[0]}</span>
              <IconChevron />
            </button>

            {showDropdown && (
              <div className="nav-user-dropdown">
                <p className="nav-user-greeting">Olá, {user!.name.split(" ")[0]}! 👋</p>
                <p className="nav-user-email">{user!.email ?? ""}</p>
                <hr className="nav-user-sep" />
                <button
                  className="nav-user-logout"
                  onClick={() => { logout(); setShowDropdown(false); }}
                >
                  <IconLogout /> Sair da conta
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => openModal("login")}
            title="Entrar / Criar conta"
            style={navBtnStyle}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <IconUser />
          </button>
        )}

        <button
          id="cart-toggle-btn"
          onClick={toggleCart}
          aria-label={`Carrinho com ${count} itens`}
          style={{ ...navBtnStyle, color: "var(--accent-bright)", position: "relative" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--accent-bright)")}
        >
          <IconBag />
          {count > 0 && <span className="cart-badge" key={count}>{count}</span>}
        </button>
      </nav>

      {/* ── Modal de Login / Criar Conta ── */}
      {showModal && (
        <div className="auth-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="auth-modal">
            {/* Fechar */}
            <button className="auth-close" onClick={closeModal}>✕</button>

            {success ? (
              /* ── Tela de sucesso ── */
              <div className="auth-success">
                <span style={{ color: "var(--accent)" }}><IconCheck /></span>
                <h2>Bem-vindo, {successName.split(" ")[0]}!</h2>
                <p>Sua conta está ativa. Boas compras! 🎉</p>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="auth-tabs">
                  <button
                    className={`auth-tab ${tab === "login" ? "active" : ""}`}
                    onClick={() => setTab("login")}
                  >
                    Entrar
                  </button>
                  <button
                    className={`auth-tab ${tab === "register" ? "active" : ""}`}
                    onClick={() => setTab("register")}
                  >
                    Criar Conta
                  </button>
                </div>

                {/* ── Formulário Login ── */}
                {tab === "login" && (
                  <form onSubmit={handleLogin} className="auth-form">
                    <p className="auth-subtitle">Acesse sua conta para continuar.</p>

                    <div className="auth-field">
                      <label>E-mail *</label>
                      <input
                        type="email"
                        className="form-input"
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        required
                        placeholder="seu@email.com"
                        autoFocus
                      />
                    </div>

                    <div className="auth-field">
                      <label>Senha *</label>
                      <input
                        type="password"
                        className="form-input"
                        value={loginPass}
                        onChange={e => setLoginPass(e.target.value)}
                        required
                        placeholder="••••••••"
                        minLength={1}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit">
                      Entrar
                    </button>

                    <p className="auth-switch">
                      Não tem conta?{" "}
                      <button type="button" onClick={() => setTab("register")}>
                        Criar agora
                      </button>
                    </p>
                  </form>
                )}

                {/* ── Formulário Cadastro ── */}
                {tab === "register" && (
                  <form onSubmit={handleRegister} className="auth-form">
                    <p className="auth-subtitle">Crie sua conta gratuitamente.</p>

                    <div className="auth-field">
                      <label>Nome Completo *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        required
                        placeholder="Ex: João da Silva"
                        autoFocus
                      />
                    </div>

                    <div className="auth-field">
                      <label>E-mail *</label>
                      <input
                        type="email"
                        className="form-input"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        required
                        placeholder="seu@email.com"
                      />
                    </div>

                    <div className="auth-field">
                      <label>Senha *</label>
                      <input
                        type="password"
                        className="form-input"
                        value={regPass}
                        onChange={e => setRegPass(e.target.value)}
                        required
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                      />
                    </div>

                    <div className="auth-field">
                      <label>Confirmar Senha *</label>
                      <input
                        type="password"
                        className="form-input"
                        value={regPass2}
                        onChange={e => setRegPass2(e.target.value)}
                        required
                        placeholder="Repita a senha"
                      />
                    </div>

                    {regError && <p className="auth-error">{regError}</p>}

                    <button type="submit" className="btn btn-primary auth-submit">
                      Criar Conta
                    </button>

                    <p className="auth-switch">
                      Já tem conta?{" "}
                      <button type="button" onClick={() => setTab("login")}>
                        Entrar
                      </button>
                    </p>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
