import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  ShoppingCart, Users, Package, TrendingUp,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle,
  Truck, XCircle, Eye, RefreshCw,
} from "lucide-react";
import { adminGet } from "@/lib/admin-api";
import type { DashboardData } from "@/lib/admin-api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtVND(n: number): string {
  return n.toLocaleString("vi-VN") + " ₫";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN");
}

type OrderStatus = "pending" | "confirmed" | "shipping" | "delivered" | "cancelled";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:   "Chờ xử lý",
  confirmed: "Đã xác nhận",
  shipping:  "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã huỷ",
};

const STATUS_CONFIG: Record<
  OrderStatus,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  pending:   { icon: Clock,        color: "text-yellow-400",  bg: "bg-yellow-400/10"  },
  confirmed: { icon: CheckCircle,  color: "text-blue-400",    bg: "bg-blue-400/10"    },
  shipping:  { icon: Truck,        color: "text-purple-400",  bg: "bg-purple-400/10"  },
  delivered: { icon: CheckCircle,  color: "text-emerald-400", bg: "bg-emerald-400/10" },
  cancelled: { icon: XCircle,      color: "text-red-400",     bg: "bg-red-400/10"     },
};

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await adminGet<DashboardData>("/api/admin/dashboard");
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Derived stat cards from real data ──────────────────────────────────────
  const statCards = data
    ? [
        {
          label:  "Doanh thu tháng này",
          value:  fmtVND(data.stats.revenue_this_month),
          change: fmtVND(data.stats.revenue_today) + " hôm nay",
          up:     data.stats.revenue_today > 0,
          icon:   TrendingUp,
          accent: "text-emerald-400",
          bg:     "bg-emerald-400/10",
          border: "border-emerald-400/20",
        },
        {
          label:  "Tổng đơn hàng",
          value:  String(data.stats.orders_total),
          change: data.stats.orders_pending + " chờ xử lý",
          up:     data.stats.orders_pending === 0,
          icon:   ShoppingCart,
          accent: "text-blue-400",
          bg:     "bg-blue-400/10",
          border: "border-blue-400/20",
        },
        {
          label:  "Khách hàng",
          value:  String(data.stats.total_customers),
          change: data.stats.new_customers_this_month + " mới tháng này",
          up:     data.stats.new_customers_this_month > 0,
          icon:   Users,
          accent: "text-purple-400",
          bg:     "bg-purple-400/10",
          border: "border-purple-400/20",
        },
        {
          label:  "Sản phẩm",
          value:  String(data.stats.total_products),
          change: data.stats.low_stock_products + " sắp hết hàng",
          up:     data.stats.low_stock_products === 0,
          icon:   Package,
          accent: "text-rose-400",
          bg:     "bg-rose-400/10",
          border: "border-rose-400/20",
        },
      ]
    : [];

  // ── Revenue chart bars (normalize to max 144px height) ─────────────────────
  const maxRevenue = data
    ? Math.max(...data.revenue_chart.map((r) => r.revenue), 1)
    : 1;

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">

        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Xin chào, Admin 👋</h2>
            <p className="text-sm text-gray-500 capitalize">{today}</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Đang tải…" : "Làm mới"}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
            ⚠ {error}
          </div>
        )}

        {/* Stats grid */}
        {loading && !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-gray-800 mb-4" />
                <div className="h-7 w-24 bg-gray-800 rounded mb-2" />
                <div className="h-3 w-32 bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {statCards.map((s) => (
              <div key={s.label} className={`bg-gray-900 border ${s.border} rounded-xl p-5`}>
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <s.icon className={`w-5 h-5 ${s.accent}`} />
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium ${s.up ? "text-emerald-400" : "text-yellow-400"}`}>
                    {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {s.change}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-white">{s.value}</p>
                <p className="mt-0.5 text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Main content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Recent orders table — 2 cols */}
          <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white">Đơn hàng gần nhất</h3>
              <button
                onClick={() => navigate("/admin/orders")}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
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
                  {loading && !data
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {[1, 2, 3, 4, 5].map((c) => (
                            <td key={c} className="px-6 py-3.5">
                              <div className="h-4 bg-gray-800 rounded animate-pulse w-20" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : (data?.recent_orders ?? []).map((o) => {
                        const status = o.status as OrderStatus;
                        const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
                        const label = STATUS_LABEL[status] ?? o.status;
                        return (
                          <tr key={o.id} className="hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-3.5 text-sm font-mono text-rose-400">
                              #{o.order_code}
                            </td>
                            <td className="px-6 py-3.5 text-sm text-white">{o.customer_name}</td>
                            <td className="px-6 py-3.5 text-sm text-white font-medium">
                              {fmtVND(o.total_price)}
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                                <cfg.icon className="w-3 h-3" />
                                {label}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-sm text-gray-500">
                              {fmtDate(o.created_at)}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
              {!loading && data?.recent_orders.length === 0 && (
                <p className="text-center text-sm text-gray-600 py-8">Chưa có đơn hàng nào</p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Order status breakdown */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Phân loại đơn hàng</h3>
              {loading && !data ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-4 bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(
                    [
                      { key: "delivered" as OrderStatus,  color: "bg-emerald-400" },
                      { key: "shipping"  as OrderStatus,  color: "bg-purple-400"  },
                      { key: "pending"   as OrderStatus,  color: "bg-yellow-400"  },
                      { key: "confirmed" as OrderStatus,  color: "bg-blue-400"    },
                      { key: "cancelled" as OrderStatus,  color: "bg-red-400"     },
                    ] as { key: OrderStatus; color: string }[]
                  ).map(({ key, color }) => {
                    const count = data?.stats[`orders_${key}` as keyof typeof data.stats] as number ?? 0;
                    const total = data?.stats.orders_total ?? 1;
                    const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">{STATUS_LABEL[key]}</span>
                          <span className="text-gray-300 font-medium">{count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top products */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Top sản phẩm</h3>
              {loading && !data ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-gray-800 animate-pulse" />
                      <div className="flex-1 h-8 bg-gray-800 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(data?.top_products ?? []).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-500 shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.units_sold} đã bán</p>
                      </div>
                      <span className="text-xs text-emerald-400 font-medium shrink-0">
                        {fmtVND(p.revenue)}
                      </span>
                    </div>
                  ))}
                  {!loading && data?.top_products.length === 0 && (
                    <p className="text-xs text-gray-600">Chưa có dữ liệu</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Revenue bar chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-white">Doanh thu 6 tháng gần nhất</h3>
            <span className="text-xs text-gray-500">Chỉ tính đơn đã giao</span>
          </div>
          {loading && !data ? (
            <div className="flex items-end gap-3 h-36">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="flex-1 animate-pulse bg-gray-800 rounded-t-md" style={{ height: `${40 + i * 15}px` }} />
              ))}
            </div>
          ) : (
            <div className="flex items-end gap-3 h-36">
              {(data?.revenue_chart ?? []).map((b) => {
                const h = maxRevenue > 0 ? Math.max(8, Math.round((b.revenue / maxRevenue) * 144)) : 8;
                const label = b.revenue >= 1_000_000
                  ? (b.revenue / 1_000_000).toFixed(1) + "M"
                  : (b.revenue / 1_000).toFixed(0) + "K";
                return (
                  <div key={b.month} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs text-gray-400">{label}</span>
                    <div
                      className="w-full bg-rose-500/20 border border-rose-500/30 rounded-t-md hover:bg-rose-500/40 transition-colors"
                      style={{ height: `${h}px` }}
                      title={`${b.month}: ${fmtVND(b.revenue)}`}
                    />
                    <span className="text-xs text-gray-500">{b.month}</span>
                  </div>
                );
              })}
              {!loading && data?.revenue_chart.length === 0 && (
                <p className="text-sm text-gray-600 w-full text-center">Chưa có dữ liệu doanh thu</p>
              )}
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
