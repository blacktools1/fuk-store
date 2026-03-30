"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/products";
import { useToast } from "@/components/ToastProvider";
import { AdminProduct } from "@/lib/admin-types";
import { firePixelEvent } from "@/lib/pixel";

function IconTruck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v4h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function IconPix() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" opacity="0"/>
      <path d="M11.748 3.14a.5.5 0 0 1 .504 0l8 4.619A.5.5 0 0 1 20.5 8.23v7.54a.5.5 0 0 1-.248.432l-8 4.619a.5.5 0 0 1-.504 0l-8-4.619A.5.5 0 0 1 3.5 15.77V8.23a.5.5 0 0 1 .248-.432z"/>
    </svg>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { add } = useCart();
  const { showToast } = useToast();

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [related, setRelated] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariation, setSelectedVariation] = useState<string>("");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = useCallback((dir: "prev" | "next") => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(".pdp-rel-card")?.clientWidth ?? 220;
    el.scrollBy({ left: dir === "next" ? cardWidth * 2 : -cardWidth * 2, behavior: "smooth" });
  }, []);

  const handleRelatedAdd = (e: React.MouseEvent, p: AdminProduct) => {
    e.preventDefault();
    add(p, 1);
    showToast(`${p.name} adicionado ao carrinho!`);
    setAddedIds((prev) => new Set(prev).add(p.id));
    setTimeout(() => setAddedIds((prev) => { const s = new Set(prev); s.delete(p.id); return s; }), 1200);
  };

  useEffect(() => {
    fetch(`/api/store/products/${params.id}`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: AdminProduct) => {
        setProduct(data);
        if (data.variations?.length) setSelectedVariation(data.variations[0]);
        firePixelEvent("ViewContent", {
          content_ids: [data.id],
          content_name: data.name,
          content_type: "product",
          value: data.price,
          currency: "BRL",
        });
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));

    // Buscar produtos relacionados
    fetch("/api/store/products")
      .then((r) => r.json())
      .then((all: AdminProduct[]) => {
        const others = all.filter((p) => p.active && p.id !== params.id);
        setRelated(others.slice(0, 8));
      })
      .catch(() => {});
  }, [params.id, router]);

  const PLACEHOLDER = "/products/placeholder.jpg";
  const realImages = product
    ? [
        product.image,
        ...(product.images?.filter(
          (img) => img && img !== product.image && img !== PLACEHOLDER
        ) ?? []),
      ].filter((img) => img && img !== PLACEHOLDER)
    : [];
  // Se não há imagens reais, usa o placeholder para não quebrar o layout
  const allImages = realImages.length > 0 ? realImages : product ? [product.image] : [];

  const currentImage = allImages[selectedImage] ?? "";

  const discount =
    product?.oldPrice && product.oldPrice > product.price
      ? Math.round((1 - product.price / product.oldPrice) * 100)
      : null;

  const handleAddToCart = () => {
    if (!product) return;
    add(product, quantity, selectedVariation || undefined);
    showToast(`${quantity}x ${product.name} adicionado ao carrinho!`);
  };

  const handleBuy = () => {
    handleAddToCart();
    router.push("/checkout");
  };

  if (loading) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", color: "var(--text-muted)" }}>
        <div className="pdp-spinner" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="pdp-page">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="pdp-breadcrumb">
          <Link href="/">Início</Link>
          <span>›</span>
          <span>{product.category}</span>
        </nav>

        {/* ── Layout principal ── */}
        <div className="pdp-layout">

          {/* Galeria */}
          <div className="pdp-gallery">
            {/* Thumbnails — só exibe se houver mais de 1 imagem */}
            {allImages.length > 1 && (
              <div className="pdp-thumbs">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    className={`pdp-thumb ${selectedImage === i ? "active" : ""}`}
                    onClick={() => setSelectedImage(i)}
                    aria-label={`Imagem ${i + 1}`}
                  >
                    <Image src={img} alt={`${product.name} ${i + 1}`} fill style={{ objectFit: "cover" }} sizes="72px" />
                  </button>
                ))}
              </div>
            )}

            {/* Imagem principal */}
            <div className="pdp-main-img">
              {discount !== null && (
                <span className="pdp-discount-badge">-{discount}%</span>
              )}
              <Image
                key={currentImage}
                src={currentImage}
                alt={product.name}
                fill
                style={{ objectFit: "cover" }}
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
          </div>

          {/* Painel de informações */}
          <div className="pdp-info">
            {product.category && (
              <p className="pdp-category">{product.category}</p>
            )}

            <h1 className="pdp-title">{product.name}</h1>

            {/* Preços */}
            <div className="pdp-price-block">
              {product.oldPrice && product.oldPrice > product.price && (
                <span className="pdp-old-price">{formatPrice(product.oldPrice)}</span>
              )}
              <span className="pdp-price">{formatPrice(product.price)}</span>
              <span className="pdp-installment">
                Em até 10x de <strong>{formatPrice(product.price / 10)}</strong> sem juros
              </span>
              {discount !== null && (
                <span className="pdp-pix-badge">
                  <IconPix /> {discount}% OFF no Pix
                </span>
              )}
            </div>

            {/* Variações */}
            {product.variations && product.variations.length > 0 && (
              <div className="pdp-variations">
                <label>Selecione a Opção:</label>
                <div className="pdp-var-list">
                  {product.variations.map((v) => (
                    <button
                      key={v}
                      className={`pdp-var-btn ${selectedVariation === v ? "active" : ""}`}
                      onClick={() => setSelectedVariation(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantidade */}
            <div className="pdp-qty-row">
              <div className="pdp-qty">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
              <span className={`pdp-stock ${product.stock < 10 ? "low" : ""}`}>
                {product.stock < 10
                  ? `Restam apenas ${product.stock}!`
                  : `${product.stock} disponíveis`}
              </span>
            </div>

            {/* Botão Comprar */}
            <button onClick={handleBuy} className="pdp-buy-btn">
              COMPRAR
            </button>

            <p className="pdp-payment-label">Formas de Pagamento</p>

            {/* Benefícios */}
            <div className="pdp-benefits">
              <div className="pdp-benefit-item">
                <IconTruck />
                <div>
                  <strong>Frete Grátis</strong>
                  <span>Frete grátis em pedidos acima de R$ 199. Entrega via Correios/Transportadora.</span>
                </div>
              </div>
              <div className="pdp-benefit-item">
                <IconRefresh />
                <div>
                  <strong>Devolução Gratuita</strong>
                  <span>Sua compra está protegida. Caso insatisfeito, devolva gratuitamente. 7 dias após o recebimento da mercadoria.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Descrição */}
        {(product.description || product.longDescription) && (
          <div className="pdp-description">
            <h2 className="pdp-section-title">DESCRIÇÃO</h2>
            <div className="pdp-description-body">
              {product.longDescription
                ? product.longDescription.split("\n").map((line, i) =>
                    line.trim() ? <p key={i}>{line}</p> : <br key={i} />
                  )
                : <p>{product.description}</p>
              }
            </div>
          </div>
        )}

        {/* Carrossel de produtos relacionados */}
        {related.length > 0 && (
          <div className="pdp-related">
            <div className="pdp-related-header">
              <h2 className="pdp-section-title">VOCÊ TAMBÉM PODE GOSTAR</h2>
              {related.length > 3 && (
                <div className="pdp-carousel-arrows">
                  <button onClick={() => scrollCarousel("prev")} aria-label="Anterior">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button onClick={() => scrollCarousel("next")} aria-label="Próximo">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              )}
            </div>

            <div className="pdp-related-track" ref={carouselRef}>
              {related.map((p) => {
                const relDiscount = p.oldPrice && p.oldPrice > p.price
                  ? Math.round((1 - p.price / p.oldPrice) * 100)
                  : null;
                const wasAdded = addedIds.has(p.id);
                return (
                  <Link key={p.id} href={`/product/${p.id}`} className="pdp-rel-card">
                    <div className="pdp-rel-img">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        style={{ objectFit: "cover" }}
                        sizes="220px"
                      />
                      {relDiscount !== null && (
                        <span className="pdp-rel-badge">-{relDiscount}%</span>
                      )}
                    </div>
                    <div className="pdp-rel-body">
                      <p className="pdp-rel-name">{p.name}</p>
                      {p.oldPrice && p.oldPrice > p.price && (
                        <span className="pdp-rel-old">{formatPrice(p.oldPrice)}</span>
                      )}
                      <span className="pdp-rel-price">{formatPrice(p.price)}</span>
                      {p.price >= 10 && (
                        <span className="pdp-rel-installment">
                          Em até 10x de {formatPrice(p.price / 10)}
                        </span>
                      )}
                      <button
                        className={`pdp-rel-add ${wasAdded ? "added" : ""}`}
                        onClick={(e) => handleRelatedAdd(e, p)}
                      >
                        {wasAdded ? "✓ Adicionado" : "Adicionar ao Carrinho"}
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
