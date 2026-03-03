---
name: ui-styling
description: Create beautiful, accessible UIs with shadcn/ui (Radix + Tailwind), Tailwind CSS v4, theming, dark mode, responsive design, canvas design system. Use for building UI components, implementing design systems, styling, responsive layouts, dark mode, and accessibility.
license: MIT
---

# UI Styling Mastery

Build beautiful, accessible interfaces with shadcn/ui components and Tailwind CSS v4.

## Core Stack

| Layer | Tool | Role |
|-------|------|------|
| Components | shadcn/ui (Radix primitives) | Accessible, composable UI components |
| Styling | Tailwind CSS v4 | Utility-first CSS, zero runtime overhead |
| Theming | CSS Variables + next-themes | Dark mode, custom palettes |
| Icons | Lucide React | Consistent icon system |

## Quick Start

```bash
# Initialize shadcn/ui + Tailwind
npx shadcn@latest init

# Add components
npx shadcn@latest add button card dialog form input table

# Use in code
import { Button } from "@/components/ui/button"
<Button variant="default" size="lg">Click me</Button>
```

## Reference Navigation

- **[Component Catalog](references/shadcn-components.md)** — All shadcn/ui components with usage patterns
- **[Theming & Dark Mode](references/theming-darkmode.md)** — CSS variables, color palettes, next-themes, custom themes
- **[Tailwind Utilities](references/tailwind-utilities.md)** — Layout, spacing, typography, colors, responsive
- **[Tailwind v4 Features](references/tailwind-v4.md)** — @theme directive, CSS-first config, container queries
- **[Accessibility Patterns](references/accessibility-patterns.md)** — ARIA, keyboard nav, focus management, screen readers
- **[Responsive Design](references/responsive-design.md)** — Mobile-first, breakpoints, adaptive layouts

## Key Patterns

### Form with Validation
```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

export function LoginForm() {
  const form = useForm({ resolver: zodResolver(schema) })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(console.log)} className="space-y-6">
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input type="email" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full">Sign In</Button>
      </form>
    </Form>
  )
}
```

### Responsive Layout with Dark Mode
```tsx
<div className="min-h-screen bg-background text-foreground">
  <div className="container mx-auto px-4 py-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold">Content</h3>
        </CardContent>
      </Card>
    </div>
  </div>
</div>
```

## Best Practices

1. **Utility-First**: Use Tailwind classes directly, extract components only for true repetition
2. **Mobile-First**: Start with mobile styles, layer `md:`, `lg:` variants
3. **Accessibility-First**: Use Radix primitives, add focus-visible states
4. **CSS Variables**: Use `--variable` for consistent theming
5. **Dark Mode**: Apply `dark:` variants, use semantic color names (`bg-background`)
6. **Performance**: Automatic CSS purging, avoid dynamic class names

## Related Skills

| Skill | When to Use |
|-------|-------------|
| [frontend-design](../frontend-design/SKILL.md) | Design tokens, typography, spacing systems |
| [nextjs-turborepo](../nextjs-turborepo/SKILL.md) | Next.js styling integration |
| [ui-polish](../ui-polish/SKILL.md) | Visual refinement, polish checklist |
