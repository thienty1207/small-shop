import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "auth_token";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  phone: string | null;
  address: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { phone?: string | null; address?: string | null }) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Fetch /api/me using the stored token to hydrate user state. */
  const fetchCurrentUser = useCallback(async (token: string) => {
    const res = await fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // Token invalid / expired — clear storage
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      return;
    }

    const data: AuthUser = await res.json();
    setUser(data);
  }, []);

  /** Called after the OAuth callback page receives a token from the URL. */
  const login = useCallback(
    async (token: string) => {
      localStorage.setItem(TOKEN_KEY, token);
      await fetchCurrentUser(token);
    },
    [fetchCurrentUser],
  );

  /** Clear session. */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  /** Update phone / address via PUT /api/me. */
  const updateProfile = useCallback(
    async (data: { phone?: string | null; address?: string | null }) => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error("Chưa đăng nhập");

      const res = await fetch(`${API_URL}/api/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Cập nhật thất bại");

      const updated: AuthUser = await res.json();
      setUser(updated);
    },
    [],
  );

  /** On mount: restore session from localStorage. */
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetchCurrentUser(token).finally(() => setIsLoading(false));
  }, [fetchCurrentUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
