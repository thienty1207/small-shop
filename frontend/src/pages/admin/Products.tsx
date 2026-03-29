import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Package, Plus, Pencil, Trash2, Search, AlertCircle,
  ImagePlus, ChevronLeft, ChevronRight, X, PlusCircle, Minus, GripVertical, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminGet,
  adminDownload,
  adminPost,
  adminPut,
  adminDel,
  adminUploadImage,
  type AdminProduct,
  type Category,
  type PaginatedResponse,
} from "@/lib/admin-api";
import {
  FRAGRANCE_GENDER_OPTIONS,
  HOMEPAGE_SECTION_OPTIONS,
  FRAGRANCE_LINE_OPTIONS,
} from "@/lib/fragrance";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const EMPTY_FORM = {
  category_id:    "",
  name:           "",
  slug:           "",
  price:          "",
  original_price: "",
  image_url:      "",
  image_url_2:    "",
  image_url_3:    "",
  image_url_4:    "",
  badge:          "",
  homepage_section: "",
  description:    "",
  top_note:       "",
  mid_note:       "",
  base_note:      "",
  care:           "",
  in_stock:       true,
  stock:          "0",
  brand:          "",
  concentration:  "",
  fragrance_gender: "",
  fragrance_line: "",
};

type FormState = typeof EMPTY_FORM;
type GallerySlot = 2 | 3 | 4;

interface VariantRow {
  ml:             string;
  price:          string;
  original_price: string;
  stock:          string;
  is_default:     boolean;
}

const EMPTY_VARIANT: VariantRow = { ml: "", price: "", original_price: "", stock: "0", is_default: false };

function buildFormFromProduct(p: AdminProduct): FormState {
  const imgs = p.images ?? [];

  return {
    category_id:    p.category_id,
    name:           p.name,
    slug:           p.slug,
    price:          String(p.price),
    original_price: p.original_price != null ? String(p.original_price) : "",
    image_url:      p.image_url,
    image_url_2:    imgs[0] ?? "",
    image_url_3:    imgs[1] ?? "",
    image_url_4:    imgs[2] ?? "",
    badge:          sanitizeBadgeValue(p.badge),
    homepage_section: p.homepage_section ?? "",
    description:    p.description ?? "",
    top_note:       p.top_note ?? "",
    mid_note:       p.mid_note ?? "",
    base_note:      p.base_note ?? "",
    care:           p.care ?? "",
    in_stock:       p.in_stock,
    stock:          String(p.stock),
    brand:          p.brand ?? "",
    concentration:  p.concentration ?? "",
    fragrance_gender: p.fragrance_gender ?? "",
    fragrance_line: p.fragrance_line ?? "",
  };
}

function formatVnd(n: number) {
  return n.toLocaleString("vi-VN") + " ₫";
}

// ─── Reusable image upload slot ─────────────────────────────────────────────

interface ImageUploadSlotProps {
  preview: string;
  uploading: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  label: string;
  small?: boolean;
}

