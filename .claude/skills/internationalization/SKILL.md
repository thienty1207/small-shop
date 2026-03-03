# Internationalization (i18n)

> Localization, multi-language support, and locale handling across multiple stacks.


## Metadata
- **Category:** fullstack-patterns
- **Scope:** Backend + Frontend
- **Complexity:** Intermediate
- **Maturity:** Stable

## Overview

Internationalization (i18n) enables applications to support multiple languages and regional formats without code changes.

### Key Concepts

| Term | Description |
|------|-------------|
| **i18n** | Internationalization - designing for multiple locales |
| **l10n** | Localization - adapting content for a locale |
| **Locale** | Language + region (e.g., `en-US`, `vi-VN`) |
| **ICU** | Unicode standard for formatting |

## Backend i18n

### Rust - rust-i18n

```rust
// Cargo.toml: rust-i18n = "3"

rust_i18n::i18n!("locales");

use rust_i18n::t;

// locales/en.yml
// messages:
//   welcome: "Welcome, %{name}!"
//   items_count:
//     one: "1 item"
//     other: "%{count} items"

fn greet_user(name: &str, locale: &str) -> String {
    rust_i18n::set_locale(locale);
    t!("messages.welcome", name = name)
}

fn format_items(count: i32, locale: &str) -> String {
    rust_i18n::set_locale(locale);
    t!("messages.items_count", count = count)
}

// Axum middleware for locale detection
pub async fn locale_middleware(
    headers: HeaderMap,
    mut request: Request,
    next: Next,
) -> Response {
    let locale = headers
        .get("Accept-Language")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split(',').next())
        .and_then(|v| v.split('-').next())
        .unwrap_or("en");
    
    rust_i18n::set_locale(locale);
    request.extensions_mut().insert(Locale(locale.to_string()));
    
    next.run(request).await
}
```

### Go - go-i18n

```go
import (
    "github.com/nicksnyder/go-i18n/v2/i18n"
    "golang.org/x/text/language"
)

type I18nService struct {
    bundle    *i18n.Bundle
    localizer map[string]*i18n.Localizer
}

func NewI18nService() *I18nService {
    bundle := i18n.NewBundle(language.English)
    bundle.RegisterUnmarshalFunc("yaml", yaml.Unmarshal)
    bundle.LoadMessageFile("locales/en.yml")
    bundle.LoadMessageFile("locales/vi.yml")
    
    return &I18nService{
        bundle: bundle,
        localizer: map[string]*i18n.Localizer{
            "en": i18n.NewLocalizer(bundle, "en"),
            "vi": i18n.NewLocalizer(bundle, "vi"),
        },
    }
}

func (s *I18nService) T(locale, messageID string, data map[string]interface{}) string {
    loc, ok := s.localizer[locale]
    if !ok {
        loc = s.localizer["en"]
    }
    
    msg, _ := loc.Localize(&i18n.LocalizeConfig{
        MessageID:    messageID,
        TemplateData: data,
    })
    return msg
}

// Fiber middleware
func LocaleMiddleware(i18n *I18nService) fiber.Handler {
    return func(c *fiber.Ctx) error {
        lang := c.Get("Accept-Language", "en")
        c.Locals("locale", strings.Split(lang, "-")[0])
        return c.Next()
    }
}
```

### Python - Babel

```python
from babel import Locale
from babel.support import Translations
import gettext

class I18nService:
    def __init__(self, locales_dir: str, default_locale: str = "en"):
        self.translations = {}
        self.default_locale = default_locale
        
        for locale in ["en", "vi", "ja"]:
            try:
                self.translations[locale] = Translations.load(locales_dir, [locale])
            except:
                pass
    
    def t(self, message_id: str, locale: str = None, **kwargs) -> str:
        locale = locale or self.default_locale
        trans = self.translations.get(locale, self.translations[self.default_locale])
        translated = trans.gettext(message_id)
        return translated.format(**kwargs) if kwargs else translated

# FastAPI dependency
async def get_locale(request: Request) -> str:
    accept_lang = request.headers.get("Accept-Language", "en")
    return accept_lang.split("-")[0].split(",")[0]

@app.get("/greeting")
async def greeting(locale: str = Depends(get_locale)):
    return {"message": i18n.t("welcome", locale=locale)}
```

### Node.js - i18next

```typescript
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';

await i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'vi', 'ja'],
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
  });

// Express middleware
app.use(middleware.handle(i18next));

// Usage
app.get('/greeting', (req, res) => {
  res.json({ message: req.t('welcome', { name: 'User' }) });
});
```

## Frontend i18n (Next.js)

### next-intl

```typescript
// messages/en.json
{
  "home": {
    "title": "Welcome, {name}!",
    "items": "{count, plural, =0 {No items} =1 {1 item} other {# items}}"
  }
}

// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();
  
  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

// app/[locale]/page.tsx
import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('home');
  
  return (
    <div>
      <h1>{t('title', { name: 'User' })}</h1>
      <p>{t('items', { count: 5 })}</p>
    </div>
  );
}

// i18n.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default
}));

// middleware.ts
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'vi', 'ja'],
  defaultLocale: 'en',
});
```

## Number/Date Formatting

```typescript
// Using Intl API (universal)
const formatCurrency = (amount: number, locale: string, currency: string) => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

formatCurrency(1234.56, 'en-US', 'USD'); // $1,234.56
formatCurrency(1234.56, 'vi-VN', 'VND'); // 1.234,56 ₫

const formatDate = (date: Date, locale: string) => {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
  }).format(date);
};

formatDate(new Date(), 'en-US'); // January 1, 2024
formatDate(new Date(), 'vi-VN'); // 1 tháng 1, 2024
```

```rust
// Rust with icu crate
use icu::decimal::FixedDecimalFormatter;
use icu::locid::locale;

let fdf = FixedDecimalFormatter::try_new(&locale!("vi").into(), Default::default())?;
let formatted = fdf.format(&1234567.into()); // "1.234.567"
```

## Related Skills

- [nextjs-turborepo](../nextjs-turborepo/SKILL.md) - Frontend i18n routing
- [authentication](../authentication/SKILL.md) - User locale preferences
- [databases](../databases/SKILL.md) - Store translations
