# Tailwind CSS v4 Features

New features in Tailwind v4 and CSS-first configuration.

## Breaking Changes from v3

| v3 | v4 | Notes |
|----|----|----|
| `tailwind.config.js` | `@theme` in CSS | CSS-first config |
| `@apply` | Still works | Now uses CSS variables |
| `arbitrary values` | Same syntax | `[value]` |
| `important` selector | `@layer` based | Different specificity |

## CSS-First Configuration

### The @theme Directive

```css
/* app.css */
@import "tailwindcss";

@theme {
  /* Colors */
  --color-primary: #6366f1;
  --color-primary-hover: #4f46e5;
  --color-background: #ffffff;
  --color-foreground: #09090b;
  
  /* Typography */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  
  /* Spacing scale */
  --spacing-18: 4.5rem;
  --spacing-22: 5.5rem;
  
  /* Border radius */
  --radius-4xl: 2rem;
  
  /* Shadows */
  --shadow-glow: 0 0 20px rgba(99, 102, 241, 0.3);
  
  /* Animations */
  --animate-slide-up: slide-up 0.3s ease-out;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Usage in Components
```html
<div class="bg-primary text-background p-18 rounded-4xl shadow-glow animate-slide-up">
  Custom themed content
</div>
```

## Container Queries

### Basic Usage
```html
<!-- Container -->
<div class="@container">
  <!-- Responsive to container, not viewport -->
  <div class="@sm:flex @md:grid @lg:grid-cols-3">
    Content adapts to container size
  </div>
</div>
```

### Named Containers
```html
<div class="@container/sidebar">
  <nav class="@md/sidebar:flex-col">
    Responds to sidebar container width
  </nav>
</div>
```

### Container Query Breakpoints
| Class | Min Width |
|-------|-----------|
| `@xs` | 20rem (320px) |
| `@sm` | 24rem (384px) |
| `@md` | 28rem (448px) |
| `@lg` | 32rem (512px) |
| `@xl` | 36rem (576px) |
| `@2xl` | 42rem (672px) |

## New Utilities

### Text Balance
```html
<!-- Balances line lengths for headings -->
<h1 class="text-balance">
  This heading will have balanced line lengths across multiple lines
</h1>

<!-- Pretty wrapping for body text -->
<p class="text-pretty">
  Avoids orphans and widows in paragraphs
</p>
```

### Subgrid
```html
<div class="grid grid-cols-4 gap-4">
  <div class="col-span-2 grid grid-cols-subgrid">
    <!-- Inherits parent grid tracks -->
    <div>Aligned to parent grid</div>
    <div>Perfectly aligned</div>
  </div>
</div>
```

### Field Sizing
```html
<!-- Input grows with content -->
<textarea class="field-sizing-content">
  Auto-resizes based on content
</textarea>
```

### Starting Style (Entry Animations)
```css
@starting-style {
  .dialog[open] {
    opacity: 0;
    transform: scale(0.95);
  }
}

.dialog[open] {
  opacity: 1;
  transform: scale(1);
  transition: opacity 0.2s, transform 0.2s;
}
```

## Improved Dark Mode

### Automatic Variant
```html
<!-- v4 automatically generates dark mode variants -->
<div class="bg-white dark:bg-zinc-900">
  <!-- Works as before -->
</div>
```

### System Preference Support
```css
@theme {
  /* Light mode defaults */
  --color-background: #ffffff;
  --color-foreground: #09090b;
}

@media (prefers-color-scheme: dark) {
  @theme {
    --color-background: #09090b;
    --color-foreground: #fafafa;
  }
}
```

## Simplified Arbitrary Values

### Comparison
```html
<!-- v3 (still works) -->
<div class="top-[117px] bg-[#bada55]">

<!-- v4 prefers CSS variables -->
<div class="top-(--header-height) bg-(--brand-color)">
```

### With Expressions
```html
<!-- Calculations -->
<div class="w-[calc(100%-2rem)]">

<!-- CSS functions -->
<div class="bg-[color-mix(in_srgb,var(--primary)_70%,white)]">
```

## Plugin Migration

### v3 Plugin
```javascript
// tailwind.config.js (v3)
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: '#ff6b6b',
      },
    },
  },
}
```

### v4 Equivalent
```css
/* app.css (v4) */
@theme {
  --color-brand: #ff6b6b;
}
```

## Performance Improvements

| Aspect | v3 | v4 |
|--------|-----|-----|
| Build time | ~250ms | ~50ms |
| Parse time | JS config | Native CSS |
| HMR | Full rebuild | Incremental |
| Output size | Similar | Slightly smaller |

## Migration Checklist

```markdown
- [ ] Update to Tailwind v4
- [ ] Move tailwind.config.js to @theme in CSS
- [ ] Update @apply if using custom utilities
- [ ] Test dark mode behavior
- [ ] Check plugin compatibility
- [ ] Verify build output
```

## Related Skills

- [Tailwind Utilities](tailwind-utilities.md) — Core utility reference
- [Theming & Dark Mode](theming-darkmode.md) — Theme configuration
- [Design Tokens](../../frontend-design/references/design-tokens.md) — Token standards
