# Accessibility Patterns

Building inclusive interfaces with WCAG compliance.

## Core Principles (POUR)

| Principle | Meaning | Example |
|-----------|---------|---------|
| **P**erceivable | Content can be seen/heard | Alt text, captions |
| **O**perable | UI can be used | Keyboard nav, no seizures |
| **U**nderstandable | Content makes sense | Clear labels, predictable |
| **R**obust | Works with assistive tech | Valid HTML, ARIA |

## Keyboard Navigation

### Focus Management
```tsx
// Visible focus indicator
<button className="
  focus:outline-none
  focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
">
  Click me
</button>

// Skip link for keyboard users
<a 
  href="#main-content" 
  className="
    sr-only focus:not-sr-only
    focus:absolute focus:top-4 focus:left-4
    focus:z-50 focus:px-4 focus:py-2 focus:bg-white
  "
>
  Skip to main content
</a>
```

### Tab Order
```tsx
// Natural order (good)
<form>
  <input tabIndex={0} />  {/* First */}
  <input tabIndex={0} />  {/* Second */}
  <button tabIndex={0} /> {/* Third */}
</form>

// Avoid positive tabIndex values
<input tabIndex={5} />  // ❌ Don't do this

// Remove from tab order when needed
<div tabIndex={-1}>
  Not focusable via keyboard
</div>
```

### Focus Trap for Modals
```tsx
import { useEffect, useRef } from 'react'

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements?.[0] as HTMLElement
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement
    
    // Focus first element on open
    firstElement?.focus()
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null
  
  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
    </div>
  )
}
```

## ARIA Attributes

### Common Patterns

```tsx
// Button that opens menu
<button 
  aria-expanded={isOpen} 
  aria-haspopup="menu"
  aria-controls="user-menu"
>
  Menu
</button>
<ul id="user-menu" role="menu" hidden={!isOpen}>
  <li role="menuitem"><a href="/profile">Profile</a></li>
</ul>

// Loading state
<button aria-busy={isLoading} disabled={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</button>

// Error message connection
<div>
  <label htmlFor="email">Email</label>
  <input 
    id="email"
    aria-describedby="email-error"
    aria-invalid={hasError}
  />
  {hasError && (
    <p id="email-error" role="alert">
      Please enter a valid email
    </p>
  )}
</div>

// Live region for dynamic content
<div aria-live="polite" aria-atomic="true">
  {notification}
</div>
```

### ARIA Roles Reference

| Role | Use Case |
|------|----------|
| `alert` | Important time-sensitive message |
| `alertdialog` | Alert requiring response |
| `button` | Clickable element (if not `<button>`) |
| `dialog` | Modal window |
| `menu` | Navigation menu |
| `menuitem` | Item in a menu |
| `navigation` | Nav section |
| `progressbar` | Progress indicator |
| `search` | Search section |
| `status` | Status message |
| `tab`, `tablist`, `tabpanel` | Tab interface |

## Screen Reader Support

### Hidden Content
```tsx
// Visually hidden but screen reader accessible
<span className="sr-only">
  Opens in new window
</span>

// Hidden from everyone (including screen readers)
<div aria-hidden="true">
  Decorative element
</div>
<div hidden>
  Completely hidden
</div>
```

### Announcing Changes
```tsx
// Region that announces changes
<div 
  role="status" 
  aria-live="polite"    // Wait for user to finish
  aria-atomic="true"    // Read entire region
>
  {itemCount} items in cart
</div>

// Urgent announcement
<div role="alert" aria-live="assertive">
  Error: Payment failed
</div>
```

### Icon Buttons
```tsx
// With visible label (best)
<button>
  <TrashIcon aria-hidden="true" />
  <span>Delete</span>
</button>

// Icon only (needs label)
<button aria-label="Delete item">
  <TrashIcon aria-hidden="true" />
</button>

// Using aria-labelledby
<button aria-labelledby="delete-label">
  <TrashIcon aria-hidden="true" />
</button>
<span id="delete-label" className="sr-only">Delete item</span>
```

## Color & Contrast

### WCAG Contrast Requirements

| Standard | Ratio | Use |
|----------|-------|-----|
| AA (normal text) | 4.5:1 | Body text |
| AA (large text) | 3:1 | 18pt+ or 14pt bold |
| AAA (normal text) | 7:1 | Best practice |
| Non-text | 3:1 | Icons, borders |

### Testing with Tailwind
```tsx
// Good contrast examples
<p className="text-gray-900 bg-white">        // ~21:1 ✅
<p className="text-gray-600 bg-white">        // ~5.7:1 ✅
<p className="text-gray-400 bg-white">        // ~2.6:1 ❌ Fails AA

// Dark mode considerations
<p className="text-zinc-100 dark:text-zinc-100 bg-zinc-900">  // Good
```

### Don't Rely on Color Alone
```tsx
// ❌ Bad: Only color indicates error
<input className={error ? 'border-red-500' : 'border-gray-300'} />

// ✅ Good: Color + icon + text
<div>
  <input 
    className={error ? 'border-red-500' : 'border-gray-300'}
    aria-invalid={!!error}
    aria-describedby={error ? 'error-message' : undefined}
  />
  {error && (
    <p id="error-message" className="text-red-500 flex items-center gap-1">
      <ExclamationIcon className="w-4 h-4" />
      {error}
    </p>
  )}
</div>
```

## Forms

### Accessible Form Pattern
```tsx
<form>
  <div className="space-y-4">
    {/* Text input with label */}
    <div>
      <label htmlFor="name" className="block text-sm font-medium">
        Full Name
        <span className="text-red-500" aria-hidden="true">*</span>
      </label>
      <input
        id="name"
        type="text"
        required
        aria-required="true"
        className="mt-1 block w-full rounded-md border..."
      />
    </div>

    {/* Select with description */}
    <div>
      <label htmlFor="country">Country</label>
      <select id="country" aria-describedby="country-hint">
        <option>Select a country</option>
      </select>
      <p id="country-hint" className="text-sm text-gray-500">
        We'll use this for shipping calculations
      </p>
    </div>

    {/* Checkbox group */}
    <fieldset>
      <legend className="text-sm font-medium">Notifications</legend>
      <div className="mt-2 space-y-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="notifications" value="email" />
          <span>Email</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="notifications" value="sms" />
          <span>SMS</span>
        </label>
      </div>
    </fieldset>

    <button type="submit">Submit</button>
  </div>
</form>
```

## Testing Checklist

```markdown
Manual Testing:
- [ ] Navigate entire page using only Tab/Shift+Tab
- [ ] All interactive elements have visible focus
- [ ] Focus order makes sense
- [ ] Modals trap focus correctly
- [ ] Escape closes modals

Screen Reader Testing:
- [ ] Test with VoiceOver (Mac) or NVDA (Windows)
- [ ] All images have meaningful alt text
- [ ] Form labels announce correctly
- [ ] Dynamic content changes announced
- [ ] Buttons describe their action

Automated Testing:
- [ ] Run axe-core or Lighthouse
- [ ] Check color contrast ratios
- [ ] Validate HTML structure
```

## Related Skills

- [Accessibility Testing](../../testing/references/accessibility-testing.md) — Automated testing
- [shadcn Components](shadcn-components.md) — Pre-built accessible components
- [Component Styling](../../frontend-design/references/component-styling.md) — Focus styles
