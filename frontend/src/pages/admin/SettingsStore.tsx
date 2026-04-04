import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Building2, Save, AlertCircle, CheckCircle2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminGet, adminPut, adminUploadImage } from "@/lib/admin-api";
import { useShopSettingsCtx } from "@/contexts/ShopSettingsContext";
import {
  FOOTER_INFO_LINK_FIELDS,
  FOOTER_KEYS,
  FOOTER_SHOP_LINK_FIELDS,
  getSettingsWithFooterDefaults,
} from "@/lib/footer-settings";

const KEYS = [
  "store_name",
  "store_logo_url",
  "store_email",
  "store_phone",
  "store_address",
  "social_facebook",
  "social_instagram",
  "social_tiktok",
  ...FOOTER_KEYS,
];

interface LogoUploadProps {
  value: string;
  onChange: (url: string) => void;
  onCommit: (url: string) => Promise<void>;
}

function LogoUpload({ value, onChange, onCommit }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await adminUploadImage(file);
      onChange(url);
      await onCommit(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-400 mb-1.5">Logo cửa hàng (hiển thị trên Navbar)</label>
      <div className="relative w-full rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
        {value ? (
          <>
            <img
              src={value}
              alt="store-logo"
              className="w-full h-24 object-contain bg-gray-900"
              loading="lazy"
              decoding="async"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <button
              type="button"
              onClick={async () => {
                onChange("");
                await onCommit("");
              }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {!uploading && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2.5 py-1 rounded-lg hover:bg-black/80 transition-colors"
              >
                Đổi logo
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => !uploading && inputRef.current?.click()}
            className="h-24 w-full flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-700 transition-colors"
          >
            {uploading ? (
              <span className="text-xs text-rose-400">Đang upload...</span>
            ) : (
              <>
                <ImagePlus className="w-5 h-5" />
                <span className="text-xs">Nhấn để upload logo</span>
              </>
            )}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={async (e) => {
          await onCommit(e.target.value);
        }}
        placeholder="https://... (hoặc upload từ máy)"
        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function AdminSettingsStore() {
  const { refreshSettings } = useShopSettingsCtx();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    adminGet<Record<string, string>>("/api/admin/settings")
      .then((data) => {
        const filtered = getSettingsWithFooterDefaults({});
        KEYS.forEach((k) => { filtered[k] = data[k] ?? filtered[k] ?? ""; });
        setValues(filtered);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const persistLogo = async (url: string) => {
    setError(null);
    try {
      await adminPut("/api/admin/settings", { settings: { store_logo_url: url } });
      await refreshSettings();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await adminPut("/api/admin/settings", { settings: values });
      await refreshSettings();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key: string, label: string, placeholder?: string, type = "text") => (
    <div>
      <label htmlFor={key} className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <input
        id={key}
        type={type}
        value={values[key] ?? ""}
        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500"
      />
    </div>
  );

  const textareaField = (key: string, label: string, placeholder?: string, rows = 3) => (
    <div>
      <label htmlFor={key} className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <textarea
        id={key}
        value={values[key] ?? ""}
        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500 resize-y"
      />
    </div>
  );

  const footerLinkFields = (
    title: string,
    fields: Array<{ labelKey: string; hrefKey: string }>,
  ) => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-white">{title}</h4>
        <p className="mt-1 text-xs text-gray-500">
          Để trống cả nhãn và đường dẫn nếu muốn ẩn mục này khỏi footer.
        </p>
      </div>
      <div className="space-y-4">
        {fields.map(({ labelKey, hrefKey }, index) => (
          <div key={labelKey} className="grid gap-3 md:grid-cols-2">
            {field(labelKey, `${title} ${index + 1} - Nhãn`, "Ví dụ: Giới thiệu")}
            {field(hrefKey, `${title} ${index + 1} - Đường dẫn`, "Ví dụ: /about")}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AdminLayout title="Thông tin cửa hàng">
      <div className="flex items-center gap-2 text-gray-400 mb-6">
        <Building2 className="w-5 h-5" />
        <span className="text-sm">Thông tin hiển thị cho khách hàng</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Đang tải...</div>
      ) : (
        <div className="max-w-xl space-y-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3">Thông tin cơ bản</h3>
            {field("store_name", "Tên cửa hàng (hiển thị trên Footer)", "Ví dụ: Rusty")}
            <LogoUpload
              value={values["store_logo_url"] ?? ""}
              onChange={(url) => setValues((v) => ({ ...v, store_logo_url: url }))}
              onCommit={persistLogo}
            />
            {field("store_email",   "Email liên hệ",  "shop@example.com", "email")}
            {field("store_phone",   "Số điện thoại",  "0912 345 678", "tel")}
            {field("store_address", "Địa chỉ",        "123 Đường ABC, Quận 1, TP.HCM")}
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3">Mạng xã hội</h3>
            {field("social_facebook",  "Facebook URL",  "https://facebook.com/...")}
            {field("social_instagram", "Instagram URL", "https://instagram.com/...")}
            {field("social_tiktok",    "TikTok URL",    "https://tiktok.com/@...")}
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-5">
            <div className="border-b border-gray-800 pb-3">
              <h3 className="text-sm font-semibold text-white">Footer storefront</h3>
              <p className="mt-1 text-xs text-gray-500">
                Chỉnh trực tiếp toàn bộ phần mô tả và liên kết đang hiển thị ở footer ngoài trang khách hàng.
              </p>
            </div>

            {textareaField(
              "footer_description",
              "Mô tả thương hiệu",
              "Đoạn mô tả ngắn nằm dưới tên cửa hàng trong footer.",
              4,
            )}

            <div className="grid gap-4 md:grid-cols-3">
              {field("footer_shop_title", "Tiêu đề cột sản phẩm", "Cửa hàng")}
              {field("footer_info_title", "Tiêu đề cột thông tin", "Thông tin")}
              {field("footer_contact_title", "Tiêu đề cột liên hệ", "Liên hệ")}
            </div>

            {footerLinkFields("Cột sản phẩm", FOOTER_SHOP_LINK_FIELDS)}
            {footerLinkFields("Cột thông tin", FOOTER_INFO_LINK_FIELDS)}

            <div className="grid gap-4 md:grid-cols-2">
              {field(
                "footer_bottom_left",
                "Dòng cuối bên trái",
                "Ví dụ: Tất cả quyền được bảo lưu.",
              )}
              {field(
                "footer_bottom_right",
                "Dòng cuối bên phải",
                "Ví dụ: Thiết kế với tình yêu tại Việt Nam",
              )}
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
