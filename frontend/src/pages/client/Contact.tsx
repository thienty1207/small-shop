import { useEffect, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useShopSettingsCtx } from "@/contexts/ShopSettingsContext";
import { buildApiUrl } from "@/lib/api-base";

// Cloudflare Turnstile site key (public — safe to embed in frontend)
const CF_SITE_KEY = "0x4AAAAAACl-DXPV4UZR7cmo";
const CONTACT_API_URL = buildApiUrl("/api/contact");

// Extend window type for Turnstile widget API
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

interface FormState {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const INITIAL_FORM: FormState = { name: "", email: "", phone: "", message: "" };

const Contact = () => {
  const { settings } = useShopSettingsCtx();
  const storeEmail   = settings.store_email   || "hello@handmadehaven.vn";
  const storePhone   = settings.store_phone   || "0901 234 567";
  const storeAddress = settings.store_address || "123 Nguyễn Huệ, Quận 1, TP.HCM";

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [cfToken, setCfToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // ── Load & render Cloudflare Turnstile ─────────────────────────────────────
  useEffect(() => {
    const SCRIPT_ID = "cf-turnstile-script";

    const renderWidget = () => {
      if (!turnstileRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: CF_SITE_KEY,
        callback: (token: string) => setCfToken(token),
        "expired-callback": () => setCfToken(null),
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

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      // Script tag exists but not yet loaded — wait for load event
      document
        .getElementById(SCRIPT_ID)
        ?.addEventListener("load", renderWidget);
    }
  }, []);

  // ── Form helpers ───────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setCfToken(null);
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!cfToken) {
      toast.error("Please complete the Cloudflare verification.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(CONTACT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          message: form.message.trim(),
          cf_turnstile_response: cfToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Something went wrong.");
      }

      setSuccess(true);
      resetForm();
      toast.success("Message sent! We'll reply within 24 hours. 🌸");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const inputClass =
    "w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors";

  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 md:px-8 pt-24 pb-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-2xl font-bold text-foreground text-center mb-6">
            Liên Hệ
          </h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* ── Contact Info ── */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <p className="text-sm text-muted-foreground">{storeEmail}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Điện thoại</p>
                  <p className="text-sm text-muted-foreground">{storePhone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Địa chỉ</p>
                  <p className="text-sm text-muted-foreground">
                    {storeAddress}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Contact Form ── */}
            {success ? (
              /* Success state */
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <CheckCircle2 size={48} className="text-primary" />
                <p className="text-base font-medium text-foreground">
                  Tin nhắn đã được gửi!
                </p>
                <p className="text-sm text-muted-foreground">
                  Chúng tôi sẽ phản hồi bạn trong vòng 24 giờ. Hãy kiểm tra email nhé!
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="mt-2 text-sm text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
                >
                  Gửi tin nhắn khác
                </button>
              </div>
            ) : (
              <form className="space-y-3" onSubmit={handleSubmit} noValidate>
                {/* Name */}
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Họ và tên *"
                  required
                  className={inputClass}
                  disabled={submitting}
                />

                {/* Email */}
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email *"
                  required
                  className={inputClass}
                  disabled={submitting}
                />

                {/* Phone — new field */}
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Số điện thoại (tuỳ chọn)"
                  className={inputClass}
                  disabled={submitting}
                />

                {/* Message */}
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tin nhắn *"
                  rows={4}
                  required
                  className={`${inputClass} resize-none`}
                  disabled={submitting}
                />

                {/* Cloudflare Turnstile widget */}
                <div className="pt-1">
                  <div ref={turnstileRef} />
                  {!cfToken && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      * Vui lòng tick vào ô xác thực Cloudflare trước khi gửi.
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !cfToken}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium
                             hover:opacity-90 active:scale-[.98] transition-all
                             disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Gửi tin nhắn
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Contact;
