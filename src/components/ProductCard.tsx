"use client";

import Image from "next/image";
import { useState } from "react";
import { formatPrice } from "@/lib/products";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ToastProvider";

// Accepts both Product and AdminProduct shapes
type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  image: string;
  category: string;
  badge?: string;
  stock: number;
};

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { add, openCart } = useCart();
  const { showToast } = useToast();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    add(product);
    setAdded(true);
    showToast(`${product.name} adicionado ao carrinho!`);
    setTimeout(() => setAdded(false), 800);
  };

  const handleCardClick = () => {
    router.push(`/product/${product.id}`);
  };

  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round((1 - product.price / product.oldPrice) * 100)
      : null;

  return (
    <article className="product-card" onClick={handleCardClick}>
      <div className="product-card-img">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          style={{ objectFit: "cover" }}
        />
        {discount !== null && (
          <span className="product-discount-badge">-{discount}%</span>
        )}
        <div className="product-card-quick-add">
          <a
            href={`/product/${product.id}`}
            className="quick-add-btn"
            onClick={(e) => e.stopPropagation()}
          >
            Ver Detalhes →
          </a>
        </div>
      </div>

      <div className="product-card-body">
        <h3 className="product-card-name" style={{ cursor: "pointer" }}>{product.name}</h3>
        <p className="product-card-desc">{product.description}</p>
        <div className="product-card-footer">
          <div className="product-price-block">
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="product-old-price">{formatPrice(product.oldPrice)}</span>
            )}
            <span className="product-price">{formatPrice(product.price)}</span>
          </div>
        </div>

        {/* Botão Comprar — visível apenas no estilo Clean via CSS */}
        <a
          href={`/product/${product.id}`}
          className="product-card-buy-btn"
          onClick={(e) => e.stopPropagation()}
        >
          Comprar
        </a>
      </div>

      {/* Cart button — absolute bottom-right */}
      <button
        id={`add-to-cart-${product.id}`}
        className={`add-btn ${added ? "added" : ""}`}
        onClick={handleAdd}
        aria-label={`Adicionar ${product.name} ao carrinho`}
      >
        {added ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        )}
      </button>
    </article>
  );
}
