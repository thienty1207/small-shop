---
name: frontend-design
description: Distinctive frontend interface design — bold aesthetic direction, custom design systems, typography mastery, color theory, motion design, spatial composition, anti-generic patterns. Use when designing UIs, creating visual identity, establishing design direction, or elevating interface aesthetics beyond generic templates.
license: MIT
---

# Frontend Design — Anti-Generic UI

Create interfaces that are **distinctive, memorable, and intentional**. Fight against the sea of identical AI-generated UIs.

## Core Philosophy

> Every pixel is a decision. Generic is the enemy of great.

Most AI-generated UIs look the same: same rounded corners, same gradient buttons, same card layouts. This skill teaches you to break free.

## The 5 Design Pillars

### 1. Typography as Architecture
```
Typography is 80% of web design. Master it.

- Choose 2 fonts maximum: 1 display + 1 body
- Create a modular scale: 12, 14, 16, 20, 24, 32, 40, 48, 64px
- Use weight contrast, not just size, for hierarchy
- Letter-spacing: tighter for headings, normal for body
- Line-height: 1.1-1.2 for headings, 1.5-1.7 for body
```

**Font Pairing Examples:**
| Display | Body | Vibe |
|---------|------|------|
| Space Grotesk | Inter | Tech, modern |
| Playfair Display | Source Sans 3 | Editorial, elegant |
| Clash Display | Satoshi | Bold, contemporary |
| Fraunces | Work Sans | Warm, approachable |
| JetBrains Mono | IBM Plex Sans | Developer, precise |

### 2. Color as Emotion
```
Avoid generic: blue hero, white body, gray footer.
Instead, build a palette that tells a story.
```

**Palette Building Process:**
1. Start with ONE signature color (not primary blue!)
2. Build 5-shade scale: lightest → darkest
3. Add 1 accent color (complementary or analogous)
4. Define semantic colors: success, warning, error, info
5. Create dark mode variants (don't just invert!)

**Color Relationships:**
| Type | Method | Example |
|------|--------|---------|
| Monochromatic | Shades of one hue | Deep navy → light sky |
| Complementary | Opposite on wheel | Teal + coral |
| Analogous | Adjacent hues | Purple → blue → teal |
| Split Complementary | Main + 2 adjacents of complement | Yellow + blue-purple + red-purple |

### 3. Motion as Communication
```
Animation should communicate, not decorate.

Purposeful motion:                 Decorative motion:
✅ Show state change                ❌ Spinning logos
✅ Guide attention                  ❌ Parallax everything
✅ Provide feedback                 ❌ Bouncing elements
✅ Establish spatial relationships   ❌ Auto-playing carousels
```

**Timing Guidelines:**
| Interaction | Duration |
|-------------|----------|
| Button feedback | 100-150ms |
| Menu open/close | 150-250ms |
| Page transition | 200-400ms |
| Complex animation | 300-500ms |
| Attention-grab | 600-1000ms |

**Easing:**
- `ease-out` for entering elements (fast start, slow end)
- `ease-in` for exiting elements (slow start, fast end)
- `ease-in-out` for elements that stay on screen
- Never use `linear` (feels robotic)

### 4. Spatial Composition
```
Whitespace is not empty space — it's breathing room.

Rules:
- Related items: 8-16px gap
- Sections: 48-96px gap
- Page margins: 5-10% of viewport
- Asymmetry > symmetry for visual interest
- Grid systems: 4px or 8px base unit
```

**Layout Principles:**
- **Rhythm:** Consistent vertical spacing creates visual flow
- **Hierarchy:** Size + weight + color + space = importance
- **Alignment:** Invisible lines connect related elements
- **Contrast:** Light vs dark, large vs small, dense vs sparse

### 5. Detail Obsession
```
The difference between good and great is in the details:
- Border radius: consistent across the entire UI (pick one: 4px, 8px, 12px)
- Shadows: subtle, directional, with color tinting
- Borders: 1px with low-opacity dark color, not solid gray
- Icons: stroke width matches font weight
- Hover states: every interactive element has one
- Focus states: visible, accessible, styled (not default blue outline)
```

## Reference Navigation

- **[Design Tokens](references/design-tokens.md)** — Building a complete token system (spacing, color, type, motion)
- **[Layout Patterns](references/layout-patterns.md)** — Hero sections, dashboards, landing pages, editorial layouts
- **[Component Styling](references/component-styling.md)** — Buttons, cards, inputs, navigation with personality
- **[Design Inspiration](references/design-inspiration.md)** — Reference sites, award galleries, trend analysis

## Anti-Generic Checklist

Before shipping any interface, ask:

- [ ] **Is the typography intentional?** (Not just default Inter at default sizes)
- [ ] **Are the colors unique?** (Not generic Bootstrap blue/green/red)
- [ ] **Does the layout have rhythm?** (Consistent spacing, clear hierarchy)
- [ ] **Are animations purposeful?** (Not decorative, they communicate something)
- [ ] **Would this look like "my brand"?** (Distinct from competitors)
- [ ] **Is there attention to micro-details?** (Shadows, borders, hover states)
- [ ] **Does it have an opinion?** (Not trying to be everything to everyone)

## Related Skills

| Skill | When to Use |
|-------|-------------|
| [ui-styling](../ui-styling/SKILL.md) | Tailwind CSS implementation, shadcn/ui |
| [ui-polish](../ui-polish/SKILL.md) | Visual refinement process, inspiration capture |
| [nextjs-turborepo](../nextjs-turborepo/SKILL.md) | Next.js layout and routing |
