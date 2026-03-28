"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/products";
import { useToast } from "@/components/ToastProvider";
import { AdminProduct } from "@/lib/admin-types";

// Mock user comments for the store
const MOCK_COMMENTS = [
  { name: "Carlos S.", rating: 5, date: "há 2 dias", text: "Produto excelente! Entrega super rápida via Pix. Recomendo muito." },
  { name: "Amanda M.", rating: 5, date: "há 1 semana", text: "Qualidade muito superior ao que eu esperava pelo preço. Perfeito!" },
  { name: "Roberto T.", rating: 4, date: "há 2 semanas", text: "Chegou certinho, bem embalado. Apenas a caixa que deu uma pequena amassada, mas o produto está 100%." },
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { add } = useCart();
  const { showToast } = useToast();
  
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<string>("");

  useEffect(() => {
    fetch(`/api/store/products/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: AdminProduct) => {
        setProduct(data);
        if (data.variations && data.variations.length > 0) {
          setSelectedVariation(data.variations[0]);
        }
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleAddToCart = () => {
    if (!product) return;
    add(product, quantity, selectedVariation || undefined);
    showToast(`Adicionado ${quantity}x ${product.name} ao carrinho`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push("/checkout");
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: "80px 24px", textAlign: "center", color: "var(--text-muted)" }}>
        <p style={{ fontSize: "2rem", marginBottom: "16px", animation: "pulse 1.5s infinite" }}>⏳</p>
        Carregando produto...
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="product-page">
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
        {/* Breadcrumbs */}
        <nav className="breadcrumb" style={{ marginBottom: "24px" }}>
          <Link href="/">Início</Link>
          <span className="breadcrumb-sep">›</span>
          <span style={{ color: "var(--text)" }}>{product.category}</span>
          <span className="breadcrumb-sep">›</span>
          <span style={{ fontWeight: 600 }}>{product.name}</span>
        </nav>

        {/* Product Top */}
        <div className="product-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginBottom: "60px", alignItems: "start" }}>
          {/* Gallery */}
          <div className="product-gallery" style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden", aspectRatio: "1" }}>
            <Image
              src={product.image}
              alt={product.name}
              width={600}
              height={600}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              priority
            />
          </div>

          {/* Info */}
          <div className="product-info-panel">
            {product.badge && (
              <span className="badge" style={{ marginBottom: "12px", display: "inline-block" }}>{product.badge}</span>
            )}
            <h1 style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "16px", lineHeight: 1.1 }}>
              {product.name}
            </h1>
            
            {/* Reviews summary */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "20px" }}>
              <span style={{ color: "#f59e0b" }}>★★★★★</span>
              <span>4.8 (124 avaliações)</span>
              <span>•</span>
              <span style={{ color: "var(--success)" }}>Mais vendido</span>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", lineHeight: 1.6, marginBottom: "32px" }}>
              {product.description}
            </p>

            <div style={{ marginBottom: "32px" }}>
              <div style={{ fontSize: "2.8rem", fontWeight: 900, color: "var(--primary-bright)", letterSpacing: "-1px" }}>
                {formatPrice(product.price)}
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                ou até 12x sem juros de {formatPrice(product.price / 12)} no cartão
              </p>
            </div>

            {/* Variations */}
            {product.variations && product.variations.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "10px" }}>
                  Selecione a Opção:
                </label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {product.variations.map((v) => (
                    <button
                      key={v}
                      onClick={() => setSelectedVariation(v)}
                      style={{
                        padding: "10px 18px",
                        border: selectedVariation === v ? "2px solid var(--primary)" : "1px solid var(--border)",
                        background: selectedVariation === v ? "rgba(var(--primary-rgb), 0.1)" : "var(--bg-elevated)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: selectedVariation === v ? 700 : 500,
                        color: selectedVariation === v ? "var(--primary-bright)" : "var(--text-muted)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div style={{ marginBottom: "32px" }}>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "10px" }}>
                Quantidade:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{ background: "var(--bg-elevated)", border: "none", padding: "12px 18px", cursor: "pointer", color: "var(--text)", fontSize: "1.1rem" }}
                  >
                    −
                  </button>
                  <span style={{ width: "40px", textAlign: "center", fontWeight: 600 }}>{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    style={{ background: "var(--bg-elevated)", border: "none", padding: "12px 18px", cursor: "pointer", color: "var(--text)", fontSize: "1.1rem" }}
                  >
                    +
                  </button>
                </div>
                <span style={{ fontSize: "0.85rem", color: product.stock < 10 ? "#fca5a5" : "var(--success)" }}>
                  {product.stock < 10 ? `Restam apenas ${product.stock} em estoque!` : `Em estoque (${product.stock} disponíveis)`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <button onClick={handleAddToCart} className="btn btn-secondary" style={{ padding: "16px", fontSize: "1.1rem" }}>
                Adicionar ao Carrinho
              </button>
              <button onClick={handleBuyNow} className="btn btn-primary" style={{ padding: "16px", fontSize: "1.1rem", display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "1.3rem" }}>⚡</span> Comprar Agora
              </button>
            </div>
            
            <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "12px", fontSize: "0.85rem", color: "var(--text-muted)", padding: "16px", background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>🔒</span>
              Compra 100% segura através de Pix. Código liberado automaticamente após aprovação.
            </div>
          </div>
        </div>

        {/* Long Description */}
        {product.longDescription && (
          <div style={{ marginBottom: "60px", padding: "40px", background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>Detalhes do Produto</h2>
            <div style={{ whiteSpace: "pre-line", lineHeight: 1.8, color: "var(--text-muted)", fontSize: "1.05rem" }}>
              {product.longDescription}
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "30px" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Avaliações de Clientes</h2>
            <button className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>Escrever avaliação</button>
          </div>
          
          <div style={{ display: "grid", gap: "20px" }}>
            {MOCK_COMMENTS.map((c, i) => (
              <div key={i} style={{ padding: "24px", background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>{c.name}</div>
                    <div style={{ display: "flex", gap: "2px", color: "#f59e0b", fontSize: "0.9rem" }}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <span key={j} style={{ opacity: j < c.rating ? 1 : 0.3 }}>★</span>
                      ))}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-faint)" }}>{c.date}</span>
                </div>
                <p style={{ color: "var(--text-muted)", lineHeight: 1.6, fontSize: "0.95rem" }}>{c.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
