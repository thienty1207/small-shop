# Component Styling Guide

Styling components with personality beyond generic defaults.

## Buttons

### Default (Generic) vs Distinctive
```css
/* ❌ Generic Bootstrap-style */
.button {
  background: #007bff;
  border-radius: 4px;
  padding: 8px 16px;
}

/* ✅ Distinctive personality */
.button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 12px 24px;
  box-shadow: 0 4px 14px 0 rgba(102, 126, 234, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px 0 rgba(102, 126, 234, 0.5);
}
```

### Button Variants Library

```tsx
// Tailwind + Custom styles
const buttonVariants = {
  // Primary with gradient
  primary: `
    bg-gradient-to-r from-indigo-500 to-purple-600
    text-white font-medium
    px-6 py-3 rounded-xl
    shadow-lg shadow-indigo-500/30
    hover:shadow-xl hover:shadow-indigo-500/40
    hover:-translate-y-0.5
    transition-all duration-200
  `,
  
  // Subtle with border
  secondary: `
    bg-white dark:bg-zinc-900
    text-zinc-900 dark:text-zinc-100
    border border-zinc-200 dark:border-zinc-700
    px-6 py-3 rounded-xl
    hover:bg-zinc-50 dark:hover:bg-zinc-800
    transition-colors duration-200
  `,
  
  // Ghost (minimal)
  ghost: `
    text-zinc-600 dark:text-zinc-400
    px-4 py-2 rounded-lg
    hover:bg-zinc-100 dark:hover:bg-zinc-800
    transition-colors duration-200
  `,
  
  // Destructive
  danger: `
    bg-red-500 text-white
    px-6 py-3 rounded-xl
    hover:bg-red-600
    transition-colors duration-200
  `,
}
```

### Icon Button Patterns
```tsx
// Icon only
<button className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
  <TrashIcon className="w-5 h-5 text-zinc-500" />
</button>

// Icon + text
<button className="inline-flex items-center gap-2 px-4 py-2 ...">
  <PlusIcon className="w-4 h-4" />
  <span>Add Item</span>
</button>

// Loading state
<button disabled className="opacity-50 cursor-not-allowed">
  <Spinner className="w-4 h-4 animate-spin" />
  <span>Processing...</span>
</button>
```

## Cards

### Card Anatomy
```
┌─────────────────────────────────────┐
│ Header (optional)                   │
│ - Title, subtitle, actions          │
├─────────────────────────────────────┤
│ Media (optional)                    │
│ - Image, video, illustration        │
├─────────────────────────────────────┤
│ Content                             │
│ - Main body, text, elements         │
├─────────────────────────────────────┤
│ Footer (optional)                   │
│ - Actions, metadata, links          │
└─────────────────────────────────────┘
```

### Card Styles

```tsx
// Elevated card (shadow-based)
<div className="
  bg-white dark:bg-zinc-900
  rounded-2xl
  shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50
  p-6
">

// Bordered card (outline-based)
<div className="
  bg-white dark:bg-zinc-900
  border border-zinc-200 dark:border-zinc-800
  rounded-2xl
  p-6
">

// Glass card (backdrop blur)
<div className="
  bg-white/70 dark:bg-zinc-900/70
  backdrop-blur-xl
  border border-white/20 dark:border-zinc-700/50
  rounded-2xl
  p-6
">

// Interactive card
<div className="
  bg-white dark:bg-zinc-900
  border border-zinc-200 dark:border-zinc-800
  rounded-2xl p-6
  hover:border-zinc-300 dark:hover:border-zinc-700
  hover:shadow-lg
  transition-all duration-200
  cursor-pointer
">
```

## Form Inputs

### Input Field Styles

