---
name: mobile-dioxus
description: Production-ready mobile development with Dioxus framework for iOS and Android. Master cross-platform UI, touch interactions, native integrations, performance optimization, and app store deployment. Use when building Rust-based mobile applications with Dioxus.
license: MIT
---

# Dioxus Mobile Development

Production-ready patterns for building cross-platform mobile applications with Dioxus and Rust.

## When to Use This Skill

- Building native mobile apps with Dioxus
- Creating cross-platform iOS/Android applications in Rust
- Implementing mobile UI/UX patterns
- Optimizing mobile performance (60fps, battery, memory)
- Integrating with platform-specific features
- Testing mobile applications
- Deploying to App Store and Google Play

---

## Quick Start

### Minimal Dioxus Mobile App

```rust
use dioxus::prelude::*;

fn main() {
    dioxus_mobile::launch(app);
}

fn app(cx: Scope) -> Element {
    let mut count = use_state(cx, || 0);

    cx.render(rsx! {
        div {
            h1 { "Counter: {count}" }
            button {
                onclick: move |_| count += 1,
                "Increment"
            }
        }
    })
}
```

### Essential Dependencies (Cargo.toml)

```toml
[dependencies]
dioxus = { version = "0.6", features = ["mobile"] }
dioxus-mobile = "0.6"

[target.'cfg(target_os = "ios")'.dependencies]
objc = "0.2"

[target.'cfg(target_os = "android")'.dependencies]
jni = "0.21"
ndk = "0.8"
```

---

## Reference Navigation

### Getting Started
| Topic | File | Description |
|-------|------|-------------|
| Dioxus Setup | [dioxus-setup.md](references/dioxus-setup.md) | Project initialization, tooling |
| Platform Specifics | [platform-specifics.md](references/platform-specifics.md) | iOS vs Android differences |

### Mobile UI/UX
| Topic | File | Description |
|-------|------|-------------|
| Navigation | [mobile-navigation.md](references/mobile-navigation.md) | Tab bars, stacks, deep linking |
| UI Components | [mobile-ui-components.md](references/mobile-ui-components.md) | Dioxus component library |
| Touch Interactions | [touch-interactions.md](references/touch-interactions.md) | Gestures, haptics, animations |
| Design Thinking | [mobile-design-thinking.md](references/mobile-design-thinking.md) | Mobile-first UX principles |

### Performance & Quality
| Topic | File | Description |
|-------|------|-------------|
| Performance | [mobile-performance.md](references/mobile-performance.md) | 60fps, memory, battery optimization |
| Testing | [mobile-testing.md](references/mobile-testing.md) | Unit, integration, UI testing |

### Production
| Topic | File | Description |
|-------|------|-------------|
| Deployment | [mobile-deployment.md](references/mobile-deployment.md) | App Store, Play Store release |
| Offline Patterns | [offline-patterns.md](references/offline-patterns.md) | Data sync, caching strategies |

---

## Decision Guide

### When to Choose Dioxus for Mobile

```
✅ Choose Dioxus when:
- You want to write mobile apps in Rust
- Cross-platform iOS/Android from single codebase
- Need memory safety and performance of Rust
- Want to share code with web frontend (Dioxus web)
- Team already knows Rust

⚠️ Consider Alternatives when:
- Need maximum native UI fidelity → SwiftUI/Jetpack Compose
- Rapid prototyping with large ecosystem → Flutter/React Native
- Non-technical team → No-code tools
```

### Dioxus vs Other Frameworks

```
Dioxus:
├── Language: Rust (memory safe, performant)
├── Paradigm: Declarative UI with RSX
├── Platforms: iOS, Android, Web, Desktop
├── Maturity: Growing (0.6 as of 2025)
└── Best for: Rust developers, performance-critical apps

Flutter:
├── Language: Dart
├── Paradigm: Declarative UI with widgets
├── Platforms: iOS, Android, Web, Desktop
├── Maturity: Mature (production-ready)
└── Best for: Fast development, rich UI

React Native:
├── Language: JavaScript/TypeScript
├── Paradigm: Declarative UI with components
├── Platforms: iOS, Android
├── Maturity: Mature (production-ready)
└── Best for: Web developers, large ecosystem
```

---

## Core Patterns Summary

### Component Pattern

```rust
use dioxus::prelude::*;

#[component]
fn UserCard(cx: Scope, name: String, avatar_url: String) -> Element {
    cx.render(rsx! {
        div {
            class: "user-card",
            img { src: "{avatar_url}", alt: "{name}" }
            h3 { "{name}" }
        }
    })
}

// Usage
rsx! {
    UserCard {
        name: "Alice".to_string(),
        avatar_url: "https://example.com/avatar.jpg".to_string()
    }
}
```

### State Management

```rust
fn app(cx: Scope) -> Element {
    // Local state
    let mut count = use_state(cx, || 0);
    
    // Shared state (with use_shared_state)
    use_shared_state_provider(cx, || AppState::default());
    let app_state = use_shared_state::<AppState>(cx).unwrap();
    
    cx.render(rsx! {
        button {
            onclick: move |_| count += 1,
            "Count: {count}"
        }
    })
}
```

### Platform Integration

```rust
#[cfg(target_os = "ios")]
fn request_camera_permission() {
    // iOS-specific permission request
    use objc::*;
    // ... iOS permission code
}

#[cfg(target_os = "android")]
fn request_camera_permission() {
    // Android-specific permission request
    use jni::*;
    // ... Android permission code
}
```

---

## Best Practices Checklist

### UI/UX
- [ ] Touch targets ≥ 44pt (iOS) / 48dp (Android)
- [ ] Navigation follows platform conventions
- [ ] Loading states for async operations
- [ ] Offline-first data architecture

### Performance
- [ ] Animations run at 60fps
- [ ] Images sized appropriately for display
- [ ] Lists use virtualization (if \u003e100 items)
- [ ] No unnecessary re-renders

### Platform Integration
- [ ] Permissions requested before use
- [ ] Platform-specific UI where needed (iOS vs Android)
- [ ] Deep linking configured
- [ ] Push notifications set up

### Testing
- [ ] Unit tests for business logic
- [ ] Integration tests for critical flows
- [ ] UI tests on simulators/devices
- [ ] Tested on both iOS and Android

### Production
- [ ] App icons for all sizes
- [ ] Error tracking (Sentry, etc.)
- [ ] Analytics integration
- [ ] Release build optimized

---

## Examples

- **[dioxus-mobile-starter](examples/dioxus-mobile-starter/)** - Minimal project template

---

## Resources

- **Dioxus**: https://dioxuslabs.com
- **Dioxus Mobile**: https://github.com/DioxusLabs/dioxus/tree/master/packages/mobile
- **cargo-mobile2**: https://github.com/tauri-apps/cargo-mobile2
- **Rust Mobile**: https://github.com/rust-mobile

---

## Related Skills

- [rust-backend-advance](../rust-backend-advance/SKILL.md) - Backend API for mobile apps
- [databases](../databases/SKILL.md) - Local storage (SQLite)
- [authentication](../authentication/SKILL.md) - Mobile auth patterns
- [testing](../testing/SKILL.md) - Testing strategies
