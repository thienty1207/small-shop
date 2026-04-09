import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  AlertCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Mail,
  Phone,
  Search,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { adminGet, type CustomerListItem, type PaginatedResponse } from "@/lib/admin-api";

function normalizeCustomersPayload(
  payload: unknown,
  fallbackPage: number,
): PaginatedResponse<CustomerListItem> {
  const raw = payload as Partial<PaginatedResponse<CustomerListItem>> | null;
  const items = Array.isArray(raw?.items) ? raw.items : [];
  const total = typeof raw?.total === "number" ? raw.total : items.length;
  const page = typeof raw?.page === "number" ? raw.page : fallbackPage;
  const limit = typeof raw?.limit === "number" ? raw.limit : 20;
  const totalPages = typeof raw?.total_pages === "number" ? raw.total_pages : Math.max(1, Math.ceil(total / Math.max(1, limit)));

  return {
    items,
    total,
    page,
    limit,
    total_pages: totalPages,
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatVnd(value: number) {
  return value.toLocaleString("vi-VN") + " ₫";
}

export default function AdminCustomers() {
  const [data, setData] = useState<PaginatedResponse<CustomerListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const result = await adminGet<PaginatedResponse<CustomerListItem>>(
        `/api/admin/customers?${params.toString()}`,
      );
      setData(normalizeCustomersPayload(result, page));
    } catch (e) {
      setError((e as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const handleSearchChange = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const totalCustomers = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;
  const customerItems = data?.items ?? [];
  const pageSummary = useMemo(() => {
    if (!data) return "";
    const from = totalCustomers === 0 ? 0 : (page - 1) * data.limit + 1;
    const to = Math.min(page * data.limit, totalCustomers);
    return `${from}-${to} / ${totalCustomers}`;
  }, [data, page, totalCustomers]);

  return (
    <AdminLayout title="Khách hàng">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-400">Danh sách khách hàng đã đăng ký</p>
            <p className="text-xs text-gray-600 mt-1">Tổng {totalCustomers} khách hàng · {pageSummary || "—"}</p>
          </div>

          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm theo tên, email, số điện thoại..."
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 placeholder:text-gray-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 flex items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải danh sách khách hàng...
          </div>
        ) : error ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex items-center justify-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        ) : customerItems.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400">Không tìm thấy khách hàng phù hợp.</p>
            <p className="text-xs text-gray-600">Hãy thử đổi từ khóa tìm kiếm.</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/40">
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Khách hàng</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Liên hệ</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">Đơn hàng</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Tổng chi tiêu</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">Tham gia</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {customerItems.map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-800/60 hover:bg-gray-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {customer.avatar_url ? (
                            <img src={customer.avatar_url} alt={customer.name} className="w-10 h-10 rounded-full object-cover border border-gray-700" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{customer.name}</p>
                            <p className="text-xs text-gray-500 truncate">{customer.google_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs text-gray-400">
                          <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-500" />{customer.email}</div>
                          <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-500" />{customer.phone || "—"}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">{customer.orders_count}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">{formatVnd(customer.total_spent)}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-400">
                        <div className="flex items-center justify-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5 text-gray-500" />
                          {formatDate(customer.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">Trang {page} / {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">Thông tin khách hàng</p>
                <h3 className="text-xl font-semibold text-white">{selectedCustomer.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedCustomer.email}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-500 hover:text-white transition-colors"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
                <p className="text-xs text-gray-500 mb-1">Tổng đơn hàng</p>
                <p className="text-white font-semibold">{selectedCustomer.orders_count}</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
                <p className="text-xs text-gray-500 mb-1">Tổng chi tiêu</p>
                <p className="text-white font-semibold">{formatVnd(selectedCustomer.total_spent)}</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
                <p className="text-xs text-gray-500 mb-1">Số điện thoại</p>
                <p className="text-white font-medium">{selectedCustomer.phone || "—"}</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
                <p className="text-xs text-gray-500 mb-1">Lần đăng nhập cuối</p>
                <p className="text-white font-medium">{formatDate(selectedCustomer.last_login_at)}</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 sm:col-span-2">
                <p className="text-xs text-gray-500 mb-1">Địa chỉ</p>
                <p className="text-white font-medium">{selectedCustomer.address || "—"}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
              <span>Đăng ký: {formatDate(selectedCustomer.created_at)}</span>
              <span>Google ID: {selectedCustomer.google_id}</span>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
