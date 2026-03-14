import { create } from 'zustand'

export type PosProduct = {
  id: string;
  name: string;
  price: string | number;
  categoryId: string;
}

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
}

interface PosState {
  selectedTableId: string | null;
  selectedTableName: string | null;
  cart: CartItem[];
  selectTable: (id: string | null, name?: string | null) => void;
  addToCart: (product: PosProduct) => void;
  removeFromCart: (productId: string) => void;
  updateNote: (productId: string, note: string) => void;
  clearCart: () => void;
  setCart: (items: CartItem[]) => void;
}

export const usePosStore = create<PosState>((set) => ({
  selectedTableId: null,
  selectedTableName: null,
  cart: [],
  selectTable: (id, name = null) => set({ selectedTableId: id, selectedTableName: name, cart: [] }),
  addToCart: (product) => set((state) => {
    const existing = state.cart.find(item => item.productId === product.id);
    if (existing) {
      return {
        cart: state.cart.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      };
    }
    return {
      cart: [...state.cart, { productId: product.id, name: product.name, price: Number(product.price), quantity: 1 }]
    };
  }),
  removeFromCart: (productId) => set((state) => ({
    cart: state.cart.filter(item => item.productId !== productId)
  })),
  updateNote: (productId, note) => set((state) => ({
    cart: state.cart.map(item => item.productId === productId ? { ...item, note } : item)
  })),
  clearCart: () => set({ cart: [] }),
  setCart: (items) => set({ cart: items })
}))
