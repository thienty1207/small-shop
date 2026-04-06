import { describe, expect, it } from "vitest";

import { buildApiUrl, resolveApiBaseUrl, resolvePublicAssetUrl } from "./api-base";

describe("api-base", () => {
  it("uses relative api paths by default", () => {
    expect(resolveApiBaseUrl(undefined)).toBe("");
    expect(buildApiUrl("/api/blog", undefined)).toBe("/api/blog");
  });

  it("normalizes explicit api origins", () => {
    expect(resolveApiBaseUrl("https://api.example.com/")).toBe("https://api.example.com");
    expect(buildApiUrl("/api/blog", "https://api.example.com/")).toBe("https://api.example.com/api/blog");
  });

  it("keeps public asset paths relative when api base is relative", () => {
    expect(resolvePublicAssetUrl("/uploads/test.jpg", undefined)).toBe("/uploads/test.jpg");
    expect(resolvePublicAssetUrl("https://cdn.example.com/test.jpg", undefined)).toBe(
      "https://cdn.example.com/test.jpg",
    );
  });
});
