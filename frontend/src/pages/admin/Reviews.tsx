import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Star, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminGet, adminDel } from "@/lib/admin-api";

interface ReviewItem {
  id:          string;
  product_id:  string;
  user_id:     string;
  user_name:   string;
  user_avatar: string | null;
  rating:      number;
  comment:     string | null;
  created_at:  string;
}

interface ReviewsResponse {
  items:       ReviewItem[];
  total:       number;
  page:        number;
  total_pages: number;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          className={s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-600"}
        />
      ))}
    </span>
  );
}

export default function AdminReviews() {
  const [data, setData]         = useState<ReviewsResponse | null>(null);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const res = await adminGet<ReviewsResponse>(`/api/admin/reviews?page=${p}&limit=20`);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá đánh giá này?")) return;
    setDeleting(id);
    try {
      await adminDel(`/api/admin/reviews/${id}`);
      setData((prev) =>
        prev ? { ...prev, items: prev.items.filter((r) => r.id !== id), total: prev.total - 1 } : prev
      );
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AdminLayout title="Đánh giá sản phẩm">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            {data ? `${data.total} đánh giá` : "Đang tải..."}
          </p>
        </div>

        {loading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-900 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 flex flex-col items-center gap-3">
            <MessageSquare className="w-10 h-10 text-gray-600" />
            <p className="text-sm text-gray-400">Chưa có đánh giá nào.</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                  <th className="text-left px-4 py-3">Người dùng</th>
                  <th className="text-left px-4 py-3">Sản phẩm</th>
                  <th className="text-left px-4 py-3">Đánh giá</th>
                  <th className="text-left px-4 py-3">Bình luận</th>
                  <th className="text-left px-4 py-3">Ngày</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.user_name}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.product_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3"><Stars rating={r.rating} /></td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{r.comment ?? <span className="text-gray-600 italic">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(r.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-red-400 hover:bg-red-400/10"
                        disabled={deleting === r.id}
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data.total_pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                <p className="text-xs text-gray-500">Trang {page} / {data.total_pages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    Trước
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}>
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
