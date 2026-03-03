# Polish Checklist — Final Pass

## Stage 1: Visual Consistency

### Typography
- [ ] Only 2 font families used (display + body)
- [ ] Font sizes follow a consistent scale (not random px values)
- [ ] Heading weights differ from body weight (contrast)
- [ ] Line heights: ~1.15 for headings, ~1.6 for body
- [ ] Letter-spacing: slightly tight for large headings
- [ ] No orphan words in headings (add `<br />` if needed)
- [ ] Text truncation handled (`truncate` or `line-clamp`)

### Colors
- [ ] Max 5-6 colors in palette (including neutrals)
- [ ] Consistent use of semantic colors (primary, muted, destructive)
- [ ] Dark mode tested — not just inverted, but intentionally designed
- [ ] Contrast ratios meet WCAG AA (4.5:1 text, 3:1 large text)
- [ ] No raw color values — all referenced via CSS variables/tokens
- [ ] Disabled states are visually distinct but not invisible

### Spacing
- [ ] Consistent spacing scale (multiples of 4px or 8px)
- [ ] Component internal padding is consistent
- [ ] Section spacing creates visual breathing room
- [ ] No awkward gaps or cramped areas
- [ ] Card padding matches across all cards

### Borders & Shadows
- [ ] Border radius is consistent (pick ONE: 4, 8, or 12px)
- [ ] Shadows use color tinting (not plain gray)
- [ ] Borders use `border-border` token (not hardcoded gray)
- [ ] No double borders (from nested components)

---

## Stage 2: Interaction Quality

### Hover States
- [ ] Every clickable element has a hover state
- [ ] Hover transitions are smooth (150-200ms)
- [ ] Cursor changes to `pointer` for clickable elements
- [ ] Hover state is visually subtle (not jarring)
- [ ] Cards lift slightly on hover (`hover:-translate-y-0.5`)

### Focus States
- [ ] All interactive elements have visible focus rings
- [ ] Focus rings use `focus-visible` (not `focus` — avoids click flash)
- [ ] Tab order is logical (follows visual layout)
- [ ] Skip-to-content link exists

### Loading States
- [ ] All async operations show loading feedback
- [ ] Skeleton loaders match content shape
- [ ] Buttons show spinner + disabled state during submit
- [ ] Progress bars for long operations
- [ ] No layout shift when content loads

### Error States
- [ ] Form errors appear near the field, not just at top
- [ ] Error messages are helpful ("Invalid email format" not "Error")
- [ ] Error styling is consistent (color, icon, placement)
- [ ] 404 and error pages are on-brand

### Success States
- [ ] Successful actions get confirmation (toast, redirect, or message)
- [ ] Toast messages auto-dismiss (3-5 seconds)
- [ ] Success color is distinct from information color

---

## Stage 3: Responsive Quality

- [ ] **Mobile (320-640px):** Everything readable, no horizontal scroll
- [ ] **Tablet (768px):** Layout adapts (1 → 2 columns typically)
- [ ] **Desktop (1024px+):** Full layout, sidebar visible
- [ ] **Large (1440px+):** Content doesn't stretch too wide (max-width)
- [ ] Images are responsive (`object-cover`, proper aspect ratio)
- [ ] Navigation collapses to hamburger on mobile
- [ ] Touch targets are ≥44px on mobile
- [ ] No tiny click targets (padding around links/buttons)

---

## Stage 4: Performance

- [ ] Images use `next/image` or proper `srcset` + `loading="lazy"`
- [ ] Fonts preloaded (`display: swap`, WOFF2 format)
- [ ] No layout shift (CLS < 0.1)
- [ ] First paint < 1.5s
- [ ] Bundle size checked (no giant dependencies for small features)
- [ ] Unused CSS purged (Tailwind does this auto)

---

## Stage 5: Final Details

- [ ] Favicon set + meta tags + OpenGraph image
- [ ] Empty states designed (not just "No data")
- [ ] Scrollbar styled or hidden aesthetically
- [ ] Selection color customized (`::selection { background: ... }`)
- [ ] Print styles considered (if applicable)
- [ ] 404 page is helpful and on-brand
- [ ] Page title and meta description are set for every page
