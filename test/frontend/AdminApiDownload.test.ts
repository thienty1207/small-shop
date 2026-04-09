// @ts-nocheck
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { adminDownload } from "../../frontend/src/lib/admin-api";

describe("adminDownload", () => {
  const fetchMock = vi.fn();
  const createObjectURLMock = vi.fn(() => "blob:test-url");
  const revokeObjectURLMock = vi.fn();
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: revokeObjectURLMock,
    });
    localStorage.setItem("admin_auth_token", "token-123");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("downloads file with filename from Content-Disposition", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("id,name\n1,Order", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=\"orders.csv\"",
        },
      }),
    );

    const appendSpy = vi.spyOn(document.body, "appendChild");

    await adminDownload("/api/admin/orders/export?format=csv", "fallback.csv");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/admin\/orders\/export\?format=csv$/),
      {
        method: "GET",
        headers: { Authorization: "Bearer token-123" },
      },
    );

    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe("orders.csv");
    expect(anchor.href).toBe("blob:test-url");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:test-url");
  });

  it("falls back to provided filename when header missing", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("name\nProduct", {
        status: 200,
        headers: { "Content-Type": "text/csv; charset=utf-8" },
      }),
    );

    const appendSpy = vi.spyOn(document.body, "appendChild");

    await adminDownload("/api/admin/products/export?format=csv", "products.csv");

    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe("products.csv");
  });
});
