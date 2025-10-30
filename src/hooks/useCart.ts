import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// === Types ===
export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  stock: number;
  quantity: number;
}

interface CartState {
  cart: CartItem[];
  isLoading: boolean;
  // Actions
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setLoading: (loading: boolean) => void;
  // Getters
  getTotal: () => number;
  getItemCount: () => number;
}

// === Store ===
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      isLoading: false,

      // === Actions ===
      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find((i) => i.id === item.id);
          if (existing) {
            const newQty = existing.quantity + 1;
            if (newQty > item.stock) return state; // Stock limit
            return {
              cart: state.cart.map((i) =>
                i.id === item.id ? { ...i, quantity: newQty } : i
              ),
            };
          }
          return {
            cart: [...state.cart, { ...item, quantity: 1 }],
          };
        }),

      removeFromCart: (id) =>
        set((state) => ({
          cart: state.cart.filter((i) => i.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => {
          const item = state.cart.find((i) => i.id === id);
          if (!item) return state;
          const clamped = Math.max(1, Math.min(quantity, item.stock));
          if (clamped === item.quantity) return state;
          return {
            cart: state.cart.map((i) =>
              i.id === id ? { ...i, quantity: clamped } : i
            ),
          };
        }),

      clearCart: () => set({ cart: [] }),

      setLoading: (loading) => set({ isLoading: loading }),

      // === Getters ===
      getTotal: () => {
        const { cart } = get();
        return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
      },

      getItemCount: () => {
        const { cart } = get();
        return cart.reduce((sum, i) => sum + i.quantity, 0);
      },
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
      // Optional: Only persist cart items
      partialize: (state) => ({ cart: state.cart }),
      // Rehydrate safely
      onRehydrateStorage: () => (state) => {
        if (state) state.setLoading(false);
      },
    }
  )
);
