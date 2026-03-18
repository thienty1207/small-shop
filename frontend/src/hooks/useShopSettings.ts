import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
      const res = await fetch(`${API_URL}/api/settings`, { cache: "no-store" });
      if (!res.ok) {
        setSettings({});
        return;
      }

      const data = await (res.json() as Promise<Record<string, string>>);
      setSettings(data ?? {});
    } catch {
      setSettings({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshSettings();
  }, []);

  return { settings, isLoading, refreshSettings };
}
