import { Fragment, useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Shield, Check, X, AlertCircle } from "lucide-react";
import {
  adminGet,
  adminPatch,
  type AdminPermissionGroup,
  type AdminPermissionsResponse,
  type UpdateAdminPermissionsInput,
} from "@/lib/admin-api";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const ROLES = [
  { key: "super_admin", label: "Super Admin", color: "text-rose-400" },
  { key: "manager",     label: "Quản lý",     color: "text-amber-400" },
  { key: "staff",       label: "Nhân viên",   color: "text-blue-400" },
] as const;

export default function AdminPermissions() {
  const { adminUser } = useAdminAuth();
  const isSuperAdmin = adminUser?.role === "super_admin";

  const [groups, setGroups] = useState<AdminPermissionGroup[]>([]);
  const [draftGroups, setDraftGroups] = useState<AdminPermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = JSON.stringify(groups) !== JSON.stringify(draftGroups);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGet<AdminPermissionsResponse>("/api/admin/permissions");
      setGroups(data.groups);
      setDraftGroups(data.groups);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePermission = (
    groupIndex: number,
    itemIndex: number,
    role: (typeof ROLES)[number]["key"],
  ) => {
    if (!isSuperAdmin) return;

    setDraftGroups((prev) => {
      const next = structuredClone(prev);
      next[groupIndex].items[itemIndex][role] = !next[groupIndex].items[itemIndex][role];
      return next;
    });
  };

  const handleReset = () => {
    setDraftGroups(groups);
    setError(null);
  };

  const handleSave = async () => {
    if (!isSuperAdmin) return;
    setSaving(true);
    setError(null);
    try {
      const payload: UpdateAdminPermissionsInput = { groups: draftGroups };
      const data = await adminPatch<AdminPermissionsResponse>("/api/admin/permissions", payload);
      setGroups(data.groups);
      setDraftGroups(data.groups);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Phân quyền">
      <div className="flex items-center gap-2 text-gray-400 mb-6">
        <Shield className="w-5 h-5" />
        <span className="text-sm">Ma trận phân quyền theo vai trò</span>
      </div>

      {!isSuperAdmin && (
        <p className="mb-4 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Bạn chỉ có quyền xem. Chỉ super_admin mới có thể thay đổi phân quyền.
        </p>
      )}

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={load}
          className="px-3 py-1.5 text-xs rounded-md bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
        >
          Làm mới
        </button>
        <button
          onClick={handleReset}
          disabled={!isDirty || saving}
          className="px-3 py-1.5 text-xs rounded-md bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-40"
        >
          Hoàn tác
        </button>
        <button
          onClick={handleSave}
          disabled={!isSuperAdmin || !isDirty || saving}
          className="px-3 py-1.5 text-xs rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 disabled:opacity-40"
        >
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Đang tải phân quyền...</div>
      ) : (
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium w-1/2">Quyền hạn</th>
              {ROLES.map((r) => (
                <th key={r.key} className={`text-center px-4 py-3 font-semibold ${r.color}`}>{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draftGroups.map((group, groupIndex) => (
              <Fragment key={group.key}>
                <tr key={`g-${group.key}`} className="border-b border-gray-800 bg-gray-800/40">
                  <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    {group.group}
                  </td>
                </tr>
                {group.items.map((item, itemIndex) => (
                  <tr key={item.key} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3 text-gray-300">{item.label}</td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="text-center px-4 py-3">
                        <button
                          type="button"
                          aria-label={`toggle-${group.key}-${item.key}-${r.key}`}
                          disabled={!isSuperAdmin || saving}
                          onClick={() => togglePermission(groupIndex, itemIndex, r.key)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-50"
                        >
                          {item[r.key] ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <X className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <p className="mt-4 text-xs text-gray-600">
        * Ma trận phân quyền được lưu trên backend và áp dụng theo vai trò đăng nhập admin.
      </p>
    </AdminLayout>
  );
}
