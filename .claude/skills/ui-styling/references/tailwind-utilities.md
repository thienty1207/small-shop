# Tailwind CSS Utilities & Patterns

## Layout

```html
<!-- Flexbox -->
<div class="flex items-center justify-between gap-4">
<div class="flex flex-col gap-2">
<div class="inline-flex items-center gap-1">

<!-- Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
<div class="grid grid-cols-[250px_1fr] gap-4">  <!-- Sidebar layout -->
<div class="col-span-2">  <!-- Span multiple columns -->

<!-- Container -->
<div class="container mx-auto px-4 max-w-7xl">

<!-- Stack (vertical spacing) -->
<div class="space-y-4">  <!-- Gap between direct children -->
```

## Responsive Design

```html
<!-- Mobile-first breakpoints -->
<!-- sm:640px  md:768px  lg:1024px  xl:1280px  2xl:1536px -->

<!-- Stack on mobile, row on desktop -->
<div class="flex flex-col md:flex-row gap-4">

<!-- Hide on mobile, show on desktop -->
<nav class="hidden md:block">
<button class="md:hidden">Menu</button>

<!-- Responsive padding -->
<section class="px-4 py-8 md:px-8 md:py-16 lg:px-16">

<!-- Responsive typography -->
<h1 class="text-2xl md:text-4xl lg:text-6xl font-bold">
```

## Typography

```html
<h1 class="text-4xl font-bold tracking-tight text-foreground">
<h2 class="text-2xl font-semibold text-foreground">
<p class="text-base text-muted-foreground leading-relaxed">
<span class="text-sm font-medium text-primary">
<small class="text-xs text-muted-foreground">

<!-- Truncation -->
<p class="truncate">          <!-- Single line -->
<p class="line-clamp-3">      <!-- Multi-line (3 lines max) -->
```

## Colors (with shadcn/ui semantic tokens)

```html
<!-- Semantic colors (adapt to theme) -->
<div class="bg-background text-foreground">
<div class="bg-card text-card-foreground">
<div class="bg-muted text-muted-foreground">
<div class="bg-primary text-primary-foreground">
<div class="bg-secondary text-secondary-foreground">
<div class="bg-destructive text-destructive-foreground">
<div class="border-border">
<div class="ring-ring">
```

## Spacing & Sizing

```html
<!-- Common spacing patterns -->
<div class="p-4">           <!-- padding: 1rem -->
<div class="px-6 py-3">     <!-- horizontal + vertical padding -->
<div class="m-auto">         <!-- center horizontally -->
<div class="mt-8 mb-4">     <!-- margin top/bottom -->

<!-- Sizing -->
<div class="w-full max-w-md">    <!-- Full width, max 28rem -->
<div class="h-screen">            <!-- Full viewport height -->
<div class="min-h-[calc(100vh-4rem)]">  <!-- Minus header -->
<div class="size-10">             <!-- w-10 h-10 shorthand -->
```

## Effects & Transitions

```html
<!-- Shadows -->
<div class="shadow-sm hover:shadow-md transition-shadow">
<div class="shadow-lg ring-1 ring-black/5">

<!-- Rounded corners -->
<div class="rounded-lg">      <!-- 0.5rem -->
<div class="rounded-full">    <!-- Pill shape -->

<!-- Hover & Focus -->
<button class="hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring transition-colors">
<a class="hover:text-primary underline-offset-4 hover:underline">

<!-- Opacity -->
<div class="opacity-50 hover:opacity-100 transition-opacity">

<!-- Transforms -->
<div class="hover:scale-105 transition-transform duration-200">
<div class="hover:-translate-y-1 transition-transform">
```

## Dark Mode

```html
<!-- Automatic with class strategy -->
<div class="bg-white dark:bg-gray-900">
<p class="text-gray-900 dark:text-gray-100">
<div class="border-gray-200 dark:border-gray-800">

<!-- With shadcn semantic tokens (automatic, no dark: prefix needed) -->
<div class="bg-background text-foreground border-border">
<!-- ↑ These automatically switch in dark mode via CSS variables -->
```

## Useful Utilities

```html
<!-- Aspect ratio -->
<div class="aspect-video">    <!-- 16:9 -->
<div class="aspect-square">   <!-- 1:1 -->

<!-- Object fit (images) -->
<img class="object-cover w-full h-48 rounded-lg" />

<!-- Overflow -->
<div class="overflow-auto max-h-96">   <!-- Scrollable -->
<div class="overflow-hidden">           <!-- Clip -->

<!-- Cursor -->
<div class="cursor-pointer">
<div class="cursor-not-allowed opacity-50">

<!-- Selection -->
<p class="select-none">     <!-- Prevent text selection -->
<pre class="select-all">    <!-- Select all on click -->

<!-- Scroll behavior -->
<html class="scroll-smooth">
<div class="scroll-mt-16">  <!-- Scroll margin for sticky header -->
```
