/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
  quantity: number;
}

interface CartStore {
  cart: CartItem[];
  addToCart: (item: any) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCart = create<CartStore>()(
  persist(
    (set) => ({
      cart: [],
      addToCart: (item) =>
        set((s) => {
          const existing = s.cart.find((i) => i.id === item.id);
          if (existing)
            return {
              cart: s.cart.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          return { cart: [...s.cart, { ...item, quantity: 1 }] };
        }),
      removeFromCart: (id) =>
        set((s) => ({ cart: s.cart.filter((i) => i.id !== id) })),
      updateQuantity: (id, quantity) =>
        set((s) => ({
          cart: s.cart.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        })),
      clearCart: () => set({ cart: [] }),
    }),
    { name: "cart-storage" }
  )
);
