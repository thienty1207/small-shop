import AdminLayout from "@/components/admin/AdminLayout";
import { LayoutDashboard, Package, ShoppingCart, Users } from "lucide-react";

const stats = [
  { label: "Tổng đơn hàng",  value: "—", icon: ShoppingCart, color: "text-blue-400",  bg: "bg-blue-400/10" },
  { label: "Doanh thu",       value: "—", icon: Package,      color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { label: "Khách hàng",     value: "—", icon: Users,         color: "text-purple-400",  bg: "bg-purple-400/10" },
  { label: "Sản phẩm",       value: "—", icon: LayoutDashboard, color: "text-rose-400", bg: "bg-rose-400/10" },
];

export default function AdminDashboard() {
  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Đơn hàng gần nhất</h2>
          <p className="text-sm text-gray-500">
            Chức năng đang phát triển — dữ liệu sẽ hiển thị sau khi kết nối API.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
