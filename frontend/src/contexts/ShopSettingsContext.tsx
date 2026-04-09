/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext } from "react";
import { useShopSettings } from "@/hooks/useShopSettings";

// ─── Context ─────────────────────────────────────────────────────────────────

interface ShopSettingsContextValue {
  settings: Record<string, string>;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const ShopSettingsContext = createContext<ShopSettingsContextValue>({
  settings: {},
  isLoading: true,
  refreshSettings: async () => {},
});

/**
 * Provides shop settings fetched once from /api/settings to the entire app.
 * Wrap at the root to avoid duplicate fetch requests.
 */
export function ShopSettingsProvider({ children }: { children: React.ReactNode }) {
  const value = useShopSettings();
  return (
    <ShopSettingsContext.Provider value={value}>
      {children}
    </ShopSettingsContext.Provider>
  );
}

/** Hook to access shop settings without triggering a new API call. */
export function useShopSettingsCtx(): ShopSettingsContextValue {
  return useContext(ShopSettingsContext);
}
