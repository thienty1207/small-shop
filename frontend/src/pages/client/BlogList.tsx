import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, SlidersHorizontal, X } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import type { BlogPostPublic, PaginatedResponse, PublicBlogTag } from "@/lib/admin-api";
import { API_BASE_URL } from "@/lib/api-base";

const API_URL = API_BASE_URL;
const LIMIT = 12;

function resolveImageUrl(url: string | null): string {
  if (!url) return "";
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildSearchParams(page: number, tagSlug: string): URLSearchParams {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(LIMIT),
  });

  if (tagSlug.trim()) {
    params.set("tag", tagSlug.trim());
  }

  return params;
}

export default function BlogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<PaginatedResponse<BlogPostPublic> | null>(null);
  const [tags, setTags] = useState<PublicBlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const tagSlug = searchParams.get("tag") ?? "";

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [postsRes, tagsRes] = await Promise.all([
          fetch(`${API_URL}/api/blog?${buildSearchParams(page, tagSlug)}`, {
            signal: controller.signal,
          }),
          fetch(`${API_URL}/api/blog/tags`, { signal: controller.signal }),
        ]);

        if (!postsRes.ok) {
          throw new Error(`HTTP ${postsRes.status}`);
        }
        if (!tagsRes.ok) {
          throw new Error(`HTTP ${tagsRes.status}`);
        }

        const postsPayload = (await postsRes.json()) as PaginatedResponse<BlogPostPublic>;
        const tagsPayload = (await tagsRes.json()) as PublicBlogTag[];

        setData(postsPayload);
        setTags(Array.isArray(tagsPayload) ? tagsPayload : []);
      } catch (nextError) {
        if ((nextError as Error).name !== "AbortError") {
          setError((nextError as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [page, tagSlug]);

  const totalPages = data?.total_pages ?? 1;

  const activeTag = useMemo(
    () => tags.find((tag) => tag.slug === tagSlug) ?? null,
    [tags, tagSlug],
  );

  const updateFilters = (nextPage: number, nextTagSlug: string) => {
    setSearchParams(() => {
      const next = new URLSearchParams();
      if (nextPage > 1) {
        next.set("page", String(nextPage));
      }
      if (nextTagSlug) {
        next.set("tag", nextTagSlug);
      }
      return next;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectTag = (nextTagSlug: string) => {
    updateFilters(1, nextTagSlug);
  };

  const handlePageChange = (nextPage: number) => {
    updateFilters(nextPage, tagSlug);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />

      <main className="flex-1 pb-16 pt-24">
        <section className="container mx-auto px-4">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Blog</p>
              <h1 className="text-2xl font-semibold text-foreground">Góc chia sẻ hương thơm</h1>
            </div>

            {activeTag && (
              <button
                type="button"
                onClick={() => handleSelectTag("")}
                className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs text-rose-700"
              >
                Đang lọc: {activeTag.name}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mb-8 rounded-3xl border border-border bg-foreground/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              Lọc theo tag
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSelectTag("")}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                  !tagSlug
                    ? "bg-foreground text-white"
                    : "border border-border bg-white text-muted-foreground hover:text-foreground"
                }`}
              >
                Tất cả
              </button>

              {tags.map((tag) => {
                const isActive = tag.slug === tagSlug;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleSelectTag(tag.slug)}
                    className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                      isActive
                        ? "bg-rose-500 text-white"
                        : "border border-border bg-white text-muted-foreground hover:border-rose-200 hover:text-rose-700"
                    }`}
                  >
                    {tag.name}
                    <span className="ml-1.5 opacity-70">({tag.posts_count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Đang tải...</div>
          ) : error ? (
            <div className="py-20 text-center text-red-500">Không thể tải bài viết: {error}</div>
          ) : !data || data.items.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              {activeTag
                ? `Chưa có bài viết nào thuộc tag ${activeTag.name}.`
                : "Chưa có bài viết nào."}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data.items.map((post) => (
                <Link
                  to={`/blog/${post.slug}`}
                  key={post.id}
                  className="group overflow-hidden rounded-2xl border border-border bg-white transition-shadow hover:shadow-lg"
                >
                  <div className="relative h-48 bg-gray-100">
                    {post.cover_image_url ? (
                      <img
                        src={resolveImageUrl(post.cover_image_url)}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                        Chưa có ảnh cover
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {formatDate(post.published_at)}
                    </p>
                    <h3 className="line-clamp-2 text-lg font-semibold text-foreground">{post.title}</h3>
                    {post.excerpt && (
                      <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
                    )}

                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.tags.slice(0, 3).map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleSelectTag(tag.slug);
                            }}
                            className="rounded-full bg-rose-50 px-2 py-1 text-[11px] text-rose-700 transition-colors hover:bg-rose-100"
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    )}

                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground">
                      Xem bài viết <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground disabled:opacity-50"
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Trang trước
              </button>
              <span className="text-xs text-muted-foreground">
                Trang {page} / {totalPages}
              </span>
              <button
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground disabled:opacity-50"
                disabled={page === totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Trang sau
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
