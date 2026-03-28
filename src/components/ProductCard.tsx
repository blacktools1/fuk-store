"use client";

import Image from "next/image";
import Link from "next/link";
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

  const badgeClass =
    product.badge === "Popular"
      ? "popular"
      : product.badge === "Novo"
      ? "novo"
      : "oferta";

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
        {product.badge && (
          <span className={`product-badge ${badgeClass}`}>{product.badge}</span>
        )}
        <div className="product-card-quick-add">
          <button className="quick-add-btn" onClick={handleAdd}>
            ⚡ Adicionar ao Carrinho
          </button>
        </div>
      </div>

      <div className="product-card-body">
        <p className="product-card-category">{product.category}</p>
        <h3 className="product-card-name" style={{ cursor: 'pointer' }}>{product.name}</h3>
        <p className="product-card-desc">{product.description}</p>
        <div className="product-card-footer">
          <span className="product-price">{formatPrice(product.price)}</span>
          <button
            id={`add-to-cart-${product.id}`}
            className={`add-btn ${added ? "added" : ""}`}
            onClick={handleAdd}
            aria-label={`Adicionar ${product.name} ao carrinho`}
          >
            {added ? "✓" : "+"}
          </button>
        </div>
      </div>
    </article>
  );
}
