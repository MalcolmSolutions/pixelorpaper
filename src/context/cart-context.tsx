"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  getLineId,
  getVariantLabel,
  getVariantUnitPriceCents,
  type PrintSizeKey,
  type PurchaseVariant,
} from "@/lib/purchase";
import type { Product } from "@/types/product";

type CartLine = {
  lineId: string;
  product: Product;
  variant: PurchaseVariant;
  unitPriceCents: number;
  variantLabel: string;
  quantity: number;
};

type CartState = Record<string, CartLine>;

type CartAction =
  | { type: "ADD"; product: Product; variant: PurchaseVariant }
  | { type: "REMOVE"; lineId: string }
  | { type: "CLEAR" };

type CartItem = {
  lineId: string;
  product: Product;
  variant: PurchaseVariant;
  unitPriceCents: number;
  variantLabel: string;
  quantity: number;
};

type CartContextValue = {
  cart: CartItem[];
  itemCount: number;
  subtotalCents: number;
  addPrintToCart: (product: Product, printSizeKey: PrintSizeKey) => void;
  addDownloadToCart: (product: Product) => void;
  removeFromCart: (lineId: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "image-sales-cart";

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD": {
      const lineId = getLineId(action.product, action.variant);
      const existing = state[lineId];

      return {
        ...state,
        [lineId]: {
          lineId,
          product: action.product,
          variant: action.variant,
          unitPriceCents: getVariantUnitPriceCents(action.variant),
          variantLabel: getVariantLabel(action.variant),
          quantity: (existing?.quantity ?? 0) + 1,
        },
      };
    }
    case "REMOVE": {
      const currentQty = state[action.lineId]?.quantity ?? 0;
      if (currentQty <= 1) {
        const nextState = { ...state };
        delete nextState[action.lineId];
        return nextState;
      }

      return {
        ...state,
        [action.lineId]: {
          ...state[action.lineId],
          quantity: currentQty - 1,
        },
      };
    }
    case "CLEAR":
      return {};
    default:
      return state;
  }
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function parseStoredState(raw: string): CartState {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") {
    return {};
  }

  const result: CartState = {};

  for (const [lineId, line] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    if (!line || typeof line !== "object") {
      continue;
    }

    const maybeLine = line as {
      product?: Product;
      variant?: PurchaseVariant;
      unitPriceCents?: number;
      variantLabel?: string;
      quantity?: number;
    };
    if (!maybeLine.product || typeof maybeLine.quantity !== "number") {
      continue;
    }

    if (maybeLine.quantity <= 0) {
      continue;
    }

    const variant = maybeLine.variant ?? { kind: "download" as const };

    result[lineId] = {
      lineId,
      product: maybeLine.product,
      variant,
      unitPriceCents:
        typeof maybeLine.unitPriceCents === "number"
          ? maybeLine.unitPriceCents
          : getVariantUnitPriceCents(variant),
      variantLabel:
        typeof maybeLine.variantLabel === "string"
          ? maybeLine.variantLabel
          : getVariantLabel(variant),
      quantity: maybeLine.quantity,
    };
  }

  return result;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {});

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = parseStoredState(raw);
      for (const line of Object.values(parsed)) {
        for (let i = 0; i < line.quantity; i += 1) {
          dispatch({
            type: "ADD",
            product: line.product,
            variant: line.variant,
          });
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const cart = useMemo(
    () =>
      Object.entries(state)
        .filter(([, line]) => line.quantity > 0)
        .map(([, line]) => ({
          lineId: line.lineId,
          product: line.product,
          variant: line.variant,
          unitPriceCents: line.unitPriceCents,
          variantLabel: line.variantLabel,
          quantity: line.quantity,
        })),
    [state],
  );

  const itemCount = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart],
  );

  const subtotalCents = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + item.unitPriceCents * item.quantity,
        0,
      ),
    [cart],
  );

  const addPrintToCart = useCallback(
    (product: Product, printSizeKey: PrintSizeKey) => {
      dispatch({
        type: "ADD",
        product,
        variant: {
          kind: "print",
          printSizeKey,
        },
      });
    },
    [],
  );

  const addDownloadToCart = useCallback((product: Product) => {
    dispatch({
      type: "ADD",
      product,
      variant: { kind: "download" },
    });
  }, []);

  const removeFromCart = useCallback((lineId: string) => {
    dispatch({ type: "REMOVE", lineId });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  const value = useMemo(
    () => ({
      cart,
      itemCount,
      subtotalCents,
      addPrintToCart,
      addDownloadToCart,
      removeFromCart,
      clearCart,
    }),
    [
      addDownloadToCart,
      addPrintToCart,
      cart,
      clearCart,
      itemCount,
      removeFromCart,
      subtotalCents,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
