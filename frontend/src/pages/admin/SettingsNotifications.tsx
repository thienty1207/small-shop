import { useEffect, useState } from "react";
import { Bell, Megaphone, Send } from "lucide-react";

import AdminLayout from "@/components/admin/AdminLayout";
import { adminGet, adminPost } from "@/lib/admin-api";

interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  created_by_admin_name: string;
  created_at: string;
}

interface PaginatedAnnouncements {
  items: SystemAnnouncement[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export default function AdminSettingsNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedAnnouncements | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const payload = await adminGet<PaginatedAnnouncements>("/api/admin/system-notifications?limit=20&page=1");
      setData(payload);
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handlePublish = async () => {
    if (!title.trim() || !message.trim()) {
      setError("Vui lòng nhập tiêu đề và nội dung thông báo.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = await adminPost<{ delivered: number }>("/api/admin/system-notifications", {
        title,
        message,
      });

      setTitle("");
      setMessage("");
      setSuccess(`Đã gửi thông báo đến ${payload.delivered} tài khoản.`);
      await load();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Thông báo hệ thống">
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-gray-400">
          <Bell className="w-5 h-5" />
          <span className="text-sm">Viết thông báo chung cho toàn bộ người dùng</span>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Tiêu đề</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="VD: Cập nhật vận chuyển tuần này"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Nội dung thông báo</label>
            <textarea
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Nhập nội dung thông báo gửi đến toàn bộ người dùng..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500 resize-y"
            />
          </div>

          <button
            type="button"
            onClick={handlePublish}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {saving ? "Đang gửi..." : "Gửi thông báo"}
          </button>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-emerald-400">{success}</p>}
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
            <p className="text-sm font-medium text-white">Lịch sử thông báo</p>
            <p className="text-xs text-gray-500">{data ? `${data.total} thông báo` : "Đang tải..."}</p>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-lg bg-gray-800" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">Chưa có thông báo nào.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {data.items.map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-3.5 w-3.5 text-rose-400" />
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-300">{item.message}</p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Bởi {item.created_by_admin_name} • {new Date(item.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
