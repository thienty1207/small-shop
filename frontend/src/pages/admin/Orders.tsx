import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  ShoppingCart, Search, ChevronLeft, ChevronRight,
  AlertCircle, Eye, CheckCircle, Truck, Package,
  XCircle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  adminGet,
  adminPut,
  type AdminOrder,
  type OrderDetail,
  type PaginatedResponse,
} from "@/lib/admin-api";

function formatVnd(n: number) {
  return n.toLocaleString("vi-VN") + " ₫";
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_TABS = [
  { key: "",           label: "Tất cả",        icon: null },
  { key: "pending",    label: "Chờ xử lý",     icon: Clock },
  { key: "confirmed",  label: "Đã xác nhận",   icon: CheckCircle },
  { key: "shipping",   label: "Đang giao",      icon: Truck },
  { key: "delivered",  label: "Đã giao",        icon: Package },
  { key: "cancelled",  label: "Đã huỷ",         icon: XCircle },
];

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Chờ xử lý",   cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  confirmed: { label: "Đã xác nhận", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  shipping:  { label: "Đang giao",   cls: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  delivered: { label: "Đã giao",     cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  cancelled: { label: "Đã huỷ",      cls: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const NEXT_STATUSES: Record<string, string[]> = {
  pending:   ["confirmed", "cancelled"],
  confirmed: ["shipping",  "cancelled"],
  shipping:  ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const STATUS_ACTION_LABELS: Record<string, string> = {
  confirmed: "Xác nhận",
  shipping:  "Bắt đầu giao",
  delivered: "Đã giao",
  cancelled: "Huỷ đơn",
};

export default function AdminOrders() {
  const [data,    setData]    = useState<PaginatedResponse<AdminOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [tab,     setTab]     = useState("");
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);

  // Detail modal
  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status update modal
  const [updateTarget, setUpdateTarget] = useState<AdminOrder | null>(null);
  const [newStatus,    setNewStatus]    = useState("");
  const [noteText,     setNoteText]     = useState("");
  const [updating,     setUpdating]     = useState(false);
  const [updateError,  setUpdateError]  = useState<string | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "15" });
      if (tab.trim())    params.set("status", tab);
      if (search.trim()) params.set("search", search.trim());
      const res = await adminGet<PaginatedResponse<AdminOrder>>(`/api/admin/orders?${params}`);
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); load(1); }, [tab, search]); // eslint-disable-line
  useEffect(() => { load(page); }, [page]);                 // eslint-disable-line

  const openDetail = async (id: string) => {
    setDetailOrder(null);
    setDetailLoading(true);
    try {
      const d = await adminGet<OrderDetail>(`/api/admin/orders/${id}`);
      setDetailOrder(d);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  const openStatusUpdate = (order: AdminOrder, status: string) => {
    setUpdateTarget(order);
    setNewStatus(status);
    setNoteText("");
    setUpdateError(null);
  };

  const handleStatusUpdate = async () => {
    if (!updateTarget) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      await adminPut(`/api/admin/orders/${updateTarget.id}/status`, {
        status: newStatus,
        note:   noteText.trim() || null,
      });
      setUpdateTarget(null);
      await load(page);
    } catch (e) {
      setUpdateError((e as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const totalPages = data?.total_pages ?? 1;

  return (
    <AdminLayout title="Quản lý Đơn hàng">
      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-rose-500 text-white"
                : "bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 placeholder:text-gray-600"
          placeholder="Tìm theo mã đơn, tên, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Đang tải...</div>
      ) : error ? (
        <div className="text-center py-20 text-red-400 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      ) : (
        <>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Mã đơn</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium hidden md:table-cell">Khách hàng</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Tổng tiền</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium hidden lg:table-cell">Thời gian</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {!data || !data.items || data.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-500">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                      Không có đơn hàng nào
                    </td>
                  </tr>
                ) : (
                  data.items.map((order) => {
                    const meta  = STATUS_META[order.status] ?? STATUS_META.pending;
                    const nexts = NEXT_STATUSES[order.status] ?? [];
                    return (
                      <tr key={order.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-mono text-rose-400 text-xs">{order.order_code}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{order.items_count} sản phẩm</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-white text-sm">{order.customer_name}</p>
                          <p className="text-xs text-gray-500">{order.customer_email}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {formatVnd(order.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => openDetail(order.id)}
                              title="Xem chi tiết"
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {nexts.map((ns) => (
                              <button
                                key={ns}
                                onClick={() => openStatusUpdate(order, ns)}
                                title={STATUS_ACTION_LABELS[ns]}
                                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                  ns === "cancelled"
                                    ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                    : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                }`}
                              >
                                {STATUS_ACTION_LABELS[ns]}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <span>Tổng {data?.total ?? 0} đơn hàng</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Order Detail Modal ── */}
      {(detailLoading || detailOrder) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg shadow-2xl mb-8">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Chi tiết đơn hàng</h2>
              <button onClick={() => setDetailOrder(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            {detailLoading ? (
              <div className="py-12 text-center text-gray-500">Đang tải...</div>
            ) : detailOrder && (
              <div className="px-6 py-5 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Mã đơn</p>
                    <p className="font-mono text-rose-400">{detailOrder.order.order_code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${(STATUS_META[detailOrder.order.status] ?? STATUS_META.pending).cls}`}>
                      {(STATUS_META[detailOrder.order.status] ?? STATUS_META.pending).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Khách hàng</p>
                    <p className="text-white">{detailOrder.order.customer_name}</p>
                    <p className="text-gray-400 text-xs">{detailOrder.order.customer_phone}</p>
                    <p className="text-gray-400 text-xs">{detailOrder.order.customer_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Địa chỉ</p>
                    <p className="text-gray-300 text-xs">{detailOrder.order.address}</p>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500 mb-3">Sản phẩm</p>
                  <div className="space-y-2">
                    {detailOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-800"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{item.product_name}</p>
                          {item.variant && <p className="text-gray-500 text-xs">{item.variant}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-gray-300 text-xs">x{item.quantity}</p>
                          <p className="text-rose-400 text-xs font-medium">{formatVnd(item.subtotal)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Tạm tính</span>
                    <span>{formatVnd(detailOrder.order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Phí giao hàng</span>
                    <span>{formatVnd(detailOrder.order.shipping_fee)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-white">
                    <span>Tổng cộng</span>
                    <span className="text-rose-400">{formatVnd(detailOrder.order.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Status Update Modal ── */}
      {updateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-base font-semibold text-white">Cập nhật trạng thái</h2>
              <p className="text-xs text-gray-400 mt-1">
                Đơn <span className="font-mono text-rose-400">{updateTarget.order_code}</span>
                {" "}→{" "}
                <strong>{STATUS_META[newStatus]?.label ?? newStatus}</strong>
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Ghi chú (tuỳ chọn)</label>
                <textarea
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 resize-none"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="VD: Đơn được xác nhận và sẽ giao trong 2-3 ngày..."
                />
                <p className="text-xs text-gray-600 mt-1">Ghi chú sẽ được gửi kèm email thông báo đến khách hàng.</p>
              </div>
              {updateError && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {updateError}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setUpdateTarget(null)} className="text-gray-400">Huỷ</Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={updating}
                className={newStatus === "cancelled" ? "bg-red-500 hover:bg-red-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"}
              >
                {updating ? "Đang cập nhật..." : `Xác nhận: ${STATUS_META[newStatus]?.label ?? newStatus}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
