"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MasterLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="master-login-wrap">
      <div className="master-login-box">
        <div className="master-login-icon">⚡</div>
        <h1 className="master-login-title">Painel Master</h1>
        <p className="master-login-sub">Acesse o gerenciador de lojas</p>

        <form onSubmit={handleSubmit} className="master-login-form">
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
            {loading ? "Verificando..." : "Acessar"}
          </button>
        </form>
      </div>
    </div>
  );
}
