# Mobile Performance for Dioxus

> Performance optimization for Dioxus mobile apps: 60fps animations, memory management, and battery optimization.
> **This is where Rust's ownership model gives us an advantage.**

---

## The Mobile Performance Mindset

### Why Mobile Performance is Different

```
DESKTOP:                          MOBILE:
├── Unlimited power               ├── Battery matters
├── Abundant RAM                  ├── RAM is shared, limited
├── Stable network                ├── Network is unreliable
├── CPU always available          ├── CPU throttles when hot
└── User expects fast             └── User expects INSTANT
```

### Performance Budget

```
Every frame must complete in:
├── 60fps → 16.67ms per frame
├── 120fps (ProMotion) → 8.33ms per frame

If your code takes longer:
├── Frame drops → Janky UI
├── User perceives as "slow"
└── They WILL uninstall your app
```

---

## Rust Performance Advantages

### 1. Zero-Cost Abstractions

```rust
// Rust's ownership eliminates runtime overhead
fn process_items(items: Vec<Item>) -> Vec<ProcessedItem> {
    items
        .into_iter()  // No copy, ownership transferred
        .map(|item| process(item))  // Inline, zero overhead
        .collect()  // Single allocation
}

// Compare to JavaScript/Dart:
// - GC pauses
// - Runtime type checks
// - Unclear ownership (defensive copies)
```

### 2. Compile-Time Guarantees

```rust
// Data races caught at compile time
struct AppState {
    data: Vec<Item>,
}

// ❌ Won't compile: multiple mutable borrows
fn bad_update(state: &mut AppState) {
    let ref1 = &mut state.data;
    let ref2 = &mut state.data;  // ERROR!
}

// ✅ Correct: single mutable borrow
fn good_update(state: &mut AppState) {
    state.data.push(new_item());
}
```

---

## Dioxus-Specific Optimizations

### 1. Memoization with `use_memo`

```rust
use dioxus::prelude::*;

#[component]
fn ExpensiveList(cx: Scope, items: Vec<Item>) -> Element {
    // ❌ WRONG: Recalculates every render
    let filtered = items.iter()
        .filter(|i| i.is_active)
        .collect::<Vec<_>>();
    
    // ✅ CORRECT: Only recalculates when items change
    let filtered = use_memo(cx, (items,), |(items,)| {
        items.iter()
            .filter(|i| i.is_active)
            .collect::<Vec<_>>()
    });
    
    cx.render(rsx! {
        ul {
            filtered.iter().map(|item| rsx! {
                li { "{item.name}" }
            })
        }
    })
}
```

### 2. Avoid Unnecessary Re-renders

```rust
// ❌ WRONG: Component re-renders on any parent change
#[component]
fn ListItem(cx: Scope, item: Item) -> Element {
    cx.render(rsx! {
        div { "{item.name}" }
    })
}

// ✅ CORRECT: Use component props optimization
#[component]
fn ListItem<'a>(
    cx: Scope,
    item: &'a Item,
) -> Element {
    cx.render(rsx! {
        div { "{item.name}" }
    })
}

// Even better: use memo for sub-components
#[component]
fn List(cx: Scope, items: Vec<Item>) -> Element {
    cx.render(rsx! {
        ul {
            items.iter().map(|item| {
                // Only this item re-renders when it changes
                rsx! { ListItem { item: item } }
            })
        }
    })
}
```

### 3. Lazy List Rendering

```rust
use dioxus::prelude::*;

#[component]
fn VirtualizedList(cx: Scope, items: Vec<Item>) -> Element {
    let visible_range = use_state(cx, || 0..20);
    
    // Only render visible items
    let visible_items = &items[visible_range.start..visible_range.end];
    
    cx.render(rsx! {
        div {
            onscroll: move |evt| {
                // Update visible range on scroll
                let new_range = calculate_visible_range(evt.scroll_top);
                visible_range.set(new_range);
            },
            
            visible_items.iter().map(|item| rsx! {
                ListItem { item: item }
            })
        }
    })
}
```

---

## Memory Management

### Rust's Ownership = Automatic Optimization

```rust
// Rust automatically frees memory when owner goes out of scope
fn process_large_data() {
    let large_vec = vec![0; 1_000_000];  // 1M items allocated
    // ... use large_vec
}  // large_vec dropped here, memory freed IMMEDIATELY

// No GC pauses, no manual cleanup needed!
```

### Image Memory Optimization

```rust
use image::DynamicImage;

// ❌ WRONG: Load full-resolution image
fn load_image_bad(path: &str) -> DynamicImage {
    image::open(path).unwrap()  // Could be 4K!
}

// ✅ CORRECT: Resize to display size
fn load_image_good(path: &str, target_width: u32) -> DynamicImage {
    let img = image::open(path).unwrap();
    img.resize(target_width, target_width, image::imageops::FilterType::Lanczos3)
}

// Memory calculation:
// 4K image = 3840 × 2160 × 4 bytes = 33.2 MB
// 200px image = 200 × 200 × 4 bytes = 160 KB
// Savings: 99.5%!
```

