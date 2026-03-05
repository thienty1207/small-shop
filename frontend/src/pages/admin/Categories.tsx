import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Tag, Plus, Pencil, Trash2, AlertCircle, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminGet,
  adminPost,
  adminPut,
  adminDel,
  adminUploadImage,
  type Category,
} from "@/lib/admin-api";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // Modal state
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<Category | null>(null);
  const [form,       setForm]       = useState({ name: "", slug: "", image_url: "" });
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);

  // Image upload
  const [imgPreview, setImgPreview] = useState("");
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGet<Category[]>("/api/admin/categories");
      setCategories(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", image_url: "" });
    setImgPreview("");
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug, image_url: cat.image_url ?? "" });
    setImgPreview(cat.image_url ?? "");
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("Tên danh mục là bắt buộc"); return; }
    setSaving(true);
    setFormError(null);
    try {
      const body = { name: form.name, slug: form.slug || undefined, image_url: form.image_url || undefined };
      if (editing) {
        await adminPut(`/api/admin/categories/${editing.id}`, body);
      } else {
        await adminPost("/api/admin/categories", body);
      }
      setShowModal(false);
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDel(`/api/admin/categories/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[àáảãạăắặằẳẵâấầẩẫậ]/g, "a")
      .replace(/[èéẹẻẽêếềệểễ]/g, "e")
      .replace(/[ìíịỉĩ]/g, "i")
      .replace(/[òóọỏõôốồộổỗơớờợởỡ]/g, "o")
      .replace(/[ùúụủũưứừựửữ]/g, "u")
      .replace(/[ỳýỵỷỹ]/g, "y")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setForm((f) => ({ ...f, name, slug }));
  };

  // Image file upload handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await adminUploadImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      setImgPreview(url.startsWith("/") ? `${API_URL}${url}` : url);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <AdminLayout title="Danh mục sản phẩm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-gray-400">
          <Tag className="w-5 h-5" />
          <span className="text-sm">{categories.length} danh mục</span>
        </div>
        <Button onClick={openCreate} className="bg-rose-500 hover:bg-rose-600 text-white gap-2">
          <Plus className="w-4 h-4" /> Thêm danh mục
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Đang tải...</div>
      ) : error ? (
        <div className="text-center py-20 text-red-400 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Hình ảnh</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Tên</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Slug</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-500">
                    Chưa có danh mục nào
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      {cat.image_url ? (
                        <img
                          src={cat.image_url.startsWith("/") ? `${API_URL}${cat.image_url}` : cat.image_url}
                          alt={cat.name}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-800"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                          <Tag className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{cat.name}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{cat.slug}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cat)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-base font-semibold text-white">
                {editing ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Tên danh mục *</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="VD: Túi xách thủ công"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Slug (URL)</label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-rose-500"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="tui-xach-thu-cong"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Ảnh đại diện danh mục</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-700 rounded-xl h-36 flex items-center justify-center cursor-pointer hover:border-rose-500/50 transition-colors overflow-hidden"
                >
                  {imgPreview ? (
                    <img src={imgPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <ImagePlus className="w-7 h-7 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">
                        {uploading ? "Đang tải lên Cloudinary..." : "Nhấn để chọn ảnh từ thiết bị"}
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {imgPreview && (
                  <button
                    type="button"
                    onClick={() => { setImgPreview(""); setForm((f) => ({ ...f, image_url: "" })); }}
                    className="mt-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Xoá ảnh
                  </button>
                )}
              </div>
              {formError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formError}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowModal(false)} className="text-gray-400">Huỷ</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-rose-500 hover:bg-rose-600 text-white">
                {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo danh mục"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-2">Xác nhận xoá</h2>
            <p className="text-sm text-gray-400 mb-6">
              Bạn có chắc muốn xoá danh mục <strong className="text-white">"{deleteTarget.name}"</strong>?
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-gray-400">Huỷ</Button>
              <Button onClick={handleDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">
                {deleting ? "Đang xoá..." : "Xoá"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
