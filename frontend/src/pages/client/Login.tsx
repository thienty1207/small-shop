import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api-base";
import { toast } from "sonner";

const API_URL = API_BASE_URL;
const CF_SITE_KEY = "0x4AAAAAACl-DXPV4UZR7cmo";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

const Login = () => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const [cfToken, setCfToken] = useState<string | null>(null);
  const [showVerifyHint, setShowVerifyHint] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) return;

    const SCRIPT_ID = "cf-turnstile-script";
    const scriptEl = document.getElementById(SCRIPT_ID);
    const turnstileEl = turnstileRef.current;

    const renderWidget = () => {
      if (!turnstileEl || !window.turnstile) return;
      if (widgetIdRef.current) return;

      turnstileEl.innerHTML = "";
      widgetIdRef.current = window.turnstile.render(turnstileEl, {
        sitekey: CF_SITE_KEY,
        callback: (token: string) => {
          setCfToken(token);
          setShowVerifyHint(false);
        },
        "expired-callback": () => {
          setCfToken(null);
        },
        "error-callback": () => {
          setCfToken(null);
          toast.error("Cloudflare verification error. Please refresh.");
        },
        theme: "light",
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    if (!scriptEl) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      scriptEl.addEventListener("load", renderWidget);
    }

    return () => {
      if (scriptEl) {
        scriptEl.removeEventListener("load", renderWidget);
      }
      widgetIdRef.current = null;
      if (turnstileEl) {
        turnstileEl.innerHTML = "";
      }
    };
  }, [isAuthenticated]);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = () => {
    if (!cfToken) {
      setShowVerifyHint(true);
      toast.error("Vui lòng chọn vào nút xác thực bên dưới để có thể đăng nhập.");
      return;
    }

    // Persist the return destination across the full-page OAuth redirect.
    // Priority: state passed by ProtectedRoute → sessionStorage set earlier → current referrer
    const returnTo =
      (location.state as { returnTo?: string } | null)?.returnTo ??
      sessionStorage.getItem("returnTo") ??
      "/";

    // Store in localStorage so AuthCallback can read it after OAuth round-trip
    if (returnTo !== "/") {
      localStorage.setItem("authReturnTo", returnTo);
    } else {
      localStorage.removeItem("authReturnTo");
    }
    sessionStorage.removeItem("returnTo");

    window.location.href = `${API_URL}/auth/google?cf_turnstile_response=${encodeURIComponent(cfToken)}`;
  };

  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto px-4 pt-24 md:pt-28 pb-10">
        <div className="max-w-sm mx-auto bg-card rounded-xl border border-border p-8">
          <h1 className="font-display text-xl font-bold text-foreground text-center mb-2">
            Đăng Nhập
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Chào mừng bạn đến với Handmade Haven
          </p>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium text-foreground"
          >
            {/* Google icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Đăng nhập bằng Google
          </button>

          <div className="mt-4 space-y-1.5">
            <div ref={turnstileRef} className="flex justify-center" />
            {!cfToken && (
              <p className="text-xs text-muted-foreground text-center">
                * Vui lòng xác thực Cloudflare trước khi đăng nhập.
              </p>
            )}
            {showVerifyHint && !cfToken && (
              <p className="text-xs text-red-500 text-center">
                Vui lòng chọn vào nút xác thực bên dưới để có thể đăng nhập vào trang.
              </p>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;

