import type { BlogExternalLinkPreview } from "@/lib/admin-api";

export function getYoutubeVideoId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (host.endsWith("youtube.com")) {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      const embedMatch = url.pathname.match(/^\/embed\/([^/]+)/);
      if (embedMatch?.[1]) return embedMatch[1];

      const shortsMatch = url.pathname.match(/^\/shorts\/([^/]+)/);
      if (shortsMatch?.[1]) return shortsMatch[1];
    }
  } catch {
    return null;
  }

  return null;
}

export function getYoutubeEmbedUrl(rawUrl: string): string | null {
  const videoId = getYoutubeVideoId(rawUrl);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

export function getYoutubeWatchUrl(rawUrl: string): string {
  const videoId = getYoutubeVideoId(rawUrl);
  if (!videoId) return rawUrl;
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function createYoutubeEmbedCard(doc: Document, rawUrl: string): HTMLElement | null {
  const embedUrl = getYoutubeEmbedUrl(rawUrl);
  if (!embedUrl) return null;

  const watchUrl = getYoutubeWatchUrl(rawUrl);
  const wrapper = doc.createElement("div");
  wrapper.className = "youtube-embed-card my-6 overflow-hidden rounded-3xl border border-border bg-foreground/[0.03]";

  const frame = doc.createElement("iframe");
  frame.src = embedUrl;
  frame.title = "Video YouTube";
  frame.className = "aspect-video w-full bg-black";
  frame.setAttribute(
    "allow",
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
  );
  frame.setAttribute("allowfullscreen", "true");
  frame.setAttribute("loading", "lazy");
  frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

  const footer = doc.createElement("div");
  footer.className = "flex items-center justify-end p-4";

  const link = doc.createElement("a");
  link.href = watchUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Mở trên YouTube";
  link.className = "inline-flex items-center gap-2 text-sm text-rose-600 underline underline-offset-4";

  footer.appendChild(link);
  wrapper.appendChild(frame);
  wrapper.appendChild(footer);

  return wrapper;
}

function createDocument(html: string): Document {
  if (typeof DOMParser !== "undefined") {
    return new DOMParser().parseFromString(html, "text/html");
  }

  return document.implementation.createHTMLDocument("");
}

function getStandaloneAnchorUrl(node: Element): string | null {
  let anchor: HTMLAnchorElement | null = null;

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      if ((child.textContent ?? "").trim()) return null;
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) return null;

    const element = child as Element;
    if (element.tagName !== "A" || anchor) return null;
    anchor = element as HTMLAnchorElement;
  }

  return anchor?.getAttribute("href") ?? anchor?.textContent ?? null;
}

function decorateYoutubeEmbeds(doc: Document): void {
  const iframes = Array.from(doc.querySelectorAll("iframe"));

  iframes.forEach((iframe) => {
    const card = createYoutubeEmbedCard(doc, iframe.getAttribute("src") ?? "");
    if (!card) {
      iframe.remove();
      return;
    }

    iframe.replaceWith(card);
  });

  const candidateBlocks = Array.from(doc.querySelectorAll("p, li"));
  candidateBlocks.forEach((node) => {
    const standaloneAnchorUrl = getStandaloneAnchorUrl(node);
    if (!standaloneAnchorUrl) return;

    const card = createYoutubeEmbedCard(doc, standaloneAnchorUrl.trim());
    if (!card) return;

    node.replaceWith(card);
  });

  candidateBlocks.forEach((node) => {
    if (node.closest(".youtube-embed-card")) return;
    if (node.children.length > 0) return;

    const rawText = (node.textContent ?? "").trim();
    const card = createYoutubeEmbedCard(doc, rawText);
    if (!card) return;

    node.replaceWith(card);
  });
}

export function extractEmbeddedYoutubeIds(html: string): Set<string> {
  const doc = createDocument(html);
  if (!doc.body.innerHTML) {
    doc.body.innerHTML = html;
  }
  const urls = new Set<string>();

  Array.from(doc.querySelectorAll("iframe")).forEach((iframe) => {
    const src = iframe.getAttribute("src");
    if (src) urls.add(src);
  });

  Array.from(doc.querySelectorAll("a")).forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (href) urls.add(href);
  });

  Array.from(doc.querySelectorAll("p, li")).forEach((node) => {
    const text = (node.textContent ?? "").trim();
    if (text) urls.add(text);
  });

  return new Set(
    Array.from(urls)
      .map((url) => getYoutubeVideoId(url))
      .filter((videoId): videoId is string => Boolean(videoId)),
  );
}

function normalizePreviewUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.trim());
    if (!/^https?:$/.test(url.protocol)) return null;
    if (getYoutubeVideoId(url.toString())) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function createExternalLinkPreviewCard(
  doc: Document,
  preview: BlogExternalLinkPreview,
): HTMLElement {
  const wrapper = doc.createElement("div");
  wrapper.className =
    "external-link-preview-card not-prose my-6 overflow-hidden rounded-3xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md";

  const link = doc.createElement("a");
  link.href = preview.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "grid gap-4 p-4 md:grid-cols-[220px,1fr] md:items-stretch";

  const media = doc.createElement("div");
  media.className = "overflow-hidden rounded-2xl bg-muted/40";

  if (preview.image_url) {
    const image = doc.createElement("img");
    image.src = preview.image_url;
    image.alt = preview.title;
    image.loading = "lazy";
    image.decoding = "async";
    image.className = "aspect-[4/3] h-full w-full object-cover";
    media.appendChild(image);
  } else {
    const placeholder = doc.createElement("div");
    placeholder.className =
      "flex aspect-[4/3] h-full w-full items-center justify-center bg-foreground/[0.04] px-4 text-center text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground";
    placeholder.textContent = preview.site_name ?? preview.domain;
    media.appendChild(placeholder);
  }

  const content = doc.createElement("div");
  content.className = "flex min-w-0 flex-col justify-between gap-3";

  const domain = doc.createElement("p");
  domain.className = "text-xs uppercase tracking-[0.18em] text-muted-foreground";
  domain.textContent = preview.site_name ?? preview.domain;

  const title = doc.createElement("h3");
  title.className = "text-lg font-semibold text-foreground";
  title.textContent = preview.title;

  content.appendChild(domain);
  content.appendChild(title);

  if (preview.description) {
    const description = doc.createElement("p");
    description.className = "text-sm leading-6 text-muted-foreground";
    description.textContent = preview.description;
    content.appendChild(description);
  }

  const cta = doc.createElement("span");
  cta.className = "inline-flex items-center gap-2 text-sm text-rose-600 underline underline-offset-4";
  cta.textContent = "Mở liên kết";
  content.appendChild(cta);

  link.appendChild(media);
  link.appendChild(content);
  wrapper.appendChild(link);

  return wrapper;
}

function decorateExternalLinkPreviews(
  doc: Document,
  externalLinkPreviews: BlogExternalLinkPreview[],
): void {
  const previewMap = new Map<string, BlogExternalLinkPreview>();
  externalLinkPreviews.forEach((preview) => {
    const key = normalizePreviewUrl(preview.url);
    if (key) {
      previewMap.set(key, preview);
    }
  });

  if (previewMap.size === 0) return;

  const candidateBlocks = Array.from(doc.querySelectorAll("p, li"));
  candidateBlocks.forEach((node) => {
    const standaloneAnchorUrl = getStandaloneAnchorUrl(node);
    if (!standaloneAnchorUrl) return;

    const key = normalizePreviewUrl(standaloneAnchorUrl);
    if (!key) return;
    const preview = previewMap.get(key);
    if (!preview) return;

    node.replaceWith(createExternalLinkPreviewCard(doc, preview));
  });

  candidateBlocks.forEach((node) => {
    if (node.closest(".youtube-embed-card, .external-link-preview-card")) return;
    if (node.children.length > 0) return;

    const key = normalizePreviewUrl((node.textContent ?? "").trim());
    if (!key) return;

    const preview = previewMap.get(key);
    if (!preview) return;

    node.replaceWith(createExternalLinkPreviewCard(doc, preview));
  });
}

export function decorateBlogContent(
  html: string,
  externalLinkPreviews: BlogExternalLinkPreview[],
): string {
  const doc = createDocument(html);
  if (!doc.body.innerHTML) {
    doc.body.innerHTML = html;
  }

  decorateYoutubeEmbeds(doc);
  decorateExternalLinkPreviews(doc, externalLinkPreviews);

  return doc.body.innerHTML;
}
