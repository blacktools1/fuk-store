"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tab = "login" | "register";

export default function MasterLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");

  // Login state
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Register state (visual only)
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regDone, setRegDone] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/master-admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.replace("/master-admin/dashboard");
    } else {
      const data = await res.json();
      setError(data.message || "Senha incorreta");
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Visual only — simulates account creation
    setRegDone(true);
    setTimeout(() => {
      setRegDone(false);
      setTab("login");
      setRegName("");
      setRegEmail("");
      setRegPassword("");
    }, 2200);
  };

  return (
    <div className="master-login-wrap">
      <div className="master-login-box">
        <div className="master-login-logo" aria-hidden>
          E
        </div>
        <h1 className="master-login-title">EcomFreedom</h1>
        <p className="master-login-sub">Gerencie suas lojas em um só lugar</p>

        {/* Tabs */}
        <div className="ml-tabs">
          <button
            className={`ml-tab${tab === "login" ? " active" : ""}`}
            onClick={() => { setTab("login"); setError(""); }}
            type="button"
          >
            Entrar
          </button>
          <button
            className={`ml-tab${tab === "register" ? " active" : ""}`}
            onClick={() => { setTab("register"); setError(""); }}
            type="button"
          >
            Criar Conta
          </button>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="master-login-form">
            <input
              type="password"
              className="master-input"
              placeholder="Senha master"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
            {error && <p className="master-error">{error}</p>}
            <button type="submit" className="master-btn-primary" disabled={loading}>
              {loading ? "Verificando..." : "Acessar Painel"}
            </button>
            <Link href="/master-home" className="ml-back-link">← Voltar para o início</Link>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="master-login-form">
            {regDone ? (
              <div className="ml-success-msg">
                Conta criada. Redirecionando para o login…
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className="master-input"
                  placeholder="Seu nome"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  autoFocus
                />
                <input
                  type="email"
                  className="master-input"
                  placeholder="E-mail"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  className="master-input"
                  placeholder="Senha"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
                <button type="submit" className="master-btn-primary">
                  Criar conta
                </button>
                <Link href="/master-home" className="ml-back-link">← Voltar para o início</Link>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
