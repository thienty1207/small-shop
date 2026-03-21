import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Paintbrush, Save, AlertCircle, CheckCircle2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminGet, adminPut, adminUploadImage } from "@/lib/admin-api";
import { useShopSettingsCtx } from "@/contexts/ShopSettingsContext";

// ─── Google Fonts options ────────────────────────────────────────────────────
const GOOGLE_FONTS = [
  { label: "Inter",            value: "Inter" },
  { label: "Nunito",           value: "Nunito" },
  { label: "Lato",             value: "Lato" },
  { label: "Roboto",           value: "Roboto" },
  { label: "Open Sans",        value: "Open Sans" },
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Poppins",          value: "Poppins" },
  { label: "Outfit",           value: "Outfit" },
  { label: "DM Sans",          value: "DM Sans" },
  { label: "Montserrat",       value: "Montserrat" },
  { label: "Raleway",          value: "Raleway" },
  { label: "Josefin Sans",     value: "Josefin Sans" },
];

// ─── Appearance keys ─────────────────────────────────────────────────────────
const SLIDE_KEYS = [1, 2, 3].flatMap((n) => [
  `hero_slide_${n}_img`,
  `hero_slide_${n}_title`,
  `hero_slide_${n}_subtitle`,
  `hero_slide_${n}_cta`,
  `hero_slide_${n}_href`,
]);

const BANNER_KEYS = ["banner_image_url", "banner_link", "banner_title", "banner_subtitle"];
const BRAND_KEYS  = [
  "brand_section_title",
  ...[1, 2, 3].flatMap((n) => [
    `brand_slide_${n}_img`,
    `brand_slide_${n}_thumbnail`,
    `brand_slide_${n}_href`,
  ]),
];
const FONT_KEYS   = ["shop_font"];
const ALL_KEYS    = [...SLIDE_KEYS, ...BANNER_KEYS, ...BRAND_KEYS, ...FONT_KEYS];

