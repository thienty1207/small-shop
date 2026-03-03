# Typography Deep Dive

Mastering type for web interfaces.

## Type Anatomy

```
      ascender height
          ↓
         ╭─╮
     H a │d│ g y
     ↑   │ │ │ ↓
     |   ╰─╯ │ descender
   x-height  │
     |       baseline
     ↓
```

Key terms:
- **x-height:** Height of lowercase letters (affects readability)
- **Ascender:** Parts extending above x-height (b, d, f, h, k, l, t)
- **Descender:** Parts extending below baseline (g, j, p, q, y)
- **Cap height:** Height of uppercase letters
- **Baseline:** Line where text sits

## Font Selection

### For Headings (Display)

| Font | Category | Vibe | Best For |
|------|----------|------|----------|
| **Space Grotesk** | Sans | Modern tech | SaaS, developer tools |
| **Clash Display** | Sans | Bold, edgy | Landing pages, marketing |
| **Playfair Display** | Serif | Editorial | Blogs, magazines |
| **Fraunces** | Serif | Warm, playful | Creative, lifestyle |
| **Cabinet Grotesk** | Sans | Professional | Business, corporate |
| **Satoshi** | Sans | Clean, neutral | Minimal designs |

### For Body Text

| Font | Category | x-height | Best At |
|------|----------|----------|---------|
| **Inter** | Sans | Tall | UI, dashboards, apps |
| **Source Sans 3** | Sans | Medium | Long-form reading |
| **IBM Plex Sans** | Sans | Tall | Technical docs |
| **Literata** | Serif | Tall | Articles, ebooks |
| **Work Sans** | Sans | Tall | Marketing, casual |
| **Geist** | Sans | Tall | Modern apps |

### Monospace (Code)

| Font | Style | Notes |
|------|-------|-------|
| **JetBrains Mono** | Modern | Ligatures, clear |
| **Fira Code** | Modern | Ligatures, popular |
| **IBM Plex Mono** | Clean | Great for small sizes |
| **Geist Mono** | Minimal | Vercel's choice |

## Font Pairing Rules

### 1. Contrast, Don't Match
```
✅ Serif heading + Sans body
✅ Heavy heading + Light body
✅ Condensed heading + Regular body

❌ Two similar sans-serifs
❌ Two fonts with same weight
```

### 2. Share One Attribute
```
Fonts should share:
- Similar x-height
- Same era/style influences
- Same foundry (often works well)
```

### 3. Proven Pairings

| Heading | Body | Vibe |
|---------|------|------|
| Space Grotesk | Inter | Tech startup |
| Playfair Display | Source Sans 3 | Editorial luxury |
| Clash Display | Satoshi | Bold contemporary |
| Fraunces | Work Sans | Friendly brand |
| Cabinet Grotesk | Inter | Professional SaaS |
| DM Serif Display | DM Sans | Balanced modern |

## Type Scale

### Modular Scale (ratio-based)
```css
/* Base: 16px, Ratio: 1.25 (Major Third) */
--text-xs: 0.64rem;   /* 10.24px */
--text-sm: 0.8rem;    /* 12.8px */
--text-base: 1rem;    /* 16px */
--text-lg: 1.25rem;   /* 20px */
--text-xl: 1.563rem;  /* 25px */
--text-2xl: 1.953rem; /* 31.25px */
--text-3xl: 2.441rem; /* 39px */
--text-4xl: 3.052rem; /* 48.83px */
```

### Practical Scale (hand-tuned)
```css
/* Tailwind-style scale */
--text-xs: 0.75rem;   /* 12px */
--text-sm: 0.875rem;  /* 14px */
--text-base: 1rem;    /* 16px */
--text-lg: 1.125rem;  /* 18px */
--text-xl: 1.25rem;   /* 20px */
--text-2xl: 1.5rem;   /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem;  /* 36px */
--text-5xl: 3rem;     /* 48px */
--text-6xl: 3.75rem;  /* 60px */
```

## Line Height

| Context | Line Height | Why |
|---------|-------------|-----|
| Headings | 1.1–1.2 | Tighter for impact |
| Short text | 1.3–1.4 | Cards, labels |
| Body text | 1.5–1.7 | Comfortable reading |
| Wide columns | 1.6–1.8 | Helps eye track |

```css
.heading { line-height: 1.1; }
.subheading { line-height: 1.25; }
.body { line-height: 1.6; }
.caption { line-height: 1.4; }
```

## Letter Spacing

| Context | Tracking | Value |
|---------|----------|-------|
| All caps | Wider | +0.05em to +0.1em |
| Large headings | Tighter | -0.02em to -0.04em |
| Body text | Normal | 0 |
| Small text | Slightly wider | +0.01em |

```css
.all-caps { 
  text-transform: uppercase; 
  letter-spacing: 0.05em; 
}
.heading-large { letter-spacing: -0.02em; }
.caption { letter-spacing: 0.01em; }
```

## Weight Usage

```
100 Thin        — Rarely, large display only
200 ExtraLight  — Decorative, large sizes
300 Light       — Secondary text, large sizes
400 Regular     — Body text default
500 Medium      — Emphasis, UI labels
600 SemiBold    — Subheadings, buttons
700 Bold        — Headings, strong emphasis
800 ExtraBold   — Hero headlines
900 Black       — Maximum impact
```

### Weight Pairing
```
Heading: 600-700 (SemiBold/Bold)
Body: 400 (Regular)
Emphasis: 500-600 (Medium/SemiBold)
Subdued: 400 with lower opacity
```

## Responsive Typography

```css
/* Fluid type with clamp() */
.heading {
  /* Min: 32px, Preferred: 5vw, Max: 64px */
  font-size: clamp(2rem, 5vw, 4rem);
}

.body {
  /* Min: 16px, Preferred: 1.2vw, Max: 20px */
  font-size: clamp(1rem, 1.2vw, 1.25rem);
}
```

### Breakpoint-based (Tailwind)
```html
<h1 class="text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
  Responsive Heading
</h1>
```

## Measure (Line Length)

Optimal characters per line: **45-75 characters**

```css
/* Constrain prose width */
.prose {
  max-width: 65ch; /* ~65 characters */
}

/* Or fixed width */
.content {
  max-width: 680px;
}
```

## Font Loading Strategy

```css
/* 1. Preload critical fonts */
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>

/* 2. Use font-display for fallback behavior */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap; /* Show fallback, then swap */
}
```

| `font-display` | Behavior |
|----------------|----------|
| `swap` | Show fallback immediately, swap when loaded |
| `optional` | Use font only if already cached |
| `fallback` | Brief invisible period, then fallback |
| `block` | Invisible until loaded (avoid) |

## Related Skills

- [Design Tokens](../../frontend-design/references/design-tokens.md) — Typography as design tokens
- [Tailwind Utilities](../../ui-styling/references/tailwind-utilities.md) — Typography utilities
- [Color Theory](color-theory.md) — Color and type interaction
