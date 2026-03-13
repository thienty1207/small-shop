import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Ticket, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminGet, adminPost, adminPut, adminDel } from "@/lib/admin-api";

interface Coupon {
  id:          string;
  code:        string;
  coupon_type: string;
  value:       number;
  min_order:   number;
  max_uses:    number | null;
  used_count:  number;
  expires_at:  string | null;
  is_active:   boolean;
  created_at:  string;
}

const fmtVND = (n: number) => n.toLocaleString("vi-VN") + "đ";

function CouponBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
      active
        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
        : "bg-gray-500/15 text-gray-400 border-gray-500/30"
    }`}>
      {active ? <Check size={10} /> : <X size={10} />}
      {active ? "Đang hoạt động" : "Đã tắt"}
    </span>
  );
}

const emptyForm = {
  code: "", coupon_type: "percent", value: "", min_order: "",
  max_uses: "", expires_at: "", is_active: true,
};

export default function AdminCoupons() {
  const [coupons, setCoupons]   = useState<Coupon[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<Coupon | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);
  const [formErr, setFormErr]   = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminGet<Coupon[]>("/api/admin/coupons");
      setCoupons(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormErr(null);
    setShowModal(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code:        c.code,
      coupon_type: c.coupon_type,
      value:       String(c.value),
      min_order:   String(c.min_order),
      max_uses:    c.max_uses != null ? String(c.max_uses) : "",
      expires_at:  c.expires_at ? c.expires_at.slice(0, 16) : "",
      is_active:   c.is_active,
    });
    setFormErr(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormErr(null);
    setSaving(true);
    try {
      const body = {
        code:        form.code.trim().toUpperCase(),
        type:        form.coupon_type,
        value:       Number(form.value),
        min_order:   form.min_order ? Number(form.min_order) : 0,
        max_uses:    form.max_uses  ? Number(form.max_uses)  : null,
        expires_at:  form.expires_at ? new Date(form.expires_at).toISOString() : null,
        is_active:   form.is_active,
      };
      if (editing) {
        const updated = await adminPut<Coupon>(`/api/admin/coupons/${editing.id}`, {
          coupon_type: body.type,
          value:       body.value,
          min_order:   body.min_order,
          max_uses:    body.max_uses,
          expires_at:  body.expires_at,
          is_active:   body.is_active,
        });
        setCoupons((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
      } else {
        const created = await adminPost<Coupon>("/api/admin/coupons", body);
        setCoupons((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } catch (e) {
      setFormErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá mã giảm giá này?")) return;
    setDeleting(id);
    try {
      await adminDel(`/api/admin/coupons/${id}`);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AdminLayout title="Mã giảm giá">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">{coupons.length} mã giảm giá</p>
          <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5" onClick={openCreate}>
            <Plus size={14} /> Thêm mã
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-900 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !coupons.length ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 flex flex-col items-center gap-3">
            <Ticket className="w-10 h-10 text-gray-600" />
            <p className="text-sm text-gray-400">Chưa có mã giảm giá nào.</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                  <th className="text-left px-4 py-3">Mã</th>
                  <th className="text-left px-4 py-3">Loại</th>
                  <th className="text-left px-4 py-3">Giá trị</th>
                  <th className="text-left px-4 py-3">Đơn tối thiểu</th>
                  <th className="text-left px-4 py-3">Đã dùng</th>
                  <th className="text-left px-4 py-3">Hết hạn</th>
                  <th className="text-left px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-white">{c.code}</td>
                    <td className="px-4 py-3 text-gray-400 capitalize">{c.coupon_type === "percent" ? "Phần trăm" : "Cố định"}</td>
                    <td className="px-4 py-3 text-emerald-400 font-medium">
                      {c.coupon_type === "percent" ? `${c.value}%` : fmtVND(c.value)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{fmtVND(c.min_order)}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString("vi-VN") : "—"}
                    </td>
                    <td className="px-4 py-3"><CouponBadge active={c.is_active} /></td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-white" onClick={() => openEdit(c)}>
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="text-gray-500 hover:text-red-400 hover:bg-red-400/10"
                        disabled={deleting === c.id}
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">
              {editing ? "Chỉnh sửa mã giảm giá" : "Thêm mã giảm giá"}
            </h2>

            {formErr && (
              <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{formErr}</p>
            )}

            <div className="space-y-3">
              {!editing && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Mã code *</label>
                  <Input
                    className="bg-gray-800 border-gray-700 text-white uppercase"
                    placeholder="VD: SALE20"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Loại giảm giá</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white"
                    value={form.coupon_type}
                    onChange={(e) => setForm({ ...form, coupon_type: e.target.value })}
                  >
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Cố định (VND)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Giá trị {form.coupon_type === "percent" ? "(%)" : "(VND)"}
                  </label>
                  <Input
                    type="number"
                    className="bg-gray-800 border-gray-700 text-white"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Đơn tối thiểu (VND)</label>
                  <Input
                    type="number"
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="0"
                    value={form.min_order}
                    onChange={(e) => setForm({ ...form, min_order: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Số lần dùng tối đa</label>
                  <Input
                    type="number"
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Không giới hạn"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Ngày hết hạn</label>
                <Input
                  type="datetime-local"
                  className="bg-gray-800 border-gray-700 text-white"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>

              {editing && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="accent-rose-500"
                  />
                  <span className="text-sm text-gray-300">Đang hoạt động</span>
                </label>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-gray-700 text-gray-300"
                onClick={() => setShowModal(false)}
              >
                Huỷ
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
