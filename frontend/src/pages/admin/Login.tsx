import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Store, Eye, EyeOff, Lock, User, AlertCircle } from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export default function AdminLogin() {
  const { adminLogin, isAdminAuthenticated, isAdminLoading } = useAdminAuth();
  const navigate = useNavigate();

  const [username,   setUsername]   = useState("");
  const [password,   setPassword]   = useState("");
  const [showPass,   setShowPass]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in → go straight to dashboard
  if (!isAdminLoading && isAdminAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    setSubmitting(true);
    try {
      await adminLogin(username.trim(), password);
      navigate("/admin", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      {/* Background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-950/20 via-gray-950 to-gray-950 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 mb-4">
            <Store className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Chỉ dành cho quản trị viên được ủy quyền
          </p>
        </div>

        {/* Login form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">

            {/* Error banner */}
            {error && (
              <div role="alert" className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  autoComplete="username"
                  disabled={submitting}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600
                             rounded-lg pl-10 pr-4 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500/60
                             disabled:opacity-50 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  disabled={submitting}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600
                             rounded-lg pl-10 pr-10 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500/60
                             disabled:opacity-50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-rose-500/50
                         text-white font-semibold rounded-lg py-2.5 text-sm
                         transition-all duration-200 flex items-center justify-center gap-2
                         focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Đang đăng nhập...
                </>
              ) : "Đăng nhập"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">
          © {new Date().getFullYear()} Small Shop — Admin Panel
        </p>
      </div>
    </div>
  );
}
