import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Paintbrush, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminGet, adminPut } from "@/lib/admin-api";

const KEYS = ["hero_title", "hero_subtitle", "hero_image_url", "banner_image_url", "banner_link"];

export default function AdminSettingsAppearance() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    adminGet<Record<string, string>>("/api/admin/settings")
      .then((data) => {
        const filtered: Record<string, string> = {};
        KEYS.forEach((k) => { filtered[k] = data[k] ?? ""; });
        setValues(filtered);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await adminPut("/api/admin/settings", { settings: values });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key: string, label: string, placeholder?: string, multiline = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {multiline ? (
        <textarea
          rows={3}
          value={values[key] ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500 resize-none"
        />
      ) : (
        <input
          type="text"
          value={values[key] ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500"
        />
      )}
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
        <div className="max-w-xl space-y-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3">Hero Banner</h3>
            {field("hero_title",    "Tiêu đề chính",   "Quà Tặng Thủ Công")}
            {field("hero_subtitle", "Tiêu đề phụ",     "Mỗi sản phẩm được tạo ra bằng tình yêu", true)}
            {field("hero_image_url", "URL ảnh banner",  "https://...")}
            {values["hero_image_url"] && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-700">
                <img src={values["hero_image_url"]} alt="Hero preview" className="w-full h-28 object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
              </div>
            )}
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3">Banner quảng cáo</h3>
            {field("banner_image_url", "URL ảnh banner",   "https://...")}
            {field("banner_link",      "Link khi click",   "/products?category=...")}
            {values["banner_image_url"] && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-700">
                <img src={values["banner_image_url"]} alt="Banner preview" className="w-full h-24 object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
              </div>
            )}
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
