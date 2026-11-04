import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'cart';
const CartContext = createContext(null);

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

const sameLine = (first, second) =>
  first.produtoId === second.produtoId && first.cor === second.cor && first.tamanho === second.tamanho;

export function lineKey(line) {
  return `${line.produtoId}-${line.cor}-${line.tamanho}`;
}

export function CartProvider({ children }) {
  const { session } = useAuth();
  const [lines, setLines] = useState(loadCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  useEffect(() => {
    if (!session) {
      setLines([]);
    }
  }, [session]);

  const add = useCallback((line) => {
    setLines((current) => {
      const existing = current.find((candidate) => sameLine(candidate, line));
      if (!existing) {
        return [...current, line];
      }
      return current.map((candidate) =>
        candidate === existing ? { ...candidate, quantidade: candidate.quantidade + line.quantidade } : candidate,
      );
    });
  }, []);

  const changeQuantity = useCallback((target, delta) => {
    setLines((current) =>
      current.map((line) => (sameLine(line, target) ? { ...line, quantidade: line.quantidade + delta } : line)),
    );
  }, []);

  const remove = useCallback((target) => {
    setLines((current) => current.filter((line) => !sameLine(line, target)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const quantityOf = (produtoId) =>
      lines.filter((line) => line.produtoId === produtoId).reduce((sum, line) => sum + line.quantidade, 0);
    return {
      lines,
      count: lines.reduce((sum, line) => sum + line.quantidade, 0),
      subtotal: lines.reduce((sum, line) => sum + line.preco * line.quantidade, 0),
      quantityOf,
      add,
      changeQuantity,
      remove,
      clear,
    };
  }, [lines, add, changeQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