### Avoid Clones When Possible

```rust
// ❌ Expensive: Clones entire vector
fn bad_filter(items: Vec<Item>) -> Vec<Item> {
    items.clone()  // Unnecessary allocation
        .into_iter()
        .filter(|i| i.active)
        .collect()
}

// ✅ Efficient: Consumes original, no clone
fn good_filter(items: Vec<Item>) -> Vec<Item> {
    items  // Ownership transferred
        .into_iter()
        .filter(|i| i.active)
        .collect()
}

// ✅ When you need to keep original: use references
fn good_filter_keep_original(items: &[Item]) -> Vec<&Item> {
    items.iter()  // No allocation
        .filter(|i| i.active)
        .collect()  // Only collect references
}
```

---

## Animation Performance

### 60fps Imperative

```
Human eye detects:
├── < 24 fps → "Slideshow" (broken)
├── 30-45 fps → "Noticeably not smooth"
├── 60 fps → "Smooth" (target)
└── 120 fps → "Premium" (ProMotion)

NEVER ship < 60fps animations.
```

### GPU-Accelerated Animations

```
GPU-ACCELERATED (FAST):          CPU-BOUND (SLOW):
├── transform: translate          ├── width, height
├── transform: scale              ├── top, left, right, bottom
├── transform: rotate             ├── margin, padding
├── opacity                       └── border-radius (animated)

RULE: Only animate transform and opacity.
```

### Animation in Dioxus

```rust
use dioxus::prelude::*;

#[component]
fn AnimatedButton(cx: Scope) -> Element {
    let pressed = use_state(cx, || false);
    
    cx.render(rsx! {
        button {
            // ✅ GOOD: Animate transform (GPU)
            style: "transform: scale({if pressed { 0.95 } else { 1.0 }}); 
                    transition: transform 0.1s ease-out;",
            
            onmousedown: move |_| pressed.set(true),
            onmouseup: move |_| pressed.set(false),
            
            "Press Me"
        }
    })
}
```

---

## Battery Optimization

### Battery Drain Sources

| Source | Impact | Mitigation |
|--------|--------|------------|
| **Screen on** | 🔴 Highest | Dark mode on OLED |
| **GPS continuous** | 🔴 Very high | Use significant change |
| **Network requests** | 🟡 High | Batch, cache aggressively |
| **Animations** | 🟡 Medium | Reduce when low battery |
| **Background work** | 🟡 Medium | Defer non-critical |
| **CPU computation** | 🟢 Lower | Offload to backend |

### OLED Dark Mode Savings

```rust
// True black (#000000) = Maximum savings on OLED
const DARK_BG: &str = "#000000";  // Not #1a1a1a!

#[cfg(target_os = "ios")]
fn supports_oled() -> bool {
    // Check for OLED devices (iPhone X and later)
    device_has_oled()
}

#[component]
fn DarkModeApp(cx: Scope) -> Element {
    let dark_mode = use_dark_mode(cx);
    
    cx.render(rsx! {
        div {
            style: "background-color: {if dark_mode { DARK_BG } else { \"#FFFFFF\" }}",
            // Content
        }
    })
}
```

---

## Performance Testing

### What to Test

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Frame rate** | ≥ 60fps | Performance tools |
| **Memory** | Stable | Memory profiler |
| **Cold start** | < 2s | Manual timing |
| **List scroll** | No jank | Manual feel |

### Test on Real Devices

```
⚠️ NEVER trust only:
├── Simulator/emulator (faster than real)
├── Debug mode (slower than release)
└── High-end devices only

✅ ALWAYS test on:
├── Low-end Android (< $200 phone)
├── Older iOS device (iPhone 8 or SE)
├── Release build (--release)
└── With real data (not 10 items)
```

### Build for Release

```bash
# Debug build (slow, for development)
cargo mobile build

# Release build (ALWAYS test this!)
cargo mobile build --release

# Profile build (for performance testing)
cargo mobile build --profile release-with-debug
```

---

## Performance Checklist

**Before Every Component:**
- [ ] Unnecessary re-renders prevented
- [ ] Memoization used for expensive computations
- [ ] Props passed by reference when possible
- [ ] No clones in hot paths

**Before Every List:**
- [ ] Virtualization/lazy rendering implemented
- [ ] Images resized to display size
- [ ] No blocking operations in render

**Before Every Animation:**
- [ ] Only animating transform/opacity
- [ ] Runs at 60fps on low-end device
- [ ] No layout recalculations

**Before Release:**
- [ ] Tested in release mode
- [ ] Memory usage stable over time
- [ ] Tested on low-end devices
- [ ] Battery drain acceptable

---

> **Remember:** Rust gives you performance by default, but you can still write slow code. Use ownership wisely, avoid unnecessary clones, and always test on real devices.
