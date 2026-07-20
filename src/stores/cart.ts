import { create } from 'zustand';
import type { CartItem } from '~/lib/types';

const CART_KEY = 'cuteKidsCart';

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    localStorage.removeItem(CART_KEY);
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

interface CartState {
  items: CartItem[];
  init: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  init: () => {
    set({ items: loadCart() });
  },

  addItem: (item) => {
    const { items } = get();
    const existing = items.findIndex(
      (i) => i.productId === item.productId && i.size === item.size,
    );
    if (existing > -1) {
      const updated = [...items];
      updated[existing] = {
        ...updated[existing],
        quantity: updated[existing].quantity + item.quantity,
      };
      saveCart(updated);
      set({ items: updated });
    } else {
      const updated = [...items, item];
      saveCart(updated);
      set({ items: updated });
    }
  },

  removeItem: (index) => {
    const { items } = get();
    const updated = items.filter((_, i) => i !== index);
    saveCart(updated);
    set({ items: updated });
  },

  updateQuantity: (index, quantity) => {
    const { items } = get();
    if (index < 0 || index >= items.length) return;
    const clamped = Math.max(1, quantity);
    const updated = [...items];
    updated[index] = { ...updated[index], quantity: clamped };
    saveCart(updated);
    set({ items: updated });
  },

  clearCart: () => {
    saveCart([]);
    set({ items: [] });
  },

  totalItems: () => {
    return get().items.reduce((sum, i) => sum + i.quantity, 0);
  },

  subtotal: () => {
    return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },
}));
