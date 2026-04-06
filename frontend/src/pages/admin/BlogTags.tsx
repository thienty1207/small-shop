import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { AlertCircle, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import {
  adminDel,
  adminGet,
  adminPost,
  adminPut,
  type AdminBlogTag,
} from "@/lib/admin-api";

const EMPTY_FORM = {
  name: "",
  slug: "",
};

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

export default function AdminBlogTags() {
  const [tags, setTags] = useState<AdminBlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminBlogTag | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminBlogTag | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminGet<AdminBlogTag[]>("/api/admin/blog-tags");
      setTags(response);
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (tag: AdminBlogTag) => {
    setEditing(tag);
    setForm({ name: tag.name, slug: tag.slug });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("Tên tag là bắt buộc.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || null,
      };

      if (editing) {
        await adminPut(`/api/admin/blog-tags/${editing.id}`, body);
      } else {
        await adminPost("/api/admin/blog-tags", body);
      }

      setShowModal(false);
      await load();
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
      await adminDel(`/api/admin/blog-tags/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (nextError) {
      alert((nextError as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout title="Tag">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Tag className="h-4 w-4" />
          {tags.length} tag đang có
        </div>

        <Button onClick={openCreate} className="gap-2 bg-rose-500 text-white hover:bg-rose-600">
          <Plus className="h-4 w-4" />
          Thêm tag
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
                <th className="px-4 py-3 text-left font-medium text-gray-400">Tên tag</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Slug</th>
                <th className="hidden px-4 py-3 text-left font-medium text-gray-400 lg:table-cell">Số bài viết</th>
                <th className="px-4 py-3 text-right font-medium text-gray-400">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tags.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-gray-500">
                    Chưa có tag nào.
                  </td>
                </tr>
              ) : (
                tags.map((tag) => (
                  <tr key={tag.id} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/20">
                    <td className="px-4 py-3 font-medium text-white">{tag.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">/{tag.slug}</td>
                    <td className="hidden px-4 py-3 text-gray-400 lg:table-cell">{tag.posts_count}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(tag)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(tag)}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {editing ? "Cập nhật tag" : "Thêm tag"}
                </h2>
                <p className="text-xs text-gray-500">
                  Dùng tag để nhóm bài viết và tạo mục gợi ý theo danh mục.
                </p>
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

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Tên tag</label>
                <input
                  className="h-9 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white placeholder:text-gray-600 focus:border-rose-500 focus:outline-none"
                  placeholder="Ví dụ: Rusty"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                      slug: slugify(event.target.value),
                    }))
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-400">Slug</label>
                <input
                  className="h-9 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm text-white placeholder:text-gray-600 focus:border-rose-500 focus:outline-none"
                  placeholder="rusty"
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                />
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
                {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo tag"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-6">
            <h3 className="mb-2 text-lg font-semibold text-white">Xóa tag?</h3>
            <p className="mb-6 text-sm text-gray-400">
              Bạn có chắc chắn muốn xóa tag “{deleteTarget.name}”? Nếu tag này đang được bài viết sử dụng,
              hệ thống sẽ từ chối để tránh mất liên kết dữ liệu.
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
