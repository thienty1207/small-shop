import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Users, Plus, Pencil, Trash2, AlertCircle, ShieldCheck, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminGet,
  adminPost,
  adminPut,
  adminDel,
  type StaffListItem,
  type CreateStaffInput,
  type UpdateStaffInput,
} from "@/lib/admin-api";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const ROLE_META: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
  manager:     { label: "Quản lý",     color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  staff:       { label: "Nhân viên",   color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
};

export default function AdminStaff() {
  const { adminUser } = useAdminAuth();
  const isSuperAdmin = adminUser?.role === "super_admin";

  const [staffList, setStaffList] = useState<StaffListItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<StaffListItem | null>(null);
  const [form, setForm]           = useState({ username: "", full_name: "", password: "", role: "staff" as "manager" | "staff", is_active: true });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<StaffListItem | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGet<StaffListItem[]>("/api/admin/staff");
      setStaffList(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ username: "", full_name: "", password: "", role: "staff", is_active: true });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (s: StaffListItem) => {
    setEditing(s);
    setForm({ username: s.username, full_name: s.full_name, password: "", role: (s.role === "super_admin" ? "staff" : s.role) as "manager" | "staff", is_active: s.is_active });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.username.trim()) { setFormError("Tên đăng nhập là bắt buộc"); return; }
    if (!editing && !form.password.trim()) { setFormError("Mật khẩu là bắt buộc khi tạo mới"); return; }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const body: UpdateStaffInput = {
          full_name: form.full_name || undefined,
          role: form.role,
          is_active: form.is_active,
          ...(form.password.trim() ? { password: form.password } : {}),
        };
        await adminPut(`/api/admin/staff/${editing.id}`, body);
      } else {
        const body: CreateStaffInput = {
          username: form.username,
          password: form.password,
          full_name: form.full_name || undefined,
          role: form.role,
        };
        await adminPost("/api/admin/staff", body);
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
      await adminDel(`/api/admin/staff/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout title="Quản lý nhân viên">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-gray-400">
          <Users className="w-5 h-5" />
          <span className="text-sm">{staffList.length} tài khoản</span>
        </div>
        {isSuperAdmin && (
          <Button onClick={openCreate} className="bg-rose-500 hover:bg-rose-600 text-white gap-2">
            <Plus className="w-4 h-4" /> Thêm nhân viên
          </Button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-amber-400 text-sm">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          Bạn cần quyền Super Admin để quản lý nhân viên.
        </div>
      )}

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
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Tài khoản</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Vai trò</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Trạng thái</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Ngày tạo</th>
                {isSuperAdmin && <th className="text-right px-4 py-3 text-gray-400 font-medium">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-500">Chưa có nhân viên nào</td>
                </tr>
              ) : (
                staffList.map((s) => {
                  const meta = ROLE_META[s.role] ?? ROLE_META.staff;
                  const initials = (s.full_name || s.username).slice(0, 2).toUpperCase();
                  return (
                    <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-xs font-bold text-rose-400 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-white">{s.full_name || s.username}</p>
                            <p className="text-xs text-gray-500">@{s.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
                          {s.role === "super_admin" ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          s.is_active
                            ? "bg-green-500/15 text-green-400 border border-green-500/30"
                            : "bg-gray-700 text-gray-400 border border-gray-600"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? "bg-green-400" : "bg-gray-500"}`} />
                          {s.is_active ? "Hoạt động" : "Bị khóa"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(s.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => openEdit(s)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {s.role !== "super_admin" && s.id !== adminUser?.id && (
                              <button
                                onClick={() => setDeleteTarget(s)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-rose-400" />
                <h2 className="text-base font-semibold text-white">
                  {editing ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}
                </h2>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Tên đăng nhập *</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  disabled={!!editing}
                  placeholder="username"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500 disabled:opacity-50"
                />
              </div>
              {/* Full name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Họ và tên</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500"
                />
              </div>
              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Vai trò *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "manager" | "staff" }))}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="manager">Quản lý</option>
                  <option value="staff">Nhân viên</option>
                </select>
              </div>
              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Mật khẩu {editing ? "(để trống = không đổi)" : "*"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editing ? "••••••••" : "Nhập mật khẩu"}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500"
                />
              </div>
              {/* Active toggle (edit only) */}
              {editing && (
                <div className="flex items-center justify-between py-2">
                  <label className="text-sm font-medium text-gray-300">Kích hoạt tài khoản</label>
                  <button
                    onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? "bg-rose-500" : "bg-gray-700"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_active ? "left-5.5" : "left-0.5"}`} />
                  </button>
                </div>
              )}
              {formError && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {formError}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Huỷ
              </button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo tài khoản"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Xoá tài khoản</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Tài khoản <span className="font-medium text-white">@{deleteTarget.username}</span> sẽ bị xoá vĩnh viễn.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Huỷ
              </button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {deleting ? "Đang xoá..." : "Xoá"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
