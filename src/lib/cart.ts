import { Product } from "./products";

export interface CartItem {
  id: string; // unique ID generated from product.id + variation
  product: Product;
  quantity: number;
  variation?: string;
}

export interface Cart {
  items: CartItem[];
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

function getItemId(productId: string, variation?: string) {
  return variation ? `${productId}-${variation}` : productId;
}

export function addToCart(items: CartItem[], product: Product, qty = 1, variation?: string): CartItem[] {
  const compoundId = getItemId(product.id, variation);
  const existing = items.find((i) => i.id === compoundId);
  
  if (existing) {
    return items.map((i) =>
      i.id === compoundId
        ? { ...i, quantity: i.quantity + qty }
        : i
    );
  }
  return [...items, { id: compoundId, product, quantity: qty, variation }];
}

export function removeFromCart(items: CartItem[], itemId: string): CartItem[] {
  return items.filter((i) => i.id !== itemId);
}

export function updateQuantity(
  items: CartItem[],
  itemId: string,
  quantity: number
): CartItem[] {
  if (quantity <= 0) return removeFromCart(items, itemId);
  return items.map((i) =>
    i.id === itemId ? { ...i, quantity } : i
  );
}
