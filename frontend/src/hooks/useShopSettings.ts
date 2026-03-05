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
} {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/settings`)
      .then((r) => {
        if (!r.ok) return {};
        return r.json() as Promise<Record<string, string>>;
      })
      .then((data) => setSettings(data ?? {}))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { settings, isLoading };
}
