import { useEffect } from "react";

/**
 * Reads `shop_font` from the provided settings map and:
 *  1. Injects a Google Fonts <link> into <head> (idempotent)
 *  2. Sets `font-family` on `document.body` so every element inherits it
 *
 * Call this once at the app root after `useShopSettings()` resolves.
 */
export function useApplyShopFont(settings: Record<string, string>): void {
  useEffect(() => {
    const font = settings["shop_font"];
    if (!font) return;

    const encoded = font.replace(/ /g, "+");
    const href    = `https://fonts.googleapis.com/css2?family=${encoded}:wght@300;400;500;600;700&display=swap`;

    // Inject link tag only once
    if (!document.querySelector(`link[data-shop-font]`)) {
      const link       = document.createElement("link");
      link.rel         = "stylesheet";
      link.href        = href;
      link.dataset.shopFont = "1";
      document.head.appendChild(link);
    } else {
      // Update existing link if font changed
      const existing = document.querySelector<HTMLLinkElement>("link[data-shop-font]");
      if (existing && existing.href !== href) {
        existing.href = href;
      }
    }

    // Apply to body (CSS variables can't easily do Google Fonts, so we set inline)
    document.body.style.fontFamily = `'${font}', sans-serif`;
  }, [settings]);
}