function ImageUploadSlot({ preview, uploading, onFileSelect, onClear, inputRef, label, small = false }: ImageUploadSlotProps) {
  return (
    <div className="relative">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        title={label}
        className={`relative border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden transition-colors ${small ? "h-24" : "h-40"} ${
          uploading ? "border-rose-500/50 cursor-wait" : "border-gray-700 cursor-pointer hover:border-rose-500/50"
        }`}
      >
        {preview ? (
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center">
            <ImagePlus className={`text-gray-600 mx-auto ${small ? "w-5 h-5 mb-1" : "w-8 h-8 mb-2"}`} />
            {!small && <p className="text-xs text-gray-500">Nhấn để chọn ảnh</p>}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <svg className="animate-spin w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
            </svg>
          </div>
        )}
      </div>
      {/* Clear button */}
      {preview && !uploading && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors z-10"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelect} />
    </div>
  );
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

function sanitizeBadgeValue(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "sale" || normalized === "giảm giá" || normalized === "giam gia" || normalized === "giam-gia") {
    return "";
  }
  return value ?? "";
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
  const [variants,   setVariants]   = useState<VariantRow[]>([]);
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);
  const [imgPreview,  setImgPreview]  = useState<string>("");
  const [imgPreview2, setImgPreview2] = useState<string>("");
  const [imgPreview3, setImgPreview3] = useState<string>("");
  const [imgPreview4, setImgPreview4] = useState<string>("");
  const [uploading,   setUploading]   = useState(false);
  const [uploading2,  setUploading2]  = useState(false);
  const [uploading3,  setUploading3]  = useState(false);
  const [uploading4,  setUploading4]  = useState(false);
  const [draggingSlot, setDraggingSlot] = useState<GallerySlot | null>(null);
  const fileRef  = useRef<HTMLInputElement>(null);
  const fileRef2 = useRef<HTMLInputElement>(null);
  const fileRef3 = useRef<HTMLInputElement>(null);
  const fileRef4 = useRef<HTMLInputElement>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportFormat, setExportFormat] = useState<"csv" | "excel">("csv");
  const [exporting, setExporting] = useState(false);

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
    setVariants([]);
    setSlugEdited(false);
    setImgPreview(""); setImgPreview2(""); setImgPreview3(""); setImgPreview4("");
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (p: AdminProduct) => {
    setEditing(p);
    const imgs = p.images ?? [];
    setForm(buildFormFromProduct(p));
    // Load existing variants from the server
    setVariants([]);
    import("@/lib/admin-api").then(({ adminGet }) => {
      adminGet<{ product: AdminProduct; variants: { ml: number; price: number; original_price?: number; stock: number; is_default: boolean }[] }>(`/api/admin/products/${p.id}`)
        .then((res) => {
          if (res.product) {
            setForm(buildFormFromProduct(res.product));
          }
          setVariants(
            res.variants.map((v) => ({
              ml:             String(v.ml),
              price:          String(v.price),
              original_price: v.original_price != null ? String(v.original_price) : "",
              stock:          String(v.stock),
              is_default:     v.is_default,
            }))
          );
        })
        .catch(() => {});
    });
    setSlugEdited(false);
    const resolve = (u: string) => u ? (u.startsWith("/") ? `${API_URL}${u}` : u) : "";
    setImgPreview(resolve(p.image_url));
    setImgPreview2(resolve(imgs[0] ?? ""));
    setImgPreview3(resolve(imgs[1] ?? ""));
    setImgPreview4(resolve(imgs[2] ?? ""));
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
    setFormError(null);
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

  const makeGalleryFileHandler = (
    slot: 2 | 3 | 4,
    setPreview: (v: string) => void,
    setUpload: (v: boolean) => void,
    ref: React.RefObject<HTMLInputElement>,
  ) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUpload(true);
    setFormError(null);
    try {
      const url = await adminUploadImage(file);
      const key = `image_url_${slot}` as "image_url_2" | "image_url_3" | "image_url_4";
      setForm((f) => ({ ...f, [key]: url }));
      setPreview(url.startsWith("/") ? `${API_URL}${url}` : url);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setUpload(false);
      if (ref.current) ref.current.value = "";
    }
  };

  const handleFileSelect2 = makeGalleryFileHandler(2, setImgPreview2, setUploading2, fileRef2);
  const handleFileSelect3 = makeGalleryFileHandler(3, setImgPreview3, setUploading3, fileRef3);
  const handleFileSelect4 = makeGalleryFileHandler(4, setImgPreview4, setUploading4, fileRef4);

  const readGallerySlot = (slot: GallerySlot) => {
    switch (slot) {
      case 2: return { url: form.image_url_2, preview: imgPreview2 };
      case 3: return { url: form.image_url_3, preview: imgPreview3 };
      case 4: return { url: form.image_url_4, preview: imgPreview4 };
    }
  };

  const swapGallerySlots = (from: GallerySlot, to: GallerySlot) => {
    const fromData = readGallerySlot(from);
    const toData = readGallerySlot(to);

    setForm((f) => ({
      ...f,
      image_url_2: from === 2 ? toData.url : to === 2 ? fromData.url : f.image_url_2,
      image_url_3: from === 3 ? toData.url : to === 3 ? fromData.url : f.image_url_3,
      image_url_4: from === 4 ? toData.url : to === 4 ? fromData.url : f.image_url_4,
    }));

    setImgPreview2(from === 2 ? toData.preview : to === 2 ? fromData.preview : imgPreview2);
    setImgPreview3(from === 3 ? toData.preview : to === 3 ? fromData.preview : imgPreview3);
    setImgPreview4(from === 4 ? toData.preview : to === 4 ? fromData.preview : imgPreview4);
  };

  const handleGalleryDragStart = (slot: GallerySlot) => (e: React.DragEvent<HTMLDivElement>) => {
    const { url } = readGallerySlot(slot);
    if (!url) {
      e.preventDefault();
      return;
    }
    setDraggingSlot(slot);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(slot));
  };

  const handleGalleryDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleGalleryDrop = (target: GallerySlot) => async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const from = (draggingSlot ?? Number(e.dataTransfer.getData("text/plain"))) as GallerySlot;
    setDraggingSlot(null);
    if (!from || from === target) return;

    const fromData = readGallerySlot(from);
    const toData = readGallerySlot(target);

    const next = {
      2: from === 2 ? toData.url : target === 2 ? fromData.url : form.image_url_2,
      3: from === 3 ? toData.url : target === 3 ? fromData.url : form.image_url_3,
      4: from === 4 ? toData.url : target === 4 ? fromData.url : form.image_url_4,
    };

    swapGallerySlots(from, target);

    if (editing) {
      const images = [next[2], next[3], next[4]].filter((u) => u.trim() !== "");
      try {
        await adminPut(`/api/admin/products/${editing.id}/images/reorder`, { images });
      } catch {
        // ignore background sync error; final save still persists
      }
    }
  };

  const handleSave = async () => {
    if (!form.fragrance_gender) { setFormError("Vui lòng chọn đối tượng hương"); return; }
    if (!form.fragrance_line)   { setFormError("Vui lòng chọn dòng nước hoa"); return; }
    if (!form.name.trim())      { setFormError("Tên sản phẩm là bắt buộc"); return; }
    if (!form.category_id)      { setFormError("Vui lòng chọn danh mục"); return; }
    if (!form.image_url)        { setFormError("Vui lòng thêm ảnh sản phẩm"); return; }
    // Price required only when there are no variants
    if (variants.length === 0 && (!form.price || +form.price <= 0)) {
      setFormError("Giá phải lớn hơn 0 (hoặc thêm dung tích bên dưới)"); return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const parsedVariants = variants
        .filter((v) => v.ml && v.price)
        .map((v, i) => ({
          ml:             Number(v.ml),
          price:          Number(v.price),
          original_price: v.original_price ? Number(v.original_price) : null,
          stock:          Number(v.stock) || 0,
          is_default:     i === 0,
        }));

      const body = {
        category_id:    form.category_id,
        name:           form.name,
        slug:           form.slug || slugify(form.name),
        price:          parsedVariants.length ? Math.min(...parsedVariants.map((v) => v.price)) : Number(form.price),
        original_price: form.original_price ? Number(form.original_price) : null,
        image_url:      form.image_url,
        images:         [form.image_url_2, form.image_url_3, form.image_url_4].filter((u) => u.trim() !== ""),
        badge:          sanitizeBadgeValue(form.badge) || null,
        homepage_section: form.homepage_section || null,
        description:    form.description || null,
        top_note:       form.top_note || null,
        mid_note:       form.mid_note || null,
        base_note:      form.base_note || null,
        care:           form.care || null,
        in_stock:       parsedVariants.length ? parsedVariants.some((v) => v.stock > 0) : form.in_stock,
        stock:          parsedVariants.length ? parsedVariants.reduce((s, v) => s + v.stock, 0) : Number(form.stock),
        brand:          form.brand || null,
        concentration:  form.concentration || null,
        fragrance_gender: form.fragrance_gender,
        fragrance_line: form.fragrance_line,
        variants:       parsedVariants,
      };
      const savedProduct = editing
        ? await adminPut<AdminProduct>(`/api/admin/products/${editing.id}`, body)
        : await adminPost<AdminProduct>("/api/admin/products", body);

      if ((savedProduct.homepage_section ?? null) !== (body.homepage_section ?? null)) {
        throw new Error(
          "Backend chÆ°a lÆ°u Ä‘Æ°á»£c 'Section trang chá»§'. HÃ£y restart backend báº£n má»›i vÃ  cháº¡y migration 025 trÆ°á»›c khi dÃ¹ng feature nÃ y.",
        );
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

  const productsExportPath = (() => {
    const params = new URLSearchParams();
    if (exportFrom) params.set("from", new Date(`${exportFrom}T00:00:00.000Z`).toISOString());
    if (exportTo) params.set("to", new Date(`${exportTo}T23:59:59.999Z`).toISOString());
    params.set("format", exportFormat);
    const q = params.toString();
    return `/api/admin/products/export${q ? `?${q}` : ""}`;
  })();

  const handleExportProducts = async () => {
    setExporting(true);
    try {
      await adminDownload(
        productsExportPath,
        `products.${exportFormat === "excel" ? "xls" : "csv"}`,
      );
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout title="Quản lý Sản phẩm">
      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="h-9 w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 text-sm text-white focus:outline-none focus:border-rose-500 placeholder:text-gray-600"
            placeholder="Tìm theo tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 bg-gray-900 border border-gray-800 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-rose-500"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Button onClick={openCreate} className="h-9 bg-rose-500 hover:bg-rose-600 text-white gap-2 xl:ml-auto">
          <Plus className="w-4 h-4" /> Thêm sản phẩm
        </Button>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Từ</label>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="h-9 bg-gray-900 border border-gray-800 rounded-lg px-2.5 text-xs text-gray-300 focus:outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Đến</label>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="h-9 bg-gray-900 border border-gray-800 rounded-lg px-2.5 text-xs text-gray-300 focus:outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as "csv" | "excel")}
              className="h-9 bg-gray-900 border border-gray-800 rounded-lg px-2.5 text-xs text-gray-300 focus:outline-none focus:border-rose-500"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
            </select>
          </div>
          <Button
            type="button"
            onClick={handleExportProducts}
            disabled={exporting}
            className="h-9 inline-flex items-center gap-1.5 px-3 text-xs rounded-lg border border-gray-700 bg-transparent text-gray-300 hover:text-white hover:border-gray-500"
          >
            <Download className="w-3.5 h-3.5" /> {exporting ? "Đang xuất..." : "Xuất báo cáo"}
          </Button>
        </div>
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
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
                {variants.length === 0 ? (
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
                ) : (
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400">💡 Giá hiển thị = giá thấp nhất trong các dung tích bên dưới</p>
                  </div>
                )}
                {variants.length === 0 && (
                  <>
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
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                      value={form.badge}
                      onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                    >
                      <option value="">Mặc định (không hiển thị section)</option>
                      <option value="Mới">Mới — Dòng Sản Phẩm Mới</option>
                      <option value="Nổi Bật">Nổi Bật — Sản Phẩm Nổi Bật</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Section trang chủ</label>
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                      value={form.homepage_section}
                      onChange={(e) => setForm((f) => ({ ...f, homepage_section: e.target.value }))}
                    >
                      <option value="">Không hiển thị trong section giới tính</option>
                      {HOMEPAGE_SECTION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Chỉ những sản phẩm chọn ở đây mới được đẩy lên section Nam, Nữ hoặc Unisex trên trang chủ.
                    </p>
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
                  </>
                )}
                {variants.length > 0 && (
                  <>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Badge</label>
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                      value={form.badge}
                      onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                    >
                      <option value="">Mặc định (không hiển thị section)</option>
                      <option value="Mới">Mới — Dòng Sản Phẩm Mới</option>
                      <option value="Nổi Bật">Nổi Bật — Sản Phẩm Nổi Bật</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Section trang chủ</label>
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                      value={form.homepage_section}
                      onChange={(e) => setForm((f) => ({ ...f, homepage_section: e.target.value }))}
                    >
                      <option value="">Không hiển thị trong section giới tính</option>
                      {HOMEPAGE_SECTION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  </>
                )}

              </div>

              {/* Right col */}
              <div className="space-y-4">
                {/* Thumbnail image (required) */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Ảnh thumbnail *</label>
                  <ImageUploadSlot
                    preview={imgPreview}
                    uploading={uploading}
                    onFileSelect={handleFileSelect}
                    onClear={() => { setImgPreview(""); setForm((f) => ({ ...f, image_url: "" })); }}
                    inputRef={fileRef}
                    label="Ảnh chính (thumbnail)"
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

                {/* Gallery images (optional, 3 slots) */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Ảnh gallery (tuỳ chọn, tối đa 3)</label>
                  <p className="text-[11px] text-gray-500 mb-2">Kéo thả các ô để đổi thứ tự hiển thị gallery.</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div
                      className={`flex flex-col gap-1 rounded-md p-1 ${draggingSlot === 2 ? "bg-rose-500/10" : ""}`}
                      draggable={Boolean(form.image_url_2)}
                      onDragStart={handleGalleryDragStart(2)}
                      onDragOver={handleGalleryDragOver}
                      onDrop={handleGalleryDrop(2)}
                      onDragEnd={() => setDraggingSlot(null)}
                    >
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5 px-0.5">
                        <span>Ảnh 2</span>
                        <GripVertical className="w-3 h-3" />
                      </div>
                      <ImageUploadSlot
                        preview={imgPreview2}
                        uploading={uploading2}
                        onFileSelect={handleFileSelect2}
                        onClear={() => { setImgPreview2(""); setForm((f) => ({ ...f, image_url_2: "" })); }}
                        inputRef={fileRef2}
                        label="Ảnh 2"
                        small
                      />
                      <input
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-400 focus:outline-none focus:border-rose-500"
                        value={form.image_url_2}
                        onChange={(e) => { setForm((f) => ({ ...f, image_url_2: e.target.value })); setImgPreview2(e.target.value); }}
                        placeholder="URL ảnh 2"
                      />
                    </div>
                    <div
                      className={`flex flex-col gap-1 rounded-md p-1 ${draggingSlot === 3 ? "bg-rose-500/10" : ""}`}
                      draggable={Boolean(form.image_url_3)}
                      onDragStart={handleGalleryDragStart(3)}
                      onDragOver={handleGalleryDragOver}
                      onDrop={handleGalleryDrop(3)}
                      onDragEnd={() => setDraggingSlot(null)}
                    >
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5 px-0.5">
                        <span>Ảnh 3</span>
                        <GripVertical className="w-3 h-3" />
                      </div>
                      <ImageUploadSlot
                        preview={imgPreview3}
                        uploading={uploading3}
                        onFileSelect={handleFileSelect3}
                        onClear={() => { setImgPreview3(""); setForm((f) => ({ ...f, image_url_3: "" })); }}
                        inputRef={fileRef3}
                        label="Ảnh 3"
                        small
                      />
                      <input
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-400 focus:outline-none focus:border-rose-500"
                        value={form.image_url_3}
                        onChange={(e) => { setForm((f) => ({ ...f, image_url_3: e.target.value })); setImgPreview3(e.target.value); }}
                        placeholder="URL ảnh 3"
                      />
                    </div>
                    <div
                      className={`flex flex-col gap-1 rounded-md p-1 ${draggingSlot === 4 ? "bg-rose-500/10" : ""}`}
                      draggable={Boolean(form.image_url_4)}
                      onDragStart={handleGalleryDragStart(4)}
                      onDragOver={handleGalleryDragOver}
                      onDrop={handleGalleryDrop(4)}
                      onDragEnd={() => setDraggingSlot(null)}
                    >
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5 px-0.5">
                        <span>Ảnh 4</span>
                        <GripVertical className="w-3 h-3" />
                      </div>
                      <ImageUploadSlot
                        preview={imgPreview4}
                        uploading={uploading4}
                        onFileSelect={handleFileSelect4}
                        onClear={() => { setImgPreview4(""); setForm((f) => ({ ...f, image_url_4: "" })); }}
                        inputRef={fileRef4}
                        label="Ảnh 4"
                        small
                      />
                      <input
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-400 focus:outline-none focus:border-rose-500"
                        value={form.image_url_4}
                        onChange={(e) => { setForm((f) => ({ ...f, image_url_4: e.target.value })); setImgPreview4(e.target.value); }}
                        placeholder="URL ảnh 4"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Thương hiệu (Brand)</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    placeholder="VD: Jean Paul Gaultier"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Đối tượng hương *</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    value={form.fragrance_gender}
                    onChange={(e) => setForm((f) => ({ ...f, fragrance_gender: e.target.value }))}
                  >
                    <option value="">-- Chọn đối tượng hương --</option>
                    {FRAGRANCE_GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Xác định rõ sản phẩm dành cho nam, nữ hay unisex.
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Dòng nước hoa *</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    value={form.fragrance_line}
                    onChange={(e) => setForm((f) => ({ ...f, fragrance_line: e.target.value }))}
                  >
                    <option value="">-- Chọn dòng nước hoa --</option>
                    {FRAGRANCE_LINE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Phân loại rõ là designer, niche hay clone.
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Nồng độ</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    value={form.concentration}
                    onChange={(e) => setForm((f) => ({ ...f, concentration: e.target.value }))}
                  >
                    <option value="">-- Chọn nồng độ --</option>
                    <option value="Parfum">Parfum (25–40%)</option>
                    <option value="Eau de Parfum">Eau de Parfum — EDP (15–20%)</option>
                    <option value="Eau de Parfum Intense">Eau de Parfum Intense</option>
                    <option value="Eau de Toilette">Eau de Toilette — EDT (5–15%)</option>
                    <option value="Eau de Cologne">Eau de Cologne — EDC (2–5%)</option>
                    <option value="Extrait de Parfum">Extrait de Parfum</option>
                  </select>
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
                {/* Fragrance pyramid */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2">Hương điệu (Kim tự tháp hương)</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-yellow-400 font-semibold uppercase w-16 shrink-0">Nốt đầu</span>
                      <input
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                        value={form.top_note}
                        onChange={(e) => setForm((f) => ({ ...f, top_note: e.target.value }))}
                        placeholder="Cam bergamot, Chanh, Hoa cam..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-rose-400 font-semibold uppercase w-16 shrink-0">Nốt giữa</span>
                      <input
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                        value={form.mid_note}
                        onChange={(e) => setForm((f) => ({ ...f, mid_note: e.target.value }))}
                        placeholder="Hoa nhài, Hoa hồng, Iris..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-700 font-semibold uppercase w-16 shrink-0">Nốt cuối</span>
                      <input
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                        value={form.base_note}
                        onChange={(e) => setForm((f) => ({ ...f, base_note: e.target.value }))}
                        placeholder="Gỗ đàn hương, Xạ hương, Hổ phách..."
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Cách dùng / Bảo quản</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    value={form.care}
                    onChange={(e) => setForm((f) => ({ ...f, care: e.target.value }))}
                    placeholder="Xịt lên cổ tay, sau tai. Bảo quản nơi thoáng mát."
                  />
                </div>
              </div>
            </div>

            {/* ── Variants repeater ── */}
            <div className="px-6 pb-5 border-t border-gray-800 pt-5">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-semibold text-white">Dung tích & Giá</label>
                <button
                  type="button"
                  onClick={() => setVariants((v) => [...v, { ...EMPTY_VARIANT }])}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Thêm dung tích
                </button>
              </div>
              {variants.length === 0 && (
                <p className="text-xs text-gray-600 italic">Chưa có dung tích — giá sẽ lấy từ trường "Giá bán" bên trên.</p>
              )}
              {variants.length > 0 && (
                <>
                  {/* Column headers */}
                  <div className="grid grid-cols-[70px_1fr_1fr_80px_28px] gap-2 mb-2 px-1">
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">ML</span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Giá bán (₫)</span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Giá gốc (₫)</span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide text-center">Tồn kho</span>
                    <span></span>
                  </div>
                  {variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-[70px_1fr_1fr_80px_28px] gap-2 items-center mb-2">
                      <input
                        type="number" min="1"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-rose-500 text-center"
                        value={v.ml}
                        onChange={(e) => setVariants((vs) => vs.map((x, j) => j === i ? { ...x, ml: e.target.value } : x))}
                        placeholder="100"
                      />
                      <input
                        type="number" min="0"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                        value={v.price}
                        onChange={(e) => setVariants((vs) => vs.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                        placeholder="VD: 850000"
                      />
                      <input
                        type="number" min="0"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                        value={v.original_price}
                        onChange={(e) => setVariants((vs) => vs.map((x, j) => j === i ? { ...x, original_price: e.target.value } : x))}
                        placeholder="VD: 1200000"
                      />
                      <input
                        type="number" min="0"
                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-rose-500 text-center"
                        value={v.stock}
                        onChange={(e) => setVariants((vs) => vs.map((x, j) => j === i ? { ...x, stock: e.target.value } : x))}
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))}
                        className="text-gray-600 hover:text-red-400 transition-colors flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <p className="text-[11px] text-gray-600 mt-2">Hàng đầu tiên = mặc định. Giá hiển thị trên trang shop = giá thấp nhất.</p>
                </>
              )}
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

