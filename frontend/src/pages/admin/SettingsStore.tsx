import AdminLayout from "@/components/admin/AdminLayout";
import { Building2, Clock } from "lucide-react";

export default function AdminSettingsStore() {
  return (
    <AdminLayout title="Thông tin cửa hàng">
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-gray-600" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Thông tin cửa hàng</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          Cập nhật tên cửa hàng, địa chỉ, số điện thoại và thông tin liên hệ.
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs text-gray-600 bg-gray-800 px-4 py-2 rounded-full">
          <Clock className="w-3.5 h-3.5" />
          Sẽ ra mắt sớm
        </div>
      </div>
    </AdminLayout>
  );
}
