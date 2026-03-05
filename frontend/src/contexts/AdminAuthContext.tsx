import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const API_URL   = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "admin_auth_token";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminUser {
  id:        string;
  username:  string;
  full_name: string;
  role:      string;
}

interface AdminAuthContextValue {
  adminUser:             AdminUser | null;
  isAdminAuthenticated:  boolean;
  isAdminLoading:        boolean;
  /** Call with username + password → stores token → hydrates adminUser. */
  adminLogin:  (username: string, password: string) => Promise<void>;
  adminLogout: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser,      setAdminUser]      = useState<AdminUser | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  /** Fetch /api/admin/me with the stored token to hydrate admin state. */
  const fetchCurrentAdmin = useCallback(async (token: string) => {
    const res = await fetch(`${API_URL}/api/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      localStorage.removeItem(TOKEN_KEY);
      setAdminUser(null);
      return;
    }

    const data: AdminUser = await res.json();
    setAdminUser(data);
  }, []);

  /** POST /api/admin/auth/login → store token → hydrate. */
  const adminLogin = useCallback(
    async (username: string, password: string) => {
      const res = await fetch(`${API_URL}/api/admin/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Đăng nhập thất bại" }));
        throw new Error(err.error ?? "Đăng nhập thất bại");
      }

      const { token, user } = await res.json();
      localStorage.setItem(TOKEN_KEY, token);
      setAdminUser(user);
    },
    [],
  );

  const adminLogout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAdminUser(null);
  }, []);

  /** On mount: restore session from localStorage. */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsAdminLoading(false);
      return;
    }
    fetchCurrentAdmin(token).finally(() => setIsAdminLoading(false));
  }, [fetchCurrentAdmin]);

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        isAdminAuthenticated: adminUser !== null,
        isAdminLoading,
        adminLogin,
        adminLogout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside <AdminAuthProvider>");
  return ctx;
}

/** Helper: retrieve the stored admin JWT (for API calls inside admin pages). */
export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
