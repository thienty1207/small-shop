import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  ShoppingCart, Users, Package, TrendingUp,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle,
  Truck, XCircle, Eye, RefreshCw,
} from "lucide-react";
import { adminGet } from "@/lib/admin-api";
import type { DashboardData, DashboardStats } from "@/lib/admin-api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtVND(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString("vi-VN") + " ₫";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN");
}

const SHOP_OPEN_YEAR = 2026;
const SHOP_OPEN_MONTH = 3;
const DASHBOARD_END_YEAR = 2030;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
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
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(Math.min(Math.max(currentYear, SHOP_OPEN_YEAR), DASHBOARD_END_YEAR));

  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const d = await adminGet<Partial<DashboardData>>("/api/admin/dashboard");
      // Normalize to guarantee all array fields always exist
      setData({
        stats:         d.stats         ?? null as unknown as DashboardStats,
        recent_orders: d.recent_orders ?? [],
        revenue_chart: d.revenue_chart ?? [],
        monthly_revenue: d.monthly_revenue ?? [],
        top_products:  d.top_products  ?? [],
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        void load();
      }
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  // ── Derived stat cards from real data ──────────────────────────────────────
  const stats = data?.stats;
  const statCards = stats
    ? [
        {
          label:  "Doanh thu tháng này",
          value:  fmtVND(stats.revenue_this_month),
          change: fmtVND(stats.revenue_today) + " hôm nay",
          up:     (stats.revenue_today ?? 0) > 0,
          icon:   TrendingUp,
          accent: "text-emerald-400",
          bg:     "bg-emerald-400/10",
          border: "border-emerald-400/20",
        },
        {
          label:  "Tổng đơn hàng",
          value:  String(stats.orders_total),
          change: stats.orders_pending + " chờ xử lý",
          up:     stats.orders_pending === 0,
          icon:   ShoppingCart,
          accent: "text-blue-400",
          bg:     "bg-blue-400/10",
          border: "border-blue-400/20",
        },
        {
          label:  "Khách hàng",
          value:  String(stats.customers_total),
          change: stats.new_customers_this_month + " mới tháng này",
          up:     (stats.new_customers_this_month ?? 0) > 0,
          icon:   Users,
          accent: "text-purple-400",
          bg:     "bg-purple-400/10",
          border: "border-purple-400/20",
        },
        {
          label:  "Sản phẩm",
          value:  String(stats.products_total),
          change: stats.products_out_of_stock + " sắp hết hàng",
          up:     stats.products_out_of_stock === 0,
          icon:   Package,
          accent: "text-rose-400",
          bg:     "bg-rose-400/10",
          border: "border-rose-400/20",
        },
      ]
    : [];

  // ── Revenue chart bars (normalize to max 144px height) ─────────────────────
  const monthlyRevenue = data?.monthly_revenue ?? [];
  const availableYears = useMemo(
    () => Array.from({ length: DASHBOARD_END_YEAR - SHOP_OPEN_YEAR + 1 }, (_, i) => SHOP_OPEN_YEAR + i),
    [],
  );

  const revenueByYearMonth = useMemo(() => {
    const map = new Map<string, number | null>();

    monthlyRevenue.forEach((item) => {
      const key = `${item.year}-${item.month}`;
      map.set(key, item.revenue);
    });

    (data?.revenue_chart ?? []).forEach((item) => {
      const [mm, yyyy] = item.month.split("/");
      const year = Number(yyyy);
      const month = Number(mm);
      if (Number.isFinite(year) && Number.isFinite(month)) {
        const key = `${year}-${month}`;
        if (!map.has(key)) map.set(key, item.revenue);
      }
    });

    return map;
  }, [monthlyRevenue, data?.revenue_chart]);

  const selectedYearPoints = useMemo(() => {
    const startMonth = selectedYear === SHOP_OPEN_YEAR ? SHOP_OPEN_MONTH : 1;
    const endMonth = 12;
    if (endMonth < startMonth) return [] as { year: number; month: number; revenue: number | null }[];

    return Array.from({ length: endMonth - startMonth + 1 }, (_, idx) => {
      const month = startMonth + idx;
      const key = `${selectedYear}-${month}`;
      const isFutureYear = selectedYear > currentYear;
      const isFutureMonthInCurrentYear = selectedYear === currentYear && month > currentMonth;
      const defaultValue = (isFutureYear || isFutureMonthInCurrentYear) ? null : 0;
      return {
        year: selectedYear,
        month,
        revenue: revenueByYearMonth.has(key) ? (revenueByYearMonth.get(key) ?? null) : defaultValue,
      };
    });
  }, [selectedYear, currentYear, currentMonth, revenueByYearMonth]);

  const maxRevenue = selectedYearPoints.length > 0
    ? Math.max(...selectedYearPoints.map((r) => r.revenue ?? 0), 1)
    : 1;

  const selectedYearRevenue = selectedYearPoints.reduce((sum, point) => sum + (point.revenue ?? 0), 0);
  const selectedYearHasAnyData = selectedYearPoints.some((point) => point.revenue != null);

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
                              {fmtVND(o.total)}
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
                    const count = stats?.[`orders_${key}` as keyof DashboardStats] as number ?? 0;
                    const total = stats?.orders_total ?? 1;
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
          <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Biểu đồ doanh thu</h3>
              <span className="text-xs text-gray-500">Chỉ tính đơn đã giao</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-9 min-w-[110px] bg-gray-800 border border-gray-700 rounded px-2 text-xs text-gray-100 focus:outline-none focus:border-rose-500"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>Năm {year}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-4 rounded-lg border border-gray-800 bg-gray-950/60 px-4 py-3">
            <p className="text-xs text-gray-500">Tổng doanh thu năm đã chọn</p>
            <p className="text-lg font-semibold text-white mt-1">
              {selectedYearHasAnyData ? fmtVND(selectedYearRevenue) : "— (chưa tới năm này)"}
            </p>
          </div>
          {loading && !data ? (
            <div className="flex items-end gap-3 h-40">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="flex-1 animate-pulse bg-gray-800 rounded-t-md" style={{ height: `${40 + i * 15}px` }} />
              ))}
            </div>
          ) : (
            <div
              className="grid gap-3 h-48"
              style={{ gridTemplateColumns: `repeat(${Math.max(1, selectedYearPoints.length)}, minmax(0, 1fr))` }}
            >
              {selectedYearPoints.map((b) => {
                const value = b.revenue ?? 0;
                const h = maxRevenue > 0 ? Math.max(8, Math.round((value / maxRevenue) * 140)) : 8;
                return (
                  <div key={`${b.year}-${b.month}`} className="flex flex-col items-center justify-end gap-2">
                    <span className="text-[10px] text-gray-300 text-center leading-tight">
                      {b.revenue == null ? "—" : fmtVND(value)}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-colors ${b.revenue == null ? "bg-gray-800/60 border border-gray-700/70" : "bg-rose-500/20 border border-rose-500/30 hover:bg-rose-500/40"}`}
                      style={{ height: `${h}px` }}
                      title={`${pad2(b.month)}/${b.year}: ${b.revenue == null ? "Chưa tới tháng này" : fmtVND(value)}`}
                    />
                    <span className="text-xs text-gray-500">{pad2(b.month)}/{b.year}</span>
                  </div>
                );
              })}
              {!loading && selectedYearPoints.length === 0 && (
                <p className="text-sm text-gray-600 w-full text-center">Chưa có dữ liệu doanh thu</p>
              )}
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
