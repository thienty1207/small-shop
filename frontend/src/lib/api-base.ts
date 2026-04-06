const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

export function resolveApiBaseUrl(rawBase: string | undefined): string {
  const trimmed = rawBase?.trim() ?? "";
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_URL);

export function buildApiUrl(path: string, rawBase: string | undefined = import.meta.env.VITE_API_URL): string {
  if (ABSOLUTE_URL_PATTERN.test(path)) return path;

  const normalizedBase = resolveApiBaseUrl(rawBase);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function resolvePublicAssetUrl(
  url: string,
  rawBase: string | undefined = import.meta.env.VITE_API_URL,
): string {
  if (!url || ABSOLUTE_URL_PATTERN.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  return buildApiUrl(url, rawBase);
}
