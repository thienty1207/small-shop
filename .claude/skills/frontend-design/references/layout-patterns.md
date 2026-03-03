# Layout Patterns

## Hero Section Variations

### Full-Screen Hero with Background
```tsx
<section className="relative min-h-screen flex items-center justify-center overflow-hidden">
  {/* Background image/gradient */}
  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
  
  {/* Optional texture overlay */}
  <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20" />
  
  {/* Content */}
  <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
    <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-sm font-medium text-white/80 mb-6 backdrop-blur-sm border border-white/10">
      Introducing v2.0
    </span>
    <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1] mb-6">
      Build beautiful apps<br />
      <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        with confidence
      </span>
    </h1>
    <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
      The modern toolkit for building production-ready applications.
    </p>
    <div className="flex gap-4 justify-center">
      <Button size="lg" className="px-8">Get Started</Button>
      <Button size="lg" variant="outline" className="px-8 border-white/20 text-white">
        View Demo
      </Button>
    </div>
  </div>
</section>
```

### Split Hero (Text + Visual)
```tsx
<section className="min-h-[90vh] grid grid-cols-1 lg:grid-cols-2 gap-12 items-center container mx-auto px-4 py-20">
  {/* Text side */}
  <div className="space-y-6">
    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
      Now in public beta
    </div>
    <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
      The developer platform for the modern web
    </h1>
    <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
      Deploy, scale, and monitor with zero configuration.
    </p>
    <div className="flex gap-3 pt-4">
      <Button size="lg">Start Building</Button>
      <Button size="lg" variant="ghost">Learn More →</Button>
    </div>
  </div>
  
  {/* Visual side */}
  <div className="relative">
    <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 p-8">
      {/* Dashboard preview, code snippet, or product screenshot */}
    </div>
  </div>
</section>
```

## Dashboard Layout

```tsx
<div className="flex min-h-screen bg-background">
  {/* Sidebar */}
  <aside className="hidden lg:flex flex-col w-64 border-r bg-card">
    <div className="p-6">
      <Logo />
    </div>
    <nav className="flex-1 px-4 space-y-1">
      <NavLink icon={Home} href="/dashboard" active>Dashboard</NavLink>
      <NavLink icon={Users} href="/dashboard/users">Users</NavLink>
      <NavLink icon={Settings} href="/dashboard/settings">Settings</NavLink>
    </nav>
    <div className="p-4 border-t">
      <UserMenu />
    </div>
  </aside>

  {/* Main content */}
  <div className="flex-1 flex flex-col">
    {/* Top bar */}
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu />
        </Button>
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <NotificationBell />
        <Avatar />
      </div>
    </header>

    {/* Page content */}
    <main className="flex-1 p-6 overflow-auto">
      {children}
    </main>
  </div>
</div>
```

## Card Grid Patterns

### Stats Row
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <Card className="p-6">
    <p className="text-sm text-muted-foreground">Total Revenue</p>
    <p className="text-3xl font-bold mt-1">$45,231</p>
    <p className="text-xs text-green-500 mt-2">+20.1% from last month</p>
  </Card>
  {/* ... more stat cards */}
</div>
```

### Pricing Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
  {plans.map((plan) => (
    <Card key={plan.name} className={cn(
      "relative p-8",
      plan.featured && "border-primary shadow-lg scale-105"
    )}>
      {plan.featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
          Most Popular
        </span>
      )}
      <h3 className="text-lg font-semibold">{plan.name}</h3>
      <p className="text-4xl font-bold mt-4">${plan.price}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
      <ul className="mt-6 space-y-3">
        {plan.features.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" /> {f}
          </li>
        ))}
      </ul>
      <Button className="w-full mt-8" variant={plan.featured ? "default" : "outline"}>
        Get Started
      </Button>
    </Card>
  ))}
</div>
```

## Spacing Rhythm Guide

```
Page margins:    px-4 (mobile) → px-8 (tablet) → px-16 (desktop)
Section gaps:    py-16 (tight) → py-24 (normal) → py-32 (spacious)
Card padding:    p-4 (compact) → p-6 (normal) → p-8 (spacious)
Element gaps:    gap-2 (related) → gap-4 (grouped) → gap-8 (sections)
Text spacing:    space-y-2 (paragraphs) → space-y-4 (blocks) → space-y-8 (sections)
```
