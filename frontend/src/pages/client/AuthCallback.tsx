import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Handles the redirect from the backend after a successful Google OAuth login.
 *
 * URL format: /auth/callback?token=<jwt>
 *
 * 1. Reads the token from the query string
 * 2. Calls login(token) to persist it and load the user
 * 3. Redirects to the home page
 *
 * If no token is present (e.g. user navigated here directly), redirect to /login.
 */
const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    login(token).then(() => {
      // Restore the page the user was on before login (set by Login.tsx)
      const returnTo = localStorage.getItem("authReturnTo") ?? "/";
      localStorage.removeItem("authReturnTo");
      navigate(returnTo, { replace: true });
    });
  }, [login, navigate, searchParams]);

  return (
    <div className="min-h-screen bg-surface-pink flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Đang đăng nhập...</p>
    </div>
  );
};

export default AuthCallback;
