import AdminLayout from "@/components/admin/AdminLayout";
import { Shield, Check, X } from "lucide-react";

const PERMISSIONS = [
  { group: "Sản phẩm",    items: [
    { label: "Xem danh sách sản phẩm",    super_admin: true, manager: true,  staff: true },
    { label: "Thêm / sửa sản phẩm",       super_admin: true, manager: true,  staff: false },
    { label: "Xoá sản phẩm",             super_admin: true, manager: false, staff: false },
  ]},
  { group: "Danh mục",   items: [
    { label: "Xem danh mục",              super_admin: true, manager: true,  staff: true },
    { label: "Thêm / sửa danh mục",       super_admin: true, manager: true,  staff: false },
    { label: "Xoá danh mục",             super_admin: true, manager: false, staff: false },
  ]},
  { group: "Đơn hàng",   items: [
    { label: "Xem danh sách đơn hàng",    super_admin: true, manager: true,  staff: true },
    { label: "Cập nhật trạng thái đơn",   super_admin: true, manager: true,  staff: true },
    { label: "Huỷ / xoá đơn hàng",       super_admin: true, manager: false, staff: false },
  ]},
  { group: "Khách hàng", items: [
    { label: "Xem danh sách khách hàng",  super_admin: true, manager: true,  staff: false },
    { label: "Xuất dữ liệu khách hàng",   super_admin: true, manager: false, staff: false },
  ]},
  { group: "Nhân viên",  items: [
    { label: "Xem danh sách nhân viên",   super_admin: true, manager: true,  staff: false },
    { label: "Thêm / sửa nhân viên",      super_admin: true, manager: false, staff: false },
    { label: "Xoá nhân viên",            super_admin: true, manager: false, staff: false },
  ]},
  { group: "Cài đặt",    items: [
    { label: "Xem cài đặt hệ thống",     super_admin: true, manager: false, staff: false },
    { label: "Thay đổi cài đặt",          super_admin: true, manager: false, staff: false },
    { label: "Phân quyền",               super_admin: true, manager: false, staff: false },
  ]},
];

const ROLES = [
  { key: "super_admin", label: "Super Admin", color: "text-rose-400" },
  { key: "manager",     label: "Quản lý",     color: "text-amber-400" },
  { key: "staff",       label: "Nhân viên",   color: "text-blue-400" },
] as const;

export default function AdminPermissions() {
  return (
    <AdminLayout title="Phân quyền">
      <div className="flex items-center gap-2 text-gray-400 mb-6">
        <Shield className="w-5 h-5" />
        <span className="text-sm">Ma trận phân quyền theo vai trò</span>
      </div>

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
            {PERMISSIONS.map((group) => (
              <>
                <tr key={`g-${group.group}`} className="border-b border-gray-800 bg-gray-800/40">
                  <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    {group.group}
                  </td>
                </tr>
                {group.items.map((item) => (
                  <tr key={item.label} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3 text-gray-300">{item.label}</td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="text-center px-4 py-3">
                        {item[r.key] ? (
                          <Check className="w-4 h-4 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-gray-700 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-600">
        * Bảng phân quyền được áp dụng tự động theo vai trò. Liên hệ Super Admin để thay đổi.
      </p>
    </AdminLayout>
  );
}
