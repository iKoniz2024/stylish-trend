"use client";

import { useState, useCallback, useMemo } from "react";
import { CartContext } from "./cartContextValue";
import { getLocalCartCount } from "@/utils/localCart";

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(() => getLocalCartCount());

  const refetchCartCount = useCallback((count) => {
    setCartCount(count);
  }, []);

  const value = useMemo(() => ({ cartCount, refetchCartCount }), [cartCount, refetchCartCount]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