function buildGoogleFontHref(fontFamily: string): string {
  const encoded = fontFamily.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;600;700&display=swap`;
}

// ─── Image upload button ────────────────────────────────────────────────────

interface ImgUploadProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
}

function ImgUpload({ value, onChange, label }: ImgUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await adminUploadImage(file);
      onChange(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {/* Preview + overlay */}
      <div className="relative w-full rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
        {value ? (
          <>
            <img
              src={value}
              alt="preview"
              loading="lazy"
              decoding="async"
              className="w-full h-32 object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div
            onClick={() => !uploading && ref.current?.click()}
            className="h-32 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-700 transition-colors"
          >
            {uploading ? (
              <svg className="animate-spin w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
            ) : (
              <>
                <ImagePlus className="w-6 h-6 text-gray-500" />
                <p className="text-xs text-gray-500">Nhấn để upload từ máy</p>
              </>
            )}
          </div>
        )}
        {/* If image is already set, show upload-replace button at bottom */}
        {value && !uploading && (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2.5 py-1 rounded-lg hover:bg-black/80 transition-colors"
          >
            Đổi ảnh
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {/* URL input fallback */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://... (hoặc upload từ máy)"
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function AdminSettingsAppearance() {
  const { refreshSettings } = useShopSettingsCtx();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    adminGet<Record<string, string>>("/api/admin/settings")
      .then((data) => {
        const filtered: Record<string, string> = {};
        ALL_KEYS.forEach((k) => { filtered[k] = data[k] ?? ""; });
        setValues(filtered);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  // Inject Google Fonts link for font picker previews (browser-only, idempotent)
  const selectedFont = values["shop_font"] || "Inter";

  useEffect(() => {
    const href = buildGoogleFontHref(selectedFont);

    let link = document.querySelector("link[data-settings-selected-font]") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.dataset.settingsSelectedFont = "1";
      document.head.appendChild(link);
    }

    if (link.href !== href) {
      link.href = href;
    }
  }, [selectedFont]);

  const set = (key: string, val: string) => setValues((v) => ({ ...v, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await adminPut<Record<string, string>>("/api/admin/settings", { settings: values });
      const filtered: Record<string, string> = {};
      ALL_KEYS.forEach((k) => { filtered[k] = updated[k] ?? values[k] ?? ""; });
      setValues(filtered);
      await refreshSettings();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const textField = (key: string, label: string, placeholder?: string) => (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <input
        type="text"
        value={values[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500"
      />
    </div>
  );

  return (
    <AdminLayout title="Giao diện cửa hàng">
      <div className="flex items-center gap-2 text-gray-400 mb-6">
        <Paintbrush className="w-5 h-5" />
        <span className="text-sm">Tuỳ chỉnh nội dung hiển thị trang chủ</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Đang tải...</div>
      ) : (
        <div className="max-w-2xl space-y-6">

          {/* ── Hero Slides ─────────────────────────────────────────────── */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-6">
            <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3">
              Hero Slides (tối đa 3 slides)
            </h3>
            <p className="text-xs text-gray-500 -mt-2">
              Upload ảnh từ máy tính của bạn — ảnh sẽ được lưu lên Cloudinary tự động.
              Nếu tất cả 3 slides để trống, trang chủ sẽ dùng ảnh mặc định.
            </p>

            {[1, 2, 3].map((n) => (
              <div key={n} className="border border-gray-700 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Slide {n}</p>
                <ImgUpload
                  label="Ảnh nền"
                  value={values[`hero_slide_${n}_img`] ?? ""}
                  onChange={(url) => set(`hero_slide_${n}_img`, url)}
                />
                <div className="grid grid-cols-2 gap-3">
                  {textField(`hero_slide_${n}_title`,    "Tiêu đề",      `VD: Quà Tặng Thủ Công`)}
                  {textField(`hero_slide_${n}_subtitle`, "Mô tả ngắn",   `VD: Được tạo ra bằng tình yêu`)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {textField(`hero_slide_${n}_cta`,  "Nút CTA",    `VD: Khám phá ngay`)}
                  {textField(`hero_slide_${n}_href`, "Link CTA",   `/products`)}
                </div>
              </div>
            ))}
          </div>

          {/* ── Promo Banner ─────────────────────────────────────────────── */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3">Banner quảng cáo</h3>
            <ImgUpload
              label="Ảnh banner"
              value={values["banner_image_url"] ?? ""}
              onChange={(url) => set("banner_image_url", url)}
            />            <div className="grid grid-cols-2 gap-3">
              {textField("banner_title",    "Tiêu đề",   "VD: Miễn phí vận chuyển hôm nay")}
              {textField("banner_subtitle", "Mô tả",      "VD: Áp dụng cho đơn hàng từ 300.000đ")}
            </div>            {textField("banner_link", "Link khi click", "/products?category=...")}
          </div>

          {/* ── Brands section ───────────────────────────────────────────── */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-5">
            <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3">Khối thương hiệu</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-xl border border-gray-700 p-3 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Ảnh slide {n}</p>
                  <ImgUpload
                    label="Thumbnail"
                    value={values[`brand_slide_${n}_img`] ?? values[`brand_slide_${n}_thumbnail`] ?? ""}
                    onChange={(url) => {
                      set(`brand_slide_${n}_img`, url);
                      set(`brand_slide_${n}_thumbnail`, url);
                    }}
                  />
                  {textField(`brand_slide_${n}_href`, "Link khi click", "/products")}
                </div>
              ))}
            </div>
          </div>

          {/* ── Google Font Picker ───────────────────────────────────────── */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3">Font chữ (Google Fonts)</h3>
              <p className="text-xs text-gray-500 mt-2">Chọn font sẽ áp dụng cho toàn bộ giao diện cửa hàng. Cần tải lại trang khách để thấy thay đổi.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GOOGLE_FONTS.map((font) => {
                const selected = (values["shop_font"] || "Inter") === font.value;
                return (
                  <button
                    key={font.value}
                    type="button"
                    onClick={() => set("shop_font", font.value)}
                    className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all ${
                      selected
                        ? "border-rose-500 bg-rose-500/10"
                        : "border-gray-700 bg-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <span
                      className="text-base text-white leading-none"
                    >
                      Aa
                    </span>
                    <span className="text-xs text-gray-400">{font.label}</span>
                    {selected && (
                      <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Đang dùng</span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Live preview */}
            <div className="mt-2 p-3 rounded-lg bg-gray-800 border border-gray-700">
              <p className="text-xs text-gray-500 mb-1.5">Xem trước</p>
              <p
                className="text-white text-sm"
                style={{ fontFamily: `'${values["shop_font"] || "Inter"}', sans-serif` }}
              >
                Cửa hàng thủ công — Quà tặng độc đáo, tạo ra bằng tình yêu
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu thành công!
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-rose-500 hover:bg-rose-600 text-white gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Đang lưu..." : "Lưu cài đặt"}
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