```tsx
// Modern minimal
<input className="
  w-full px-4 py-3
  bg-zinc-50 dark:bg-zinc-900
  border border-zinc-200 dark:border-zinc-800
  rounded-xl
  text-zinc-900 dark:text-zinc-100
  placeholder:text-zinc-400
  focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
  transition-all duration-200
"/>

// Underline style
<input className="
  w-full py-3 px-0
  bg-transparent
  border-b-2 border-zinc-200 dark:border-zinc-700
  text-zinc-900 dark:text-zinc-100
  placeholder:text-zinc-400
  focus:outline-none focus:border-indigo-500
  transition-colors duration-200
"/>

// Floating label
<div className="relative">
  <input
    id="email"
    className="peer w-full px-4 pt-6 pb-2 ..."
    placeholder=" "
  />
  <label
    htmlFor="email"
    className="
      absolute left-4 top-4
      text-zinc-500
      transition-all duration-200
      peer-placeholder-shown:top-4 peer-placeholder-shown:text-base
      peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-500
    "
  >
    Email
  </label>
</div>
```

### Select Dropdown
```tsx
<div className="relative">
  <select className="
    w-full px-4 py-3 pr-10
    bg-zinc-50 dark:bg-zinc-900
    border border-zinc-200 dark:border-zinc-800
    rounded-xl
    appearance-none
    focus:outline-none focus:ring-2 focus:ring-indigo-500/50
  ">
    <option>Choose option...</option>
  </select>
  <ChevronDownIcon className="
    absolute right-4 top-1/2 -translate-y-1/2
    w-5 h-5 text-zinc-400
    pointer-events-none
  "/>
</div>
```

## Navigation

### Top Navigation Bar
```tsx
<nav className="
  fixed top-0 w-full z-50
  bg-white/80 dark:bg-zinc-900/80
  backdrop-blur-xl
  border-b border-zinc-200/50 dark:border-zinc-800/50
">
  <div className="container mx-auto px-6 h-16 flex items-center justify-between">
    <Logo />
    <div className="hidden md:flex items-center gap-8">
      <NavLink>Products</NavLink>
      <NavLink>Pricing</NavLink>
      <NavLink>Docs</NavLink>
    </div>
    <div className="flex items-center gap-4">
      <Button variant="ghost">Sign in</Button>
      <Button variant="primary">Get Started</Button>
    </div>
  </div>
</nav>
```

### Sidebar Navigation
```tsx
<aside className="
  w-64 h-screen
  bg-zinc-50 dark:bg-zinc-900
  border-r border-zinc-200 dark:border-zinc-800
  p-4
">
  <nav className="space-y-1">
    <NavItem icon={HomeIcon} active>Dashboard</NavItem>
    <NavItem icon={UsersIcon}>Users</NavItem>
    <NavItem icon={SettingsIcon}>Settings</NavItem>
  </nav>
</aside>

// NavItem component
const NavItem = ({ icon: Icon, active, children }) => (
  <a className={cn(
    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
    active 
      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
  )}>
    <Icon className="w-5 h-5" />
    <span className="font-medium">{children}</span>
  </a>
)
```

## Badges & Tags

```tsx
// Status badges
const badgeVariants = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
}

<span className={cn(
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
  badgeVariants.success
)}>
  Active
</span>
```

## Skeleton Loading

```tsx
// Animated skeleton
const Skeleton = ({ className }) => (
  <div className={cn(
    "animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-lg",
    className
  )} />
)

// Usage
<div className="space-y-4">
  <Skeleton className="h-6 w-3/4" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-5/6" />
</div>
```

## Component Polish Checklist

- [ ] Consistent border-radius across all components
- [ ] Hover states on all interactive elements
- [ ] Focus states for accessibility (visible focus ring)
- [ ] Disabled states styled (opacity, cursor)
- [ ] Loading states with skeleton or spinner
- [ ] Dark mode variants using semantic colors
- [ ] Smooth transitions (150-300ms)
- [ ] Touch-friendly sizing (min 44px tap target)

## Related Skills

- [Design Tokens](design-tokens.md) — Token system for consistency
- [Tailwind Utilities](../../ui-styling/references/tailwind-utilities.md) — CSS utilities
- [shadcn Components](../../ui-styling/references/shadcn-components.md) — Component library
