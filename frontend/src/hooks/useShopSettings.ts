import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function buildSettingsUrl(): string {
  const separator = API_URL.includes("?") ? "&" : "?";
  return `${API_URL}/api/settings${separator}t=${Date.now()}`;
}

/**
 * Fetches the public shop settings from GET /api/settings.
 * Returns a key-value map that includes:
 *   store_name, store_email, store_phone, store_address
 *   social_facebook, social_instagram, social_tiktok
 *   hero_slide_1_img, hero_slide_1_title, ... (×3 slides)
 *   banner_image_url, banner_link
 *   shipping_fee_default, free_shipping_from
 */
export function useShopSettings(): {
  settings: Record<string, string>;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
} {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = async () => {
    setIsLoading(true);
    try {
      const requestInit: RequestInit = {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, max-age=0",
          Pragma: "no-cache",
        },
      };

      let res = await fetch(buildSettingsUrl(), requestInit);
      if (!res.ok) {
        // Retry once to absorb transient CDN/proxy/cache glitches.
        res = await fetch(buildSettingsUrl(), requestInit);
      }

      if (!res.ok) {
        return;
      }

      const data = await (res.json() as Promise<Record<string, string>>);
      if (data && typeof data === "object") {
        setSettings(data);
      }
    } catch {
      // Keep previous settings to avoid flashing default/fallback content
      // when /api/settings fails temporarily.
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshSettings();
  }, []);

  return { settings, isLoading, refreshSettings };
}
