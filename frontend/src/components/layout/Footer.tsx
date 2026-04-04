import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, MapPin, Phone, Mail } from "lucide-react";
import { useShopSettingsCtx } from "@/contexts/ShopSettingsContext";
import {
  FOOTER_INFO_LINK_FIELDS,
  FOOTER_SHOP_LINK_FIELDS,
  getSettingValue,
} from "@/lib/footer-settings";

function isExternalHref(href: string) {
  return /^(https?:\/\/|mailto:|tel:)/i.test(href);
}

function FooterNavLink({ href, label }: { href: string; label: string }) {
  const className = "text-sm text-background/60 hover:text-background transition-colors";

  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link to={href} className={className}>
      {label}
    </Link>
  );
}

const Footer = () => {
  const { settings } = useShopSettingsCtx();
  const storeName = (settings.store_name ?? "Rusty").trim() || "Rusty";
  const storeEmail = settings.store_email || "hello@handmadehaven.vn";
  const storePhone = settings.store_phone || "0901 234 567";
  const storeAddress =
    settings.store_address || "123 Đường Lê Lợi, Quận 1, TP.HCM";
  const fbUrl = settings.social_facebook || "#";
  const igUrl = settings.social_instagram || "#";
  const ttUrl = settings.social_tiktok || "#";
  const footerDescription = getSettingValue(settings, "footer_description");
  const footerShopTitle = getSettingValue(
    settings,
    "footer_shop_title",
    "Cửa hàng",
  );
  const footerInfoTitle = getSettingValue(
    settings,
    "footer_info_title",
    "Thông tin",
  );
  const footerContactTitle = getSettingValue(
    settings,
    "footer_contact_title",
    "Liên hệ",
  );
  const footerBottomLeft = getSettingValue(
    settings,
    "footer_bottom_left",
    "Tất cả quyền được bảo lưu.",
  );
  const footerBottomRight = getSettingValue(
    settings,
    "footer_bottom_right",
    "Thiết kế với tình yêu tại Việt Nam",
  );

  const shopLinks = FOOTER_SHOP_LINK_FIELDS.map(({ labelKey, hrefKey }) => ({
    label: getSettingValue(settings, labelKey).trim(),
    href: getSettingValue(settings, hrefKey).trim(),
  })).filter(({ label, href }) => label && href);

  const infoLinks = FOOTER_INFO_LINK_FIELDS.map(({ labelKey, hrefKey }) => ({
    label: getSettingValue(settings, labelKey).trim(),
    href: getSettingValue(settings, hrefKey).trim(),
  })).filter(({ label, href }) => label && href);

  return (
    <footer className="bg-foreground text-background/80">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="mb-3">
              <h3 className="font-display text-2xl font-semibold uppercase tracking-[0.06em] text-background">
                {storeName}
              </h3>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-background/60">
              {footerDescription}
            </p>
            <div className="flex items-center gap-3">
              <a
                href={fbUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-background/10 transition-colors hover:bg-primary hover:text-white"
              >
                <Facebook size={15} />
              </a>
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-background/10 transition-colors hover:bg-primary hover:text-white"
              >
                <Instagram size={15} />
              </a>
              <a
                href={ttUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-background/10 transition-colors hover:bg-primary hover:text-white"
              >
                <Youtube size={15} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-background">
              {footerShopTitle}
            </h4>
            <ul className="space-y-2.5">
              {shopLinks.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <FooterNavLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-background">
              {footerInfoTitle}
            </h4>
            <ul className="space-y-2.5">
              {infoLinks.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <FooterNavLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-background">
              {footerContactTitle}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-background/60">
                <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
                {storeAddress}
              </li>
              <li className="flex items-center gap-2.5 text-sm text-background/60">
                <Phone size={14} className="shrink-0 text-primary" />
                {storePhone}
              </li>
              <li className="flex items-center gap-2.5 text-sm text-background/60">
                <Mail size={14} className="shrink-0 text-primary" />
                {storeEmail}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-background/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 md:flex-row md:px-8">
          <p className="text-xs text-background/40">
            © {new Date().getFullYear()}. {footerBottomLeft}
          </p>
          <p className="text-xs text-background/40">{footerBottomRight}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
