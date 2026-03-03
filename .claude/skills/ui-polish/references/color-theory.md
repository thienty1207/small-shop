# Color Theory Applied

## Palette Generation Techniques

### Method 1: HSL-Based System
```css
/* Start with ONE hue, build shades */
:root {
  /* Base hue: 262 (purple) */
  --color-primary-50:  hsl(262, 80%, 97%);
  --color-primary-100: hsl(262, 75%, 92%);
  --color-primary-200: hsl(262, 70%, 82%);
  --color-primary-300: hsl(262, 65%, 70%);
  --color-primary-400: hsl(262, 60%, 58%);
  --color-primary-500: hsl(262, 55%, 48%);  /* Primary */
  --color-primary-600: hsl(262, 55%, 38%);
  --color-primary-700: hsl(262, 55%, 30%);
  --color-primary-800: hsl(262, 55%, 22%);
  --color-primary-900: hsl(262, 55%, 15%);
  --color-primary-950: hsl(262, 50%, 8%);
  
  /* Pattern: As shade darkens:
     - Saturation stays or slightly decreases
     - Lightness decreases evenly */
}
```

### Method 2: OKLCH (Modern, Perceptually Uniform)
```css
:root {
  --brand: oklch(0.65 0.24 285);        /* Vivid purple */
  --brand-light: oklch(0.85 0.12 285);  /* Pastel */
  --brand-dark: oklch(0.35 0.18 285);   /* Deep */
  
  --accent: oklch(0.75 0.18 165);       /* Teal accent */
  
  /* oklch = Lightness (0-1), Chroma (0-0.4+), Hue (0-360) */
}
```

## Color Harmony Rules

### Complementary (High Contrast)
```
Base hue + 180° = Complement
Purple (270°) ↔ Yellow (90°)
Blue (240°) ↔ Orange (30°)
Teal (180°) ↔ Coral (0°)

Use: CTA buttons, highlights, accent elements
Warning: Don't use 50/50 — use 80/20 ratio
```

### Analogous (Harmonious)
```
Base hue ± 30° = Neighbors
Purple (270°) → Blue (240°) → Violet (300°)
Teal (180°) → Green (150°) → Cyan (210°)

Use: Backgrounds, gradients, subtle themeing
Low contrast — good for creating mood
```

### Triadic (Balanced)
```
Base hue + 120° + 240°
Red (0°) → Green (120°) → Blue (240°)
Orange (30°) → Teal (150°) → Purple (270°)

Use: Data visualization, multi-category UIs
Need careful saturation balance
```

## Emotional Associations

| Color | Emotion | Use In |
|-------|---------|--------|
| Blue | Trust, stability, calm | Finance, healthcare, corporate |
| Green | Growth, nature, success | Eco, wellness, money |
| Purple | Premium, creative, luxury | SaaS, creative tools |
| Red | Urgency, passion, energy | Sales, food, alerts |
| Orange | Friendly, playful, warm | Social, entertainment |
| Yellow | Optimism, attention | Warnings, highlights |
| Pink | Modern, playful, soft | Fashion, beauty, lifestyle |
| Teal | Sophisticated, fresh | Tech, startups |
| Slate/Gray | Professional, neutral | Enterprise, dashboards |

## Dark Mode Color Strategy

```css
/* DON'T: Simply invert all colors */
/* DO: Design intentionally for dark mode */

:root {
  /* Light mode */
  --bg-primary: hsl(0 0% 100%);         /* Pure white */
  --bg-surface: hsl(220 14% 96%);       /* Slight blue tint */
  --text-primary: hsl(220 16% 12%);     /* Near black, slight warmth */
  --text-secondary: hsl(220 12% 45%);
}

.dark {
  /* Dark mode — NOT inverted! */
  --bg-primary: hsl(220 16% 8%);        /* Dark blue-gray, NOT pure black */
  --bg-surface: hsl(220 16% 12%);       /* Slightly lighter surface */
  --text-primary: hsl(220 10% 92%);     /* Off-white, NOT pure white */
  --text-secondary: hsl(220 10% 60%);   /* Medium gray */
  
  /* Key insight: Dark mode backgrounds have subtle color tint
     Pure #000 is harsh; hsl(220, 16%, 8%) feels sophisticated */
}
```

## Gradient Recipes

```css
/* Subtle section gradient */
background: linear-gradient(135deg, 
  hsl(262 80% 97%) 0%, 
  hsl(270 80% 95%) 100%
);

/* Button gradient */
background: linear-gradient(135deg, 
  hsl(262 55% 48%) 0%, 
  hsl(280 55% 45%) 100%
);

/* Mesh gradient (multiple colors) */
background: 
  radial-gradient(at 20% 20%, hsl(262 80% 90%) 0%, transparent 50%),
  radial-gradient(at 80% 20%, hsl(180 60% 85%) 0%, transparent 50%),
  radial-gradient(at 50% 80%, hsl(330 70% 90%) 0%, transparent 50%),
  hsl(0 0% 100%);

/* Text gradient */
.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

## Contrast Checking

```
WCAG AA requirements:
- Normal text (<18px): contrast ratio ≥ 4.5:1
- Large text (≥18px bold, ≥24px): contrast ratio ≥ 3:1
- UI components: contrast ratio ≥ 3:1

Tools: 
- Chrome DevTools color picker (shows contrast ratio)
- webaim.org/resources/contrastchecker
- coolors.co/contrast-checker
```
