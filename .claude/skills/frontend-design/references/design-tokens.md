# Design Tokens System

## Complete Token Architecture

```css
/* Design tokens — base layer */
:root {
  /* === SPACING === */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */

  /* === TYPE SCALE (modular, ratio 1.25) === */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  --text-5xl: 3rem;       /* 48px */
  --text-6xl: 3.75rem;    /* 60px */

  /* === FONT WEIGHTS === */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* === LINE HEIGHTS === */
  --leading-tight: 1.15;
  --leading-snug: 1.35;
  --leading-normal: 1.5;
  --leading-relaxed: 1.65;

  /* === LETTER SPACING === */
  --tracking-tight: -0.025em;
  --tracking-normal: 0;
  --tracking-wide: 0.025em;

  /* === BORDER RADIUS === */
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-xl: 1rem;      /* 16px */
  --radius-2xl: 1.5rem;   /* 24px */
  --radius-full: 9999px;

  /* === SHADOWS (with color tinting) === */
  --shadow-sm: 0 1px 2px hsl(0 0% 0% / 0.05);
  --shadow-md: 0 4px 6px -1px hsl(0 0% 0% / 0.07), 
               0 2px 4px -2px hsl(0 0% 0% / 0.05);
  --shadow-lg: 0 10px 15px -3px hsl(0 0% 0% / 0.08), 
               0 4px 6px -4px hsl(0 0% 0% / 0.04);
  --shadow-xl: 0 20px 25px -5px hsl(0 0% 0% / 0.1), 
               0 8px 10px -6px hsl(0 0% 0% / 0.04);

  /* === TRANSITIONS === */
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* === Z-INDEX SCALE === */
  --z-dropdown: 50;
  --z-sticky: 100;
  --z-fixed: 200;
  --z-modal-backdrop: 300;
  --z-modal: 400;
  --z-popover: 500;
  --z-tooltip: 600;
  --z-toast: 700;
}
```

## Using Tokens in Components

```tsx
// Tailwind config (extending with tokens)
// tailwind.config.ts
export default {
  theme: {
    extend: {
      spacing: {
        'section': 'var(--space-24)',
        'card-padding': 'var(--space-6)',
      },
      boxShadow: {
        'card': 'var(--shadow-md)',
        'elevated': 'var(--shadow-lg)',
      },
      transitionDuration: {
        'fast': 'var(--duration-fast)',
        'normal': 'var(--duration-normal)',
      }
    }
  }
}
```

```tsx
// Direct CSS usage
<div style={{
  padding: 'var(--space-6)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-md)',
  transition: `all var(--duration-normal) var(--ease-out)`
}}>
  Content
</div>
```

## Token Naming Convention

```
--{category}-{property}-{variant}

Examples:
--color-primary-500
--space-4
--text-lg
--shadow-md
--radius-lg
--duration-normal
--z-modal
```
