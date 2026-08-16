import React, { createContext, useContext, useState, useEffect } from "react";
import type { OrderItemPayload } from "../lib/storage/store";

export interface CartItem extends OrderItemPayload {
  id: string;
  imageUrl?: string;
  unit: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "palak_cart_v1";

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  }, [items]);

  const addItem = (item: Omit<CartItem, "id">) => {
    setItems((prev) => {
      // Check if identical item (same product and identical options & file) already exists
      const existingIndex = prev.findIndex(
        (i) =>
          i.productId === item.productId &&
          JSON.stringify(i.selectedOptions) === JSON.stringify(item.selectedOptions) &&
          i.uploadedFileName === item.uploadedFileName &&
          i.designAssistanceRequested === item.designAssistanceRequested
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const current = updated[existingIndex];
        const newQty = current.quantity + item.quantity;
        const newTotal = (current.unitPrice * newQty);
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          totalPrice: newTotal,
        };
        return updated;
      }

      const newItem: CartItem = {
        ...item,
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      };
      return [...prev, newItem];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
              totalPrice: item.unitPrice * quantity,
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((acc, i) => acc + (i.quantity > 0 ? 1 : 0), 0);
  const subtotal = items.reduce((acc, i) => acc + i.totalPrice, 0);
  const deliveryFee = 0; // Default pickup is free
  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        deliveryFee,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
