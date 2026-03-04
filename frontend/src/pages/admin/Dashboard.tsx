import AdminLayout from "@/components/admin/AdminLayout";
import {
  ShoppingCart, Users, Package, TrendingUp,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle,
  Truck, XCircle, Eye,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Static mock data — will be replaced by API calls when backend is ready
// ---------------------------------------------------------------------------

const STATS = [
  {
    label:   "Doanh thu tháng này",
    value:   "42.580.000 ₫",
    change:  "+12%",
    up:      true,
    icon:    TrendingUp,
    accent:  "text-emerald-400",
    bg:      "bg-emerald-400/10",
    border:  "border-emerald-400/20",
  },
  {
    label:   "Tổng đơn hàng",
    value:   "128",
    change:  "+8%",
    up:      true,
    icon:    ShoppingCart,
    accent:  "text-blue-400",
    bg:      "bg-blue-400/10",
    border:  "border-blue-400/20",
  },
  {
    label:   "Khách hàng",
    value:   "87",
    change:  "+5%",
    up:      true,
    icon:    Users,
    accent:  "text-purple-400",
    bg:      "bg-purple-400/10",
    border:  "border-purple-400/20",
  },
  {
    label:   "Sản phẩm",
    value:   "24",
    change:  "-2",
    up:      false,
    icon:    Package,
    accent:  "text-rose-400",
    bg:      "bg-rose-400/10",
    border:  "border-rose-400/20",
  },
];

type OrderStatus = "Đang xử lý" | "Đã xác nhận" | "Đang giao" | "Đã giao" | "Đã hủy";

const STATUS_CONFIG: Record<
  OrderStatus,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  "Đang xử lý":  { icon: Clock,       color: "text-yellow-400", bg: "bg-yellow-400/10" },
  "Đã xác nhận": { icon: CheckCircle, color: "text-blue-400",   bg: "bg-blue-400/10"   },
  "Đang giao":   { icon: Truck,       color: "text-purple-400", bg: "bg-purple-400/10" },
  "Đã giao":     { icon: CheckCircle, color: "text-emerald-400",bg: "bg-emerald-400/10"},
  "Đã hủy":      { icon: XCircle,     color: "text-red-400",    bg: "bg-red-400/10"    },
};

const RECENT_ORDERS: {
  code: string; customer: string; total: string; status: OrderStatus; date: string;
}[] = [
  { code: "#ORD-2401", customer: "Nguyễn Thị An",  total: "450.000 ₫", status: "Đang xử lý",  date: "05/03/2026" },
  { code: "#ORD-2400", customer: "Trần Văn Bình",  total: "280.000 ₫", status: "Đã xác nhận", date: "04/03/2026" },
  { code: "#ORD-2399", customer: "Lê Thị Cẩm",    total: "650.000 ₫", status: "Đang giao",   date: "03/03/2026" },
  { code: "#ORD-2398", customer: "Phạm Văn Dũng",  total: "180.000 ₫", status: "Đã giao",     date: "02/03/2026" },
  { code: "#ORD-2397", customer: "Hoàng Thị Elan", total: "390.000 ₫", status: "Đã hủy",      date: "01/03/2026" },
];

const TOP_PRODUCTS = [
  { name: "Nến thơm Lavender",   sold: 45, revenue: "13.500.000 ₫", stock: 12 },
  { name: "Túi tote thêu tay",   sold: 38, revenue: "19.000.000 ₫", stock: 7  },
  { name: "Thiệp handmade",      sold: 32, revenue: "4.800.000 ₫",  stock: 25 },
  { name: "Nhẫn bạc chạm khắc", sold: 28, revenue: "16.800.000 ₫", stock: 4  },
];

const ORDER_STATUS_BREAKDOWN = [
  { label: "Đã giao",     count: 72, pct: 56, color: "bg-emerald-400" },
  { label: "Đang giao",   count: 21, pct: 16, color: "bg-purple-400"  },
  { label: "Đang xử lý", count: 18, pct: 14, color: "bg-yellow-400"  },
  { label: "Đã xác nhận",count: 12, pct: 10, color: "bg-blue-400"    },
  { label: "Đã hủy",     count:  5, pct:  4, color: "bg-red-400"     },
];

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">

        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Xin chào, Admin 👋</h2>
            <p className="text-sm text-gray-500 capitalize">{today}</p>
          </div>
          <span className="text-xs text-gray-600 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-full">
            Dữ liệu mẫu — API chưa kết nối
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className={`bg-gray-900 border ${s.border} rounded-xl p-5`}>
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.accent}`} />
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium ${s.up ? "text-emerald-400" : "text-red-400"}`}>
                  {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {s.change}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{s.value}</p>
              <p className="mt-0.5 text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Recent orders table — 2 cols */}
          <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white">Đơn hàng gần nhất</h3>
              <button className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors">
                <Eye className="w-3.5 h-3.5" />
                Xem tất cả
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    {["Mã đơn", "Khách hàng", "Tổng tiền", "Trạng thái", "Ngày"].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {RECENT_ORDERS.map((o) => {
                    const cfg = STATUS_CONFIG[o.status];
                    return (
                      <tr key={o.code} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-3.5 text-sm font-mono text-rose-400">{o.code}</td>
                        <td className="px-6 py-3.5 text-sm text-white">{o.customer}</td>
                        <td className="px-6 py-3.5 text-sm text-white font-medium">{o.total}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                            <cfg.icon className="w-3 h-3" />
                            {o.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-gray-500">{o.date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Order status breakdown */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Phân loại đơn hàng</h3>
              <div className="space-y-3">
                {ORDER_STATUS_BREAKDOWN.map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{s.label}</span>
                      <span className="text-gray-300 font-medium">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top products */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Top sản phẩm</h3>
              <div className="space-y-3">
                {TOP_PRODUCTS.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-500 shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.sold} đã bán · còn {p.stock}</p>
                    </div>
                    <span className="text-xs text-emerald-400 font-medium shrink-0">{p.revenue}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Revenue bar chart (CSS only) */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-white">Doanh thu 6 tháng gần nhất</h3>
            <span className="text-xs text-gray-500">Đơn vị: triệu ₫</span>
          </div>
          <div className="flex items-end gap-3 h-36">
            {[
              { month: "T10", value: 28, h: 56 },
              { month: "T11", value: 35, h: 70 },
              { month: "T12", value: 52, h: 104 },
              { month: "T01", value: 31, h: 62 },
              { month: "T02", value: 38, h: 76 },
              { month: "T03", value: 43, h: 86 },
            ].map((b) => (
              <div key={b.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-gray-400">{b.value}M</span>
                <div
                  className="w-full bg-rose-500/20 border border-rose-500/30 rounded-t-md hover:bg-rose-500/40 transition-colors"
                  style={{ height: `${b.h}px` }}
                />
                <span className="text-xs text-gray-500">{b.month}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
