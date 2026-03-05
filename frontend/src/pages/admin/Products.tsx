import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Package, Plus, Pencil, Trash2, Search, AlertCircle,
  ImagePlus, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminGet,
  adminPost,
  adminPut,
  adminDel,
  adminUploadImage,
  type AdminProduct,
  type Category,
  type PaginatedResponse,
} from "@/lib/admin-api";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const EMPTY_FORM = {
  category_id:    "",
  name:           "",
  slug:           "",
  price:          "",
  original_price: "",
  image_url:      "",
  badge:          "",
  description:    "",
  material:       "",
  care:           "",
  in_stock:       true,
  stock:          "0",
};

type FormState = typeof EMPTY_FORM;

function formatVnd(n: number) {
  return n.toLocaleString("vi-VN") + " ₫";
}

function slugify(s: string) {
  return s
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
}

export default function AdminProducts() {
  const [data,       setData]       = useState<PaginatedResponse<AdminProduct> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // Filters
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState("");
  const [page,       setPage]       = useState(1);

  // Modal
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<AdminProduct | null>(null);
  const [form,       setForm]       = useState<FormState>(EMPTY_FORM);
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);
  const [imgPreview, setImgPreview] = useState<string>("");
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "15" });
      if (search.trim())  params.set("search",      search.trim());
      if (catFilter)      params.set("category_id", catFilter);
      const res = await adminGet<PaginatedResponse<AdminProduct>>(`/api/admin/products?${params}`);
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    adminGet<Category[]>("/api/admin/categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); load(1); }, [search, catFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(page); }, [page]);                       // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSlugEdited(false);
    setImgPreview("");
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (p: AdminProduct) => {
    setEditing(p);
    setForm({
      category_id:    p.category_id,
      name:           p.name,
      slug:           p.slug,
      price:          String(p.price),
      original_price: p.original_price != null ? String(p.original_price) : "",
      image_url:      p.image_url,
      badge:          p.badge ?? "",
      description:    p.description ?? "",
      material:       "",
      care:           "",
      in_stock:       p.in_stock,
      stock:          String(p.stock),
    });
    setSlugEdited(false);
    setImgPreview(p.image_url.startsWith("/") ? `${API_URL}${p.image_url}` : p.image_url);
    setFormError(null);
    setShowModal(true);
  };

  const handleNameChange = (name: string) =>
    setForm((f) => ({ ...f, name, slug: slugEdited ? f.slug : slugify(name) }));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await adminUploadImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      // Cloudinary returns a full https:// URL; legacy /uploads/* needs the API prefix
      setImgPreview(url.startsWith("/") ? `${API_URL}${url}` : url);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim())       { setFormError("Tên sản phẩm là bắt buộc"); return; }
    if (!form.category_id)       { setFormError("Vui lòng chọn danh mục"); return; }
    if (!form.price || +form.price <= 0) { setFormError("Giá phải lớn hơn 0"); return; }
    if (!form.image_url)         { setFormError("Vui lòng thêm ảnh sản phẩm"); return; }

    setSaving(true);
    setFormError(null);
    try {
      const body = {
        category_id:    form.category_id,
        name:           form.name,
        slug:           form.slug || slugify(form.name),
        price:          Number(form.price),
        original_price: form.original_price ? Number(form.original_price) : null,
        image_url:      form.image_url,
        badge:          form.badge || null,
        description:    form.description || null,
        material:       form.material || null,
        care:           form.care || null,
        in_stock:       form.in_stock,
        stock:          Number(form.stock),
      };
      if (editing) {
        await adminPut(`/api/admin/products/${editing.id}`, body);
      } else {
        await adminPost("/api/admin/products", body);
      }
      setShowModal(false);
      await load(page);
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
      await adminDel(`/api/admin/products/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load(page);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = data?.total_pages ?? 1;

  return (
    <AdminLayout title="Quản lý Sản phẩm">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 placeholder:text-gray-600"
            placeholder="Tìm theo tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Button onClick={openCreate} className="bg-rose-500 hover:bg-rose-600 text-white gap-2 ml-auto">
          <Plus className="w-4 h-4" /> Thêm sản phẩm
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
        <>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium w-14">Ảnh</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Tên sản phẩm</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Danh mục</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Giá</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium hidden lg:table-cell">Tồn kho</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">Trạng thái</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(!data || !data.items || data.items.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                      Không tìm thấy sản phẩm
                    </td>
                  </tr>
                ) : (
                  data.items.map((p) => (
                    <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <img
                          src={p.image_url.startsWith("/") ? `${API_URL}${p.image_url}` : p.image_url}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-800"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white truncate max-w-[200px]">{p.name}</p>
                        {p.badge && (
                          <span className="text-xs text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            {p.badge}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{p.category_name}</td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-white font-medium">{formatVnd(p.price)}</p>
                        {p.original_price && (
                          <p className="text-xs text-gray-500 line-through">{formatVnd(p.original_price)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell text-gray-300">{p.stock}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          p.in_stock
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {p.in_stock ? "Còn hàng" : "Hết hàng"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>Tổng {data?.total ?? 0} sản phẩm</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl shadow-2xl mb-8">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                {editing ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left col */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Tên sản phẩm *</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="VD: Túi tote handmade"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Slug</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-rose-500"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      setForm((f) => ({ ...f, slug: e.target.value }));
                    }}
                    placeholder="tui-tote-handmade"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Danh mục *</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    value={form.category_id}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Giá bán (₫) *</label>
                    <input
                      type="number" min="0"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="185000"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Giá gốc (₫)</label>
                    <input
                      type="number" min="0"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                      value={form.original_price}
                      onChange={(e) => setForm((f) => ({ ...f, original_price: e.target.value }))}
                      placeholder="250000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Tồn kho</label>
                    <input
                      type="number" min="0"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                      value={form.stock}
                      onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Badge</label>
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                      value={form.badge}
                      onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                      placeholder="Mới, Hot, Sale..."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-400">Còn hàng</label>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, in_stock: !f.in_stock }))}
                    className={`relative inline-flex w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none ${form.in_stock ? "bg-rose-500" : "bg-gray-600"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.in_stock ? "translate-x-5" : "translate-x-1"}`} />
                  </button>
                  <span className={`text-xs font-medium ${form.in_stock ? "text-emerald-400" : "text-gray-500"}`}>
                    {form.in_stock ? "Còn hàng" : "Hết hàng"}
                  </span>
                </div>
              </div>

              {/* Right col */}
              <div className="space-y-4">
                {/* Image upload */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Ảnh sản phẩm *</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 rounded-xl h-40 flex items-center justify-center cursor-pointer hover:border-rose-500/50 transition-colors overflow-hidden"
                  >
                    {imgPreview ? (
                      <img src={imgPreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <ImagePlus className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">
                          {uploading ? "Đang tải lên..." : "Nhấn để chọn ảnh"}
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
                  <p className="text-xs text-gray-600 mt-1">Hoặc nhập URL trực tiếp:</p>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 mt-1"
                    value={form.image_url}
                    onChange={(e) => {
                      const url = e.target.value;
                      setForm((f) => ({ ...f, image_url: url }));
                      setImgPreview(url);
                    }}
                    placeholder="https://... hoặc /uploads/..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Mô tả</label>
                  <textarea
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 resize-none"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Mô tả sản phẩm..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Chất liệu</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    value={form.material}
                    onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                    placeholder="100% cotton hữu cơ..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Hướng dẫn bảo quản</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    value={form.care}
                    onChange={(e) => setForm((f) => ({ ...f, care: e.target.value }))}
                    placeholder="Giặt tay, không ngâm..."
                  />
                </div>
              </div>
            </div>

            {formError && (
              <div className="mx-6 mb-4 text-xs text-red-400 flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formError}
              </div>
            )}

            <div className="px-6 py-4 border-t border-gray-800 flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowModal(false)} className="text-gray-400">Huỷ</Button>
              <Button onClick={handleSave} disabled={saving || uploading} className="bg-rose-500 hover:bg-rose-600 text-white">
                {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo sản phẩm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-base font-semibold text-white mb-2">Xác nhận xoá sản phẩm</h2>
            <p className="text-sm text-gray-400 mb-6">
              Bạn có chắc muốn xoá <strong className="text-white">"{deleteTarget.name}"</strong>?
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-gray-400">Huỷ</Button>
              <Button onClick={handleDelete} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">
                {deleting ? "Đang xoá..." : "Xoá sản phẩm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

