# Design Analysis Framework

Structured approach to studying and learning from outstanding designs.

## The SPECS Framework

When analyzing any design, evaluate these 5 dimensions:

| Dimension | Key Questions |
|-----------|---------------|
| **S**pace | How is whitespace used? What's the rhythm? |
| **P**alette | What colors? How many? What's the relationship? |
| **E**lements | What UI components? How are they styled? |
| **C**opy | What's the tone? How much text? What hierarchy? |
| **S**ystem | What patterns repeat? What's the grid? |

## Space Analysis

### Questions to Ask
- What's the margin system? (8px? 16px? custom?)
- How much breathing room around key elements?
- Is spacing generous or tight?
- Where does density increase/decrease?

### Measurement Technique
```
1. Screenshot the design
2. Open in Figma or design tool
3. Use ruler/measurement tool
4. Note recurring values

Common findings:
- Base unit: 4px or 8px
- Section padding: 64-128px
- Element gaps: 16-32px
- Page margins: 5-10% of viewport
```

### Space Patterns

| Pattern | Effect | Example |
|---------|--------|---------|
| Generous | Premium, breathable | Apple, Stripe |
| Tight | Informational, dense | GitHub, AWS Console |
| Asymmetric | Dynamic, editorial | Spotify, Airbnb |
| Rhythmic | Organized, scannable | Linear, Notion |

## Palette Analysis

### Color Extraction Process
```
1. Use browser DevTools or Figma
2. Identify all unique colors
3. Categorize by role:
   - Primary brand colors
   - Semantic (success, error, warning)
   - Neutrals (grays, backgrounds)
   - Accents (highlights, CTAs)
```

### Color Relationship Map
```
Primary:    ████████████  #3B82F6 (Blue)
                ↓
Secondary:  ████████████  #1E40AF (Darker blue)
                ↓
Accent:     ████████████  #F59E0B (Orange - complement)
                ↓
Neutrals:   ░░░░░░░░░░░░  #F8FAFC → #0F172A (Gray scale)
```

### What to Note
- How many colors total? (Usually 3-5 primary + neutrals)
- What's the dominant color coverage?
- How is color used for hierarchy?
- Dark mode: inverted or redesigned palette?

## Element Analysis

### Component Inventory
```markdown
Buttons:
- [ ] What border-radius? (0, 4px, 8px, full?)
- [ ] How many variants? (primary, secondary, ghost?)
- [ ] What's the hover state?
- [ ] Shadow or no shadow?

Cards:
- [ ] Border or shadow? Both?
- [ ] Background color vs page background?
- [ ] Internal padding?
- [ ] Header/body/footer structure?

Inputs:
- [ ] Border style (solid, bottom-only, none?)
- [ ] Focus state (ring, border color, glow?)
- [ ] Label position (top, inline, floating?)

Navigation:
- [ ] Fixed or scroll?
- [ ] Background treatment (solid, blur, transparent?)
- [ ] Mobile menu style?
```

### Micro-detail Checklist
```markdown
Shadows:
- [ ] Direction (centered vs directional?)
- [ ] Blur amount
- [ ] Spread
- [ ] Color (gray vs colored?)

Borders:
- [ ] Color (solid vs semi-transparent?)
- [ ] Width (1px everywhere?)
- [ ] Radius consistency

Icons:
- [ ] Line weight (1px, 1.5px, 2px?)
- [ ] Size relative to text
- [ ] Filled vs outlined

Hover/Focus:
- [ ] Color change?
- [ ] Scale transform?
- [ ] Background shift?
- [ ] Shadow addition?
```

## Copy Analysis

### Hierarchy Mapping
```
Level 1: Hero headline
         ↳ Size: 48-64px, Weight: Bold/Black

Level 2: Section titles  
         ↳ Size: 32-40px, Weight: SemiBold

Level 3: Card/feature headings
         ↳ Size: 20-24px, Weight: Medium/SemiBold

Level 4: Body text
         ↳ Size: 16-18px, Weight: Regular

Level 5: Captions, labels
         ↳ Size: 12-14px, Weight: Regular/Medium
```

### Tone Assessment
| Tone | Indicators | Brands |
|------|------------|--------|
| Professional | Formal language, third person | Stripe, Linear |
| Friendly | Casual, contractions, "you" | Slack, Notion |
| Playful | Emojis, puns, exclamations | Discord, Figma |
| Minimal | Short sentences, few words | Apple, Vercel |
| Technical | Jargon, precise terms | GitHub, AWS |

## System Analysis

### Grid Detection
```
1. Look for alignment points
2. Count columns (usually 12 or 16)
3. Measure gutter width
4. Check if responsive or fixed

Common systems:
- 12-column + 24px gutter (most common)
- 16-column + 16px gutter (dense UIs)
- Content-width constraint (680px-1200px)
```

### Pattern Recognition
```markdown
Repeated patterns to identify:
- [ ] Card layouts (2-col, 3-col, masonry?)
- [ ] List items (spacing, separators)
- [ ] Section structure (padding, backgrounds)
- [ ] Image treatment (aspect ratios, corners)
- [ ] Animation timing (duration, easing)
```

## Analysis Template

```markdown
# Design Analysis: [Name/URL]

## First Impression
One sentence on the overall feeling/quality.

## SPECS Breakdown

### Space
- Base unit: 
- Section padding:
- Element gaps:
- Density: [sparse/medium/dense]

### Palette
- Primary: #____
- Secondary: #____
- Accent: #____
- Neutrals: #____ to #____
- Total colors: 

### Elements
- Border radius: 
- Shadow style:
- Button style:
- Card style:
- Icon style:

### Copy
- Hierarchy levels:
- Tone: [professional/friendly/playful/minimal]
- Font pairing:

### System
- Grid: 
- Responsive breakpoints:
- Recurring patterns:

## Key Takeaways
1. What works exceptionally well?
2. What's the signature element?
3. What can I apply to my project?

## Screenshots
[Include annotated screenshots]
```

## Practice Exercise

Analyze 3 designs this week:
1. A design you admire (understand why it works)
2. A competitor's design (understand the market)
3. A design you dislike (understand what to avoid)

## Related Skills

- [Color Theory](color-theory.md) — Deeper color analysis
- [Typography Deep Dive](typography-deep-dive.md) — Font analysis
- [Polish Checklist](polish-checklist.md) — Quality benchmarks
