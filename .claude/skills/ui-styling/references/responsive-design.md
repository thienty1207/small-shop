# Responsive Design Patterns

Mobile-first responsive design with Tailwind CSS.

## Breakpoint System

### Tailwind Default Breakpoints
| Prefix | Min Width | Target |
|--------|-----------|--------|
| (none) | 0px | Mobile (base) |
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Mobile-First Approach
```html
<!-- Always start with mobile styles, then add breakpoints -->
<div class="
  flex flex-col          /* Mobile: stack */
  md:flex-row            /* Tablet+: side by side */
  lg:flex-row-reverse    /* Desktop: reversed */
">
```

## Common Responsive Patterns

### Navigation
```tsx
// Mobile: hamburger, Desktop: horizontal nav
<nav className="flex items-center justify-between p-4">
  <Logo />
  
  {/* Desktop nav */}
  <div className="hidden md:flex items-center gap-6">
    <NavLink>Products</NavLink>
    <NavLink>Pricing</NavLink>
    <NavLink>About</NavLink>
    <Button>Sign In</Button>
  </div>
  
  {/* Mobile menu button */}
  <button className="md:hidden p-2">
    <MenuIcon className="w-6 h-6" />
  </button>
</nav>

// Mobile slide-out menu
<div className={cn(
  "fixed inset-0 z-50 md:hidden",
  isOpen ? "block" : "hidden"
)}>
  <div className="fixed inset-0 bg-black/50" onClick={close} />
  <div className="fixed top-0 right-0 w-64 h-full bg-white p-6">
    <NavLink>Products</NavLink>
    <NavLink>Pricing</NavLink>
  </div>
</div>
```

### Grid Layouts
```html
<!-- 1 col → 2 col → 3 col → 4 col -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <Card />
  <Card />
  <Card />
  <Card />
</div>

<!-- Feature section: stack → side by side -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
  <div>Content</div>
  <div>Image</div>
</div>
```

### Hero Sections
```html
<section class="
  py-12 md:py-20 lg:py-32      /* Responsive vertical padding */
  px-4 md:px-6 lg:px-8          /* Responsive horizontal padding */
">
  <div class="max-w-7xl mx-auto">
    <h1 class="
      text-3xl md:text-4xl lg:text-5xl xl:text-6xl  /* Scaled heading */
      font-bold
    ">
      Hero Title
    </h1>
    <p class="
      mt-4 md:mt-6
      text-lg md:text-xl          /* Scaled body */
      max-w-2xl                    /* Constrain width */
    ">
      Description text
    </p>
    <div class="
      mt-8 md:mt-10
      flex flex-col sm:flex-row   /* Stack → row */
      gap-4
    ">
      <Button size="lg">Primary CTA</Button>
      <Button variant="outline" size="lg">Secondary</Button>
    </div>
  </div>
</section>
```

### Sidebar Layouts
```html
<!-- Dashboard: mobile stack, desktop sidebar -->
<div class="min-h-screen flex flex-col lg:flex-row">
  {/* Sidebar */}
  <aside class="
    w-full lg:w-64 lg:fixed lg:inset-y-0
    bg-zinc-900 text-white
  ">
    <nav>...</nav>
  </aside>
  
  {/* Main content */}
  <main class="flex-1 lg:ml-64 p-4 lg:p-8">
    {/* Content */}
  </main>
</div>
```

## Typography Scaling

### Responsive Type Scale
```html
<!-- Heading hierarchy -->
<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
  Page Title
</h1>

<h2 class="text-xl sm:text-2xl md:text-3xl font-semibold">
  Section Title
</h2>

<h3 class="text-lg sm:text-xl md:text-2xl font-medium">
  Subsection
</h3>

<!-- Body text -->
<p class="text-base md:text-lg">
  Body content
</p>
```

### Fluid Typography with Clamp
```css
/* In CSS/Tailwind v4 */
@theme {
  --text-fluid-xl: clamp(1.5rem, 4vw, 3rem);
  --text-fluid-lg: clamp(1.25rem, 3vw, 2rem);
  --text-fluid-base: clamp(1rem, 2vw, 1.25rem);
}
```

```html
<h1 class="text-[clamp(1.5rem,5vw,4rem)]">
  Fluid heading
</h1>
```

## Spacing Patterns

### Responsive Padding/Margins
```html
<!-- Section spacing -->
<section class="py-12 md:py-16 lg:py-24">
  
<!-- Container padding -->
<div class="px-4 sm:px-6 lg:px-8">

<!-- Gap scaling -->
<div class="grid gap-4 md:gap-6 lg:gap-8">
```

### Container Widths
```html
<!-- Centered container with max-width -->
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  Content
</div>

<!-- Prose width for reading -->
<article class="max-w-prose mx-auto px-4">
  Long form content
</article>
```

## Hiding/Showing Elements

### Visibility by Breakpoint
```html
<!-- Show only on mobile -->
<div class="block md:hidden">Mobile only</div>

<!-- Show only on tablet+ -->
<div class="hidden md:block">Tablet and larger</div>

<!-- Show only on desktop -->
<div class="hidden lg:block">Desktop only</div>

<!-- Hide only on tablet -->
<div class="md:hidden lg:block">Not tablet</div>
```

## Images & Media

### Responsive Images
```tsx
// Next.js Image with responsive behavior
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1920}
  height={1080}
  className="w-full h-auto object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority
/>

// Tailwind aspect ratio
<div class="aspect-video md:aspect-square lg:aspect-[4/3]">
  <img class="w-full h-full object-cover" />
</div>
```

### Background Images
```html
<div class="
  bg-[url('/mobile-bg.jpg')] 
  md:bg-[url('/desktop-bg.jpg')]
  bg-cover bg-center
">
```

## Tables

### Responsive Table Patterns
```tsx
// Horizontal scroll on mobile
<div className="overflow-x-auto">
  <table className="w-full min-w-[600px]">
    ...
  </table>
</div>

// Card layout on mobile, table on desktop
<div className="hidden md:block">
  <table>...</table>
</div>
<div className="md:hidden space-y-4">
  {data.map(item => <Card key={item.id} {...item} />)}
</div>
```

## Testing Checklist

```markdown
Breakpoints to test:
- [ ] 320px (small mobile)
- [ ] 375px (iPhone)
- [ ] 414px (large phone)
- [ ] 768px (tablet portrait)
- [ ] 1024px (tablet landscape / laptop)
- [ ] 1280px (desktop)
- [ ] 1536px (large desktop)

Check for:
- [ ] No horizontal scroll on mobile
- [ ] Touch targets minimum 44x44px
- [ ] Text readable without zooming
- [ ] Forms usable on mobile
- [ ] Images scale correctly
- [ ] Navigation accessible
```

## Device-Specific Considerations

### Touch vs Mouse
```html
<!-- Larger touch targets on mobile -->
<button class="p-2 md:p-3 min-h-[44px]">
  Click me
</button>

<!-- Hover only on devices that support it -->
<a class="hover:underline md:hover:text-blue-600">
  Hover on desktop
</a>
```

### Safe Areas (Notch, etc.)
```css
/* Handle iPhone notch */
.full-width {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Or in Tailwind */
@theme {
  --spacing-safe-left: env(safe-area-inset-left);
  --spacing-safe-right: env(safe-area-inset-right);
}
```

## Related Skills

- [Tailwind Utilities](tailwind-utilities.md) — Utility classes
- [Layout Patterns](../../frontend-design/references/layout-patterns.md) — Layout structures
- [Component Styling](../../frontend-design/references/component-styling.md) — Component patterns
