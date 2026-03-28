// ============================================================
// PRODUCT CATALOG — Edit this file to manage your products
// ============================================================

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // in BRL (R$)
  image: string;
  category: string;
  badge?: string; // e.g. "Novo", "Oferta", "Popular"
  stock: number;
  variants?: { label: string; value: string }[];
}

export const STORE_CONFIG = {
  name: "Minha Loja",
  tagline: "Os melhores produtos com entrega rápida",
  currency: "BRL",
  logo: "🛍️",
};

export const CATEGORIES = [
  "Todos",
  "Eletrônicos",
  "Moda",
  "Casa",
  "Esporte",
  "Beleza",
];

export const PRODUCTS: Product[] = [
  {
    id: "prod-001",
    name: "Fone de Ouvido Bluetooth Premium",
    description:
      "Áudio cristalino com cancelamento de ruído ativo. Bateria de 30h, resistente à água IPX4 e design ergonômico para conforto prolongado.",
    price: 299.9,
    image: "/products/fone.jpg",
    category: "Eletrônicos",
    badge: "Popular",
    stock: 50,
  },
  {
    id: "prod-002",
    name: "Smartwatch Fitness Pro",
    description:
      "Monitor cardíaco, GPS integrado, 7 dias de bateria. Acompanhe seus treinos, sono e saúde com precisão.",
    price: 489.9,
    image: "/products/smartwatch.jpg",
    category: "Eletrônicos",
    badge: "Novo",
    stock: 30,
  },
  {
    id: "prod-003",
    name: "Tênis Esportivo Ultra Boost",
    description:
      "Amortecimento avançado, cabedal respirável e solado antiderrapante. Ideal para corrida e academia.",
    price: 379.9,
    image: "/products/tenis.jpg",
    category: "Esporte",
    stock: 25,
  },
  {
    id: "prod-004",
    name: "Kit Skincare Hidratante",
    description:
      "Sérum vitamina C + Hidratante facial + Protetor solar FPS 50. Pele radiante em 30 dias ou seu dinheiro de volta.",
    price: 199.9,
    image: "/products/skincare.jpg",
    category: "Beleza",
    badge: "Oferta",
    stock: 80,
  },
  {
    id: "prod-005",
    name: "Mochila Impermeável 30L",
    description:
      "Material resistente, compartimentos organizados, porta USB e design ergonômico. Perfeita para viagens e trabalho.",
    price: 249.9,
    image: "/products/mochila.jpg",
    category: "Moda",
    stock: 40,
  },
  {
    id: "prod-006",
    name: "Luminária LED Smart",
    description:
      "16 milhões de cores, controle por app, compatível com Alexa e Google Home. Transforme o ambiente da sua casa.",
    price: 159.9,
    image: "/products/luminaria.jpg",
    category: "Casa",
    badge: "Novo",
    stock: 60,
  },
  {
    id: "prod-007",
    name: "Câmera de Segurança Wi-Fi",
    description:
      "Full HD 1080p, visão noturna, detecção de movimento e armazenamento em nuvem. Monitore sua casa de qualquer lugar.",
    price: 329.9,
    image: "/products/camera.jpg",
    category: "Eletrônicos",
    stock: 20,
  },
  {
    id: "prod-008",
    name: "Jaqueta Impermeável Slim",
    description:
      "Tecido impermeável premium, isolamento térmico, corte slim moderno. Para aventuras e uso urbano.",
    price: 429.9,
    image: "/products/jaqueta.jpg",
    category: "Moda",
    badge: "Oferta",
    stock: 35,
  },
  {
    id: "prod-009",
    name: "Tapete Yoga Antiderrapante",
    description:
      "6mm de espessura, material eco-friendly, superfície antiderrapante. Inclui alça para transporte.",
    price: 129.9,
    image: "/products/yoga.jpg",
    category: "Esporte",
    stock: 90,
  },
  {
    id: "prod-010",
    name: "Perfume Intense Noir 100ml",
    description:
      "Fragrância amadeirada e marcante com notas de âmbar, baunilha e cedro. Longa duração de 24 horas.",
    price: 279.9,
    image: "/products/perfume.jpg",
    category: "Beleza",
    stock: 45,
  },
  {
    id: "prod-011",
    name: "Mesa para Home Office",
    description:
      "Design minimalista, tampo de MDF 18mm, suporte para monitor, gestão de cabos integrada. 120x60cm.",
    price: 699.9,
    image: "/products/mesa.jpg",
    category: "Casa",
    stock: 15,
  },
  {
    id: "prod-012",
    name: "Carregador Portátil 20.000mAh",
    description:
      "Carga rápida 65W, compatível com notebook, 4 saídas USB, display LED de bateria. Carregue tudo simultaneamente.",
    price: 219.9,
    image: "/products/powerbank.jpg",
    category: "Eletrônicos",
    badge: "Popular",
    stock: 70,
  },
];

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}
