/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";

import { decorateBlogContent } from "@/lib/blog-content";
import type { BlogExternalLinkPreview } from "@/lib/admin-api";

const fragranticaPreview: BlogExternalLinkPreview = {
  url: "https://www.fragrantica.com/awards2025/category/Best-Mens-Fragrance-2025",
  title: "Best Men's Fragrance 2025",
  description: "Top fragrances selected by the community.",
  image_url: "https://www.fragrantica.com/images/award-cover.jpg",
  site_name: "Fragrantica",
  domain: "fragrantica.com",
};

describe("decorateBlogContent", () => {
  it("renders a preview card for a standalone external link block", () => {
    const html = "<p>https://www.fragrantica.com/awards2025/category/Best-Mens-Fragrance-2025</p>";

    const result = decorateBlogContent(html, [fragranticaPreview]);

    expect(result).toContain("external-link-preview-card");
    expect(result).toContain("Best Men's Fragrance 2025");
    expect(result).toContain("award-cover.jpg");
  });

  it("keeps inline links as normal anchors", () => {
    const html =
      '<p>Tham khảo thêm tại <a href="https://www.fragrantica.com/awards2025/category/Best-Mens-Fragrance-2025">Fragrantica</a> để xem chi tiết.</p>';

    const result = decorateBlogContent(html, [fragranticaPreview]);

    expect(result).not.toContain("external-link-preview-card");
    expect(result).toContain("<a href=\"https://www.fragrantica.com/awards2025/category/Best-Mens-Fragrance-2025\">Fragrantica</a>");
  });
});
