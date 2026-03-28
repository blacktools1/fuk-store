import { Product } from "./products";

export interface CartItem {
  product: Product;
  quantity: number;
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

export function addToCart(items: CartItem[], product: Product, qty = 1): CartItem[] {
  const existing = items.find((i) => i.product.id === product.id);
  if (existing) {
    return items.map((i) =>
      i.product.id === product.id
        ? { ...i, quantity: i.quantity + qty }
        : i
    );
  }
  return [...items, { product, quantity: qty }];
}

export function removeFromCart(items: CartItem[], productId: string): CartItem[] {
  return items.filter((i) => i.product.id !== productId);
}

export function updateQuantity(
  items: CartItem[],
  productId: string,
  quantity: number
): CartItem[] {
  if (quantity <= 0) return removeFromCart(items, productId);
  return items.map((i) =>
    i.product.id === productId ? { ...i, quantity } : i
  );
}
