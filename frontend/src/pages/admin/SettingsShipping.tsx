import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Truck, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminGet, adminPut } from "@/lib/admin-api";

const KEYS = ["shipping_fee_default", "free_shipping_from"];
const DEFAULT_VALUES: Record<string, string> = {
  shipping_fee_default: "30000",
  free_shipping_from: "500000",
};

export default function AdminSettingsShipping() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const fmtNum = (v: string) => {
    const n = parseInt(v.replace(/\D/g, ""), 10);
    return isNaN(n) ? "" : n.toLocaleString("vi-VN");
  };

  return (
    <AdminLayout title="Vận chuyển & Phí giao hàng">
      <div className="flex items-center gap-2 text-gray-400 mb-6">
        <Truck className="w-5 h-5" />
        <span className="text-sm">Cài đặt phí vận chuyển</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Đang tải...</div>
      ) : (
        <div className="max-w-xl space-y-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-5">
            <h3 className="text-sm font-semibold text-white border-b border-gray-800 pb-3">Phí vận chuyển</h3>
            <p className="text-xs text-gray-500 -mt-2">
              Các giá trị bên dưới đang được áp dụng trực tiếp cho Cart, Checkout và tính tổng đơn hàng.
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Phí giao hàng mặc định (đ)</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={values["shipping_fee_default"] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, shipping_fee_default: e.target.value }))}
                  placeholder="30000"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500 pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">VNĐ</span>
              </div>
              {values["shipping_fee_default"] && (
                <p className="mt-1 text-xs text-gray-500">
                  = {fmtNum(values["shipping_fee_default"])}đ
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Miễn phí giao hàng từ (đ)</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={values["free_shipping_from"] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, free_shipping_from: e.target.value }))}
                  placeholder="500000"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500 pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">VNĐ</span>
              </div>
              {values["free_shipping_from"] && (
                <p className="mt-1 text-xs text-gray-500">
                  Đơn hàng từ {fmtNum(values["free_shipping_from"])}đ trở lên sẽ được miễn phí giao hàng
                </p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
              💡 Đặt "Miễn phí giao hàng từ" = 0 để luôn miễn phí. Đặt phí rất cao nếu không muốn miễn phí.
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
