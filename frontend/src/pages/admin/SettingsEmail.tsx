import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Mail, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminGet, adminPut } from "@/lib/admin-api";

const KEYS = ["email_footer", "email_order_subject", "email_order_intro"];
const DEFAULT_VALUES: Record<string, string> = {
  email_order_subject: "Xác nhận đơn hàng #{order_code}",
  email_order_intro: "Cảm ơn bạn đã đặt hàng tại Handmade Haven! Đơn hàng của bạn đã được xác nhận.",
  email_footer: "Cảm ơn bạn đã ủng hộ cửa hàng của chúng tôi!",
};

export default function AdminSettingsEmail() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    adminGet<Record<string, string>>("/api/admin/settings")
      .then((data) => {
        const filtered: Record<string, string> = {};
        KEYS.forEach((k) => {
          const raw = (data[k] ?? "").trim();
          filtered[k] = raw || DEFAULT_VALUES[k] || "";
        });
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

  return (
    <AdminLayout title="Email template">
      <div className="flex items-center gap-2 text-gray-400 mb-6">
        <Mail className="w-5 h-5" />
        <span className="text-sm">Nội dung email gửi cho khách hàng</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Đang tải...</div>
      ) : (
        <div className="max-w-xl space-y-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3">Email xác nhận đơn hàng</h3>
            <p className="text-xs text-gray-500 -mt-2">
              Nội dung này đang được dùng cho email xác nhận đơn hàng gửi thật tới khách hàng.
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Tiêu đề email</label>
              <input
                type="text"
                value={values["email_order_subject"] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, email_order_subject: e.target.value }))}
                placeholder="Xác nhận đơn hàng #{order_code}"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500"
              />
              <p className="mt-1 text-xs text-gray-600">Dùng {"{"}<code>order_code</code>{"}"} để chèn mã đơn hàng</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Nội dung giới thiệu</label>
              <textarea
                rows={3}
                value={values["email_order_intro"] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, email_order_intro: e.target.value }))}
                placeholder="Cảm ơn bạn đã đặt hàng tại Handmade Haven! Đơn hàng của bạn đã được xác nhận."
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Chữ ký / Footer email</label>
              <textarea
                rows={4}
                value={values["email_footer"] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, email_footer: e.target.value }))}
                placeholder="Trân trọng,&#10;Đội ngũ Handmade Haven&#10;📞 0912 345 678 | 📧 shop@example.com"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <button
              onClick={() => setPreviewOpen((v) => !v)}
              className="text-xs text-rose-400 hover:underline"
            >
              {previewOpen ? "Ẩn xem trước" : "👁 Xem trước email"}
            </button>

            {previewOpen && (
              <div className="border border-gray-700 rounded-lg bg-gray-950 p-4 text-xs text-gray-300 space-y-3">
                <div className="font-medium text-white">
                  Tiêu đề: {values["email_order_subject"]?.replace("{order_code}", "HD00123") || "—"}
                </div>
                <hr className="border-gray-800" />
                <p className="text-gray-400 whitespace-pre-wrap">{values["email_order_intro"] || "—"}</p>
                <div className="bg-gray-800 rounded px-3 py-2 text-gray-300">
                  [Chi tiết đơn hàng — tự động điền]
                </div>
                <p className="text-gray-500 whitespace-pre-wrap text-[11px]">{values["email_footer"] || "—"}</p>
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
