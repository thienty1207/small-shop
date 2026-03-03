# Next.js Optimization

## Image Optimization

```tsx
import Image from 'next/image'

// Local image (auto-optimized)
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority          // Preload for above-the-fold
  className="rounded-lg"
/>

// Remote image (add domain to config)
<Image
  src="https://cdn.example.com/photo.jpg"
  alt="Product photo"
  width={400}
  height={400}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  loading="lazy"    // Default: lazy load
/>

// Fill container
<div className="relative aspect-video">
  <Image
    src="/banner.jpg"
    alt="Banner"
    fill
    className="object-cover rounded-lg"
    sizes="100vw"
  />
</div>
```

```javascript
// next.config.js — remote image domains
module.exports = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.example.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
    ]
  }
}
```

## Font Optimization

```tsx
// app/layout.tsx — Auto-optimized Google Fonts
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono'
})

export default function RootLayout({ children }) {
  return (
    <html className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

```css
/* globals.css */
@theme {
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-mono: var(--font-mono), monospace;
}
```

## Metadata & SEO

```tsx
// app/layout.tsx — Global metadata
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | My App',
    default: 'My App — Build Better Software'
  },
  description: 'The modern platform for building production-ready applications.',
  metadataBase: new URL('https://myapp.com'),
  openGraph: {
    title: 'My App',
    description: 'Build better software',
    images: ['/og-image.png'],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My App',
    description: 'Build better software',
    images: ['/og-image.png']
  },
  robots: { index: true, follow: true }
}

// app/blog/[slug]/page.tsx — Per-page metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug)
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage]
    }
  }
}
```

## Bundle Analysis

```bash
# Install analyzer
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})
module.exports = withBundleAnalyzer({ /* config */ })

# Run analysis
ANALYZE=true npm run build
# Opens interactive treemap in browser
```

## Script Optimization

```tsx
import Script from 'next/script'

// Analytics — load after page is interactive
<Script
  src="https://www.google-analytics.com/analytics.js"
  strategy="afterInteractive"  // Default
/>

// Non-critical — load when browser is idle
<Script
  src="https://connect.facebook.net/en_US/sdk.js"
  strategy="lazyOnload"
/>

// Critical — load before page hydrates
<Script
  src="https://cdn.polyfill.io/v3/polyfill.min.js"
  strategy="beforeInteractive"
/>
```

## Performance Checklist

```markdown
### Core Web Vitals
- [ ] LCP (Largest Contentful Paint) < 2.5s
      → Use `priority` on hero images, preload fonts
- [ ] FID (First Input Delay) < 100ms
      → Minimize JS, use Server Components
- [ ] CLS (Cumulative Layout Shift) < 0.1
      → Set width/height on images, use skeleton loaders

### Build Optimization
- [ ] Dynamic imports for heavy components
      → `const Chart = dynamic(() => import('./Chart'), { ssr: false })`
- [ ] Tree-shaking — import only what you need
      → `import { Button } from '@/components/ui/button'`
- [ ] Minimize client bundle — default to Server Components
- [ ] Enable PPR (Partial Prerendering) if available
```
