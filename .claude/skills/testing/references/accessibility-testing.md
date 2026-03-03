# Accessibility Testing

## WCAG 2.1 Quick Reference

### Level A (Must Have)
- All images have `alt` text (or `alt=""` for decorative)
- All form inputs have associated `<label>`
- Page has a single `<h1>`, logical heading order
- Color is not the only means of conveying information
- Text content is available to screen readers
- Keyboard-accessible (Tab, Enter, Escape, Arrow keys)

### Level AA (Should Have)
- Color contrast: 4.5:1 for normal text, 3:1 for large text
- Text resizable to 200% without loss of functionality
- Focus indicator visible on all interactive elements
- Error messages are descriptive and suggest corrections
- Skip navigation link for keyboard users

## axe-core Integration

### Playwright + axe
```typescript
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('homepage has no accessibility violations', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  
  expect(results.violations).toEqual([])
})

test('login form is accessible', async ({ page }) => {
  await page.goto('/login')
  const results = await new AxeBuilder({ page })
    .include('#login-form')
    .analyze()
  
  expect(results.violations).toEqual([])
})
```

### CLI Testing
```bash
# Quick scan
npx @axe-core/cli https://localhost:3000

# With specific rules
npx @axe-core/cli https://localhost:3000 --rules color-contrast,label
```

## Keyboard Navigation Testing

```markdown
## Manual Keyboard Test Checklist
- [ ] Tab through all interactive elements (links, buttons, inputs)
- [ ] Tab order follows visual order (left→right, top→bottom)
- [ ] Focus indicator is visible on every element
- [ ] Escape closes modals/dropdowns
- [ ] Enter/Space activates buttons
- [ ] Arrow keys navigate within components (tabs, menus)
- [ ] Skip link is first focusable element
- [ ] No keyboard traps (can always Tab away)
```

## Common Fixes

### Missing Labels
```tsx
// ❌ BAD: No label association
<input type="text" placeholder="Email" />

// ✅ FIX: Explicit label
<label htmlFor="email">Email</label>
<input id="email" type="text" />

// ✅ FIX: aria-label for icon-only buttons
<button aria-label="Close dialog"><X /></button>
```

### Focus Management
```tsx
// Focus first input when dialog opens
const dialogRef = useRef<HTMLInputElement>(null)
useEffect(() => {
  if (isOpen) dialogRef.current?.focus()
}, [isOpen])

// Trap focus inside modal
import { FocusTrap } from '@radix-ui/react-focus-scope'
<FocusTrap><DialogContent>...</DialogContent></FocusTrap>
```

### Skip Navigation
```html
<a href="#main-content" class="sr-only focus:not-sr-only">
  Skip to main content
</a>
<!-- ... header/nav ... -->
<main id="main-content">...</main>
```

### Screen Reader Only Text
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

## Lighthouse Accessibility Audit
```bash
npx lighthouse http://localhost:3000 \
  --only-categories=accessibility \
  --output=html \
  --output-path=./a11y-report.html
```
