import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Calendar,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  adminDel,
  adminGet,
  adminPost,
  adminPut,
  adminUploadImage,
  type AdminBlogPost,
  type AdminBlogTag,
  type BlogStatus,
  type PaginatedResponse,
} from "@/lib/admin-api";
import { API_BASE_URL } from "@/lib/api-base";
import RichTextEditor from "@/components/admin/RichTextEditor";

const API_URL = API_BASE_URL;

const EMPTY_FORM = {
  title: "",
  slug: "",
  excerpt: "",
  cover_image_url: "",
  content_html: "",
  content_delta: "",
  tag_ids: [] as string[],
  primary_tag_id: "",
  seo_title: "",
  seo_description: "",
  status: "draft" as BlogStatus,
  published_at: "",
};

type FormState = typeof EMPTY_FORM;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveImageUrl(url: string) {
  if (!url) return "";
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

export default function AdminBlog() {
  const [data, setData] = useState<PaginatedResponse<AdminBlogPost> | null>(null);
  const [tags, setTags] = useState<AdminBlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTags, setLoadingTags] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | BlogStatus>("");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminBlogPost | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminBlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPosts = async (nextPage = page) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "12" });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);

      const response = await adminGet<PaginatedResponse<AdminBlogPost>>(`/api/admin/blog?${params}`);
      setData(response);
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    setLoadingTags(true);
    try {
      const response = await adminGet<AdminBlogTag[]>("/api/admin/blog-tags");
      setTags(response);
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setLoadingTags(false);
    }
  };

  useEffect(() => {
    void loadTags();
  }, []);

  useEffect(() => {
    setPage(1);
    void loadPosts(1);
  }, [search, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void loadPosts(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSlugEdited(false);
    setCoverPreview("");
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (post: AdminBlogPost) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      cover_image_url: post.cover_image_url ?? "",
      content_html: post.content_html ?? "",
      content_delta:
        typeof post.content_delta === "string"
          ? post.content_delta
          : post.content_delta
            ? JSON.stringify(post.content_delta)
            : "",
      tag_ids: post.tags.map((tag) => tag.id),
      primary_tag_id: post.primary_tag?.id ?? post.tags[0]?.id ?? "",
      seo_title: post.seo_title ?? "",
      seo_description: post.seo_description ?? "",
      status: post.status,
      published_at: post.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : "",
    });
    setSlugEdited(false);
    setCoverPreview(resolveImageUrl(post.cover_image_url ?? ""));
    setFormError(null);
    setShowModal(true);
  };

  const handleTitleChange = (title: string) => {
    setForm((current) => ({
      ...current,
      title,
      slug: slugEdited ? current.slug : slugify(title),
    }));
  };

  const handleCoverSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCoverPreview(URL.createObjectURL(file));
    setUploadingCover(true);
    setFormError(null);

    try {
      const url = await adminUploadImage(file);
      setForm((current) => ({ ...current, cover_image_url: url }));
      setCoverPreview(resolveImageUrl(url));
    } catch (nextError) {
      setFormError((nextError as Error).message);
    } finally {
      setUploadingCover(false);
      event.target.value = "";
    }
  };

  const addTag = (tagId: string) => {
    if (!tagId) return;

    setForm((current) => {
      if (current.tag_ids.includes(tagId)) return current;
      if (current.tag_ids.length >= 3) {
        setFormError("Mỗi bài viết chỉ được chọn tối đa 3 tag.");
        return current;
      }

      const nextTagIds = [...current.tag_ids, tagId];
      return {
        ...current,
        tag_ids: nextTagIds,
        primary_tag_id: current.primary_tag_id || tagId,
      };
    });
  };

  const removeTag = (tagId: string) => {
    setForm((current) => {
      const nextTagIds = current.tag_ids.filter((id) => id !== tagId);
      return {
        ...current,
        tag_ids: nextTagIds,
        primary_tag_id:
          current.primary_tag_id === tagId ? (nextTagIds[0] ?? "") : current.primary_tag_id,
      };
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError("Tiêu đề là bắt buộc.");
      return;
    }

    if (!form.slug.trim()) {
      setFormError("Slug là bắt buộc.");
      return;
    }

    if (!form.content_html.trim()) {
      setFormError("Nội dung không được để trống.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const shouldPublish = form.status === "published";
      const publishedAt = shouldPublish
        ? (form.published_at ? new Date(form.published_at).toISOString() : new Date().toISOString())
        : null;

      const body = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || null,
        cover_image_url: form.cover_image_url.trim() || null,
        content_html: form.content_html,
        content_delta: form.content_delta || null,
        tag_ids: form.tag_ids,
        primary_tag_id: form.primary_tag_id || null,
        youtube_urls: [],
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
        status: form.status,
        published_at: publishedAt,
      };

      if (editing) {
        await adminPut<AdminBlogPost>(`/api/admin/blog/${editing.id}`, body);
      } else {
        await adminPost<AdminBlogPost>("/api/admin/blog", body);
      }

      setShowModal(false);
      await loadPosts(page);
    } catch (nextError) {
      setFormError((nextError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await adminDel(`/api/admin/blog/${deleteTarget.id}`);
      setDeleteTarget(null);
      await loadPosts(page);
    } catch (nextError) {
      alert((nextError as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = data?.total_pages ?? 1;
  const selectedTags = useMemo(
    () => tags.filter((tag) => form.tag_ids.includes(tag.id)),
    [tags, form.tag_ids],
  );
  const availableTags = useMemo(
    () => tags.filter((tag) => !form.tag_ids.includes(tag.id)),
    [tags, form.tag_ids],
  );

  const statusBadge = (status: BlogStatus) => (
    <span
      className={`rounded-full border px-2 py-1 text-xs font-medium ${
        status === "published"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-amber-500/20 bg-amber-500/10 text-amber-400"
      }`}
    >
      {status === "published" ? "Đã đăng" : "Bản nháp"}
    </span>
  );

  return (
    <AdminLayout title="Tất cả bài viết">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            className="h-9 w-full rounded-lg border border-gray-800 bg-gray-900 pl-9 pr-3 text-sm text-white placeholder:text-gray-600 focus:border-rose-500 focus:outline-none"
            placeholder="Tìm theo tiêu đề bài viết..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          className="h-9 rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white focus:border-rose-500 focus:outline-none"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "" | BlogStatus)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Bản nháp</option>
          <option value="published">Đã đăng</option>
        </select>

        <Button onClick={openCreate} className="h-9 gap-2 bg-rose-500 text-white hover:bg-rose-600 xl:ml-auto">
          <Plus className="h-4 w-4" />
          Thêm bài viết
        </Button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">Đang tải...</div>
      ) : error ? (
        <div className="flex items-center justify-center gap-2 py-20 text-center text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="w-16 px-4 py-3 text-left font-medium text-gray-400">Ảnh</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Tiêu đề</th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-400 lg:table-cell">Tag chính</th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-400 lg:table-cell">Trạng thái</th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-400 lg:table-cell">Ngày đăng</th>
                <th className="px-4 py-3 text-right font-medium text-gray-400">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {!data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-500">
                    Chưa có bài viết nào.
                  </td>
                </tr>
              ) : (
                data.items.map((post) => (
                  <tr key={post.id} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/20">
                    <td className="px-4 py-3">
                      {post.cover_image_url ? (
                        <img
                          src={resolveImageUrl(post.cover_image_url)}
                          alt={post.title}
                          className="h-12 w-12 rounded-lg bg-gray-800 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-800/60 text-gray-500">
                          <ImagePlus className="h-4 w-4" />
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <p className="max-w-[280px] truncate font-medium text-white">{post.title}</p>
                      <p className="mt-1 max-w-[280px] truncate text-xs text-gray-500">/{post.slug}</p>
                    </td>

                    <td className="hidden px-4 py-3 lg:table-cell">
                      {post.primary_tag ? (
                        <span className="rounded-full bg-rose-500/10 px-2 py-1 text-xs text-rose-300">
                          {post.primary_tag.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Chưa chọn</span>
                      )}
                    </td>

                    <td className="hidden px-4 py-3 lg:table-cell">{statusBadge(post.status)}</td>

                    <td className="hidden px-4 py-3 text-gray-400 lg:table-cell">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString("vi-VN") : "-"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(post)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(post)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={page === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Trước
          </Button>

          <span className="text-xs text-gray-500">
            Trang {page} / {totalPages}
          </span>

          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={page === totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Sau
          </Button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 py-10">
          <div className="w-full max-w-4xl rounded-2xl border border-gray-800 bg-gray-950 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editing ? "Cập nhật bài viết" : "Thêm bài viết"}
                </h2>
                <p className="text-xs text-gray-500">Quản lý nội dung blog cho cửa hàng.</p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-gray-400 hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Tiêu đề</label>
                  <input
                    className="h-9 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white placeholder:text-gray-600 focus:border-rose-500 focus:outline-none"
                    placeholder="Ví dụ: 5 mùi hương nước hoa cho mùa hè"
                    value={form.title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-400">Slug</label>
                  <input
                    className="h-9 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white placeholder:text-gray-600 focus:border-rose-500 focus:outline-none"
                    placeholder="vi-du-5-mui-huong-nuoc-hoa-cho-mua-he"
                    value={form.slug}
                    onChange={(event) => {
                      setSlugEdited(true);
                      setForm((current) => ({ ...current, slug: event.target.value }));
                    }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-400">Mô tả ngắn</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-rose-500 focus:outline-none"
                    placeholder="Tóm tắt ngắn nội dung bài viết, khoảng 1 đến 2 câu."
                    value={form.excerpt}
                    onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs text-gray-400">Nội dung</label>
                  <RichTextEditor
                    value={form.content_html}
                    onChange={(value) => setForm((current) => ({ ...current, content_html: value }))}
                    onDeltaChange={(delta) => setForm((current) => ({ ...current, content_delta: delta }))}
                    placeholder="Soạn nội dung bài viết..."
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Hỗ trợ định dạng, chèn ảnh và video YouTube ngay trong bài viết.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Ảnh cover</label>
                  <label className="relative flex h-40 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-800 hover:border-rose-500/60">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover preview" className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      <div className="text-center">
                        <ImagePlus className="mx-auto mb-2 h-7 w-7 text-gray-600" />
                        <p className="text-xs text-gray-500">Nhấn để chọn ảnh</p>
                      </div>
                    )}

                    {uploadingCover && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
                      </div>
                    )}

                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
                  </label>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-400">Thêm tag</label>
                  <select
                    className="h-9 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white focus:border-rose-500 focus:outline-none"
                    value=""
                    onChange={(event) => addTag(event.target.value)}
                    disabled={loadingTags || availableTags.length === 0 || form.tag_ids.length >= 3}
                  >
                    <option value="">
                      {loadingTags
                        ? "Đang tải danh sách tag..."
                        : availableTags.length === 0
                          ? "Không còn tag để thêm"
                          : "Chọn tag từ danh sách"}
                    </option>
                    {availableTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Chọn tối đa 3 tag. Tag được quản lý ở mục Tag.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-400">Tag đã chọn</label>
                  {selectedTags.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-800 px-3 py-3 text-xs text-gray-500">
                      Chưa có tag nào được chọn.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => removeTag(tag.id)}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                            form.primary_tag_id === tag.id
                              ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                              : "border-gray-800 bg-gray-900 text-gray-300"
                          }`}
                        >
                          <Tag className="h-3 w-3" />
                          {tag.name}
                          <X className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-400">Tag chính</label>
                  <select
                    className="h-9 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white focus:border-rose-500 focus:outline-none"
                    value={form.primary_tag_id}
                    onChange={(event) => setForm((current) => ({ ...current, primary_tag_id: event.target.value }))}
                    disabled={selectedTags.length === 0}
                  >
                    <option value="">Chọn tag chính</option>
                    {selectedTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-400">Tiêu đề SEO</label>
                  <input
                    className="h-9 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white placeholder:text-gray-600 focus:border-rose-500 focus:outline-none"
                    placeholder="Ví dụ: Top 5 nước hoa mùa hè cho nữ"
                    value={form.seo_title}
                    onChange={(event) => setForm((current) => ({ ...current, seo_title: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-400">Mô tả SEO</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-rose-500 focus:outline-none"
                    placeholder="Mô tả ngắn để hiển thị trên Google và mạng xã hội."
                    value={form.seo_description}
                    onChange={(event) => setForm((current) => ({ ...current, seo_description: event.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-400">Trạng thái</label>
                  <select
                    className="h-9 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white focus:border-rose-500 focus:outline-none"
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as BlogStatus }))}
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="published">Đã đăng</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-400">Ngày đăng</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      type="datetime-local"
                      className="h-9 w-full rounded-lg border border-gray-800 bg-gray-900 pl-9 pr-3 text-sm text-white focus:border-rose-500 focus:outline-none"
                      value={form.published_at}
                      onChange={(event) => setForm((current) => ({ ...current, published_at: event.target.value }))}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Để trống nếu muốn hệ thống tự dùng thời điểm hiện tại khi đăng.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white"
                onClick={() => setShowModal(false)}
              >
                Hủy
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-rose-500 text-white hover:bg-rose-600"
              >
                {saving ? "Đang lưu..." : "Lưu bài viết"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-6">
            <h3 className="mb-2 text-lg font-semibold text-white">Xóa bài viết?</h3>
            <p className="mb-6 text-sm text-gray-400">
              Bạn có chắc chắn muốn xóa “{deleteTarget.title}”? Hành động này không thể hoàn tác.
            </p>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white"
                onClick={() => setDeleteTarget(null)}
              >
                Hủy
              </Button>

              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                {deleting ? "Đang xóa..." : "Xóa"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
