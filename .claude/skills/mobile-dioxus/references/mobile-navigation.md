# Mobile Navigation for Dioxus

> Navigation patterns for Dioxus mobile apps: tabs, stacks, deep linking, and back handling.
> **Navigation is the skeleton of your app—get it wrong and everything feels broken.**

---

## Navigation Selection

```
WHAT TYPE OF APP?
        │
        ├── 3-5 top-level sections (equal importance)
        │   └── ✅ Tab Bar / Bottom Navigation
        │
        ├── Deep hierarchical content (drill down)
        │   └── ✅ Stack Navigation
        │
        ├── Single linear flow
        │   └── ✅ Stack only (wizard/onboarding)
        │
        └── Tablet/Foldable
            └── ✅ Navigation Rail + List-Detail
```

---

## Tab Navigation in Dioxus

### When to Use

```
✅ USE Tab navigation when:
├── 3-5 top-level destinations
├── Destinations are of equal importance
├── User frequently switches between them
└── Each tab has independent content

❌ AVOID Tab when:
├── More than 5 destinations
├── Destinations have clear hierarchy
└── Content flows in a sequence
```

### Implementation

```rust
use dioxus::prelude::*;
use dioxus_router::prelude::*;

#[derive(Clone, Routable, Debug, PartialEq)]
enum Route {
    #[route("/")]
    Home {},
    #[route("/search")]
    Search {},
    #[route("/profile")]
    Profile {},
}

fn app(cx: Scope) -> Element {
    cx.render(rsx! {
        Router::<Route> {}
        TabBar {}
    })
}

#[component]
fn TabBar(cx: Scope) -> Element {
    cx.render(rsx! {
        nav {
            class: "tab-bar",
            Link { to: Route::Home {}, "Home" }
            Link { to: Route::Search {}, "Search" }
            Link { to: Route::Profile {}, "Profile" }
        }
    })
}
```

### Platform-Specific Styling

```rust
// iOS-style tab bar (49pt height)
#[cfg(target_os = "ios")]
const TAB_HEIGHT: &str = "49pt";

// Android-style bottom navigation (80dp height)
#[cfg(target_os = "android")]
const TAB_HEIGHT: &str = "80dp";

#[component]
fn TabBar(cx: Scope) -> Element {
    cx.render(rsx! {
        nav {
            style: "height: {TAB_HEIGHT}",
            // ... tabs
        }
    })
}
```

---

## Stack Navigation

### Core Concepts

```
Stack metaphor: Screens stack on top of each other

Push: Add screen on top
Pop: Remove top screen (back)
Navigate: Push to named route
Go back: Pop current screen
```

### Implementation

```rust
use dioxus_router::prelude::*;

#[derive(Clone, Routable, Debug, PartialEq)]
enum Route {
    #[route("/")]
    Home {},
    #[route("/product/:id")]
    ProductDetail { id: String },
    #[route("/cart")]
    Cart {},
}

#[component]
fn Home(cx: Scope) -> Element {
    let navigator = use_navigator(cx);
    
    cx.render(rsx! {
        button {
            onclick: move |_| {
                navigator.push(Route::ProductDetail { 
                    id: "123".to_string() 
                });
            },
            "View Product"
        }
    })
}

#[component]
fn ProductDetail(cx: Scope, id: String) -> Element {
    let navigator = use_navigator(cx);
    
    cx.render(rsx! {
        h1 { "Product {id}" }
        button {
            onclick: move |_| navigator.go_back(),
            "Back"
        }
    })
}
```

---

## Deep Linking

### Why Deep Links from Day One

```
Deep links enable:
├── Push notification navigation
├── Sharing content
├── Marketing campaigns
├── App clips / Instant apps
└── External app integration

Building later is HARD:
├── Requires navigation refactor
├── Screen dependencies unclear
└── Always plan deep links at start
```

### URL Structure

```
Scheme://host/path?params

Examples:
├── myapp://product/123
├── https://myapp.com/product/123 (Universal/App Link)
├── myapp://checkout?promo=SAVE20
├── myapp://tab/profile/settings

Hierarchy should match navigation:
├── myapp://home
├── myapp://home/product/123
└── myapp://home/product/123/reviews
```

### Dioxus Deep Link Setup

```rust
// Configure URL scheme in Cargo.toml
// [package.metadata.android]
// scheme = "myapp"

#[derive(Clone, Routable, Debug, PartialEq)]
enum Route {
    #[route("/")]
    Home {},
    
    #[route("/product/:id")]
    ProductDetail { id: String }< #[route("/checkout")]
    Checkout {
        #[url("?promo")]
        promo: Option<String>,
    },
}

// Deep link handler
fn handle_deep_link(url: &str, navigator: &Navigator<Route>) {
    // Parse and navigate
    if let Some(route) = parse_route(url) {
        navigator.push(route);
    }
}
```

---

## Navigation State Persistence

### What to Persist

```
SHOULD persist:
├── Current tab selection
├── Navigation history (back stack)
├── Scroll positions
└── User navigation preferences

SHOULD NOT persist:
├── Modal states
├── Temporary UI states
└── Stale data (refresh on return)
```

### Implementation

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct NavigationState {
    current_tab: usize,
    history: Vec<String>,
}

// Save state
fn save_nav_state(state: &NavigationState) {
    let json = serde_json::to_string(state).unwrap();
    // Save to local storage
    #[cfg(target_os = "ios")]
    save_to_user_defaults("nav_state", &json);
    
    #[cfg(target_os = "android")]
    save_to_shared_prefs("nav_state", &json);
}

// Restore state
fn restore_nav_state() -> Option<NavigationState> {
    #[cfg(target_os = "ios")]
    let json = load_from_user_defaults("nav_state")?;
    
    #[cfg(target_os = "android")]
    let json = load_from_shared_prefs("nav_state")?;
    
    serde_json::from_str(&json).ok()
}
```

---

## Platform-Specific Navigation

### iOS Navigation

```rust
#[cfg(target_os = "ios")]
#[component]
fn IOSNavBar(cx: Scope, title: String) -> Element {
    let navigator = use_navigator(cx);
    
    cx.render(rsx! {
        nav {
            class: "ios-nav-bar",
            // Back button (edge swipe supported by system)
            button {
                onclick: move |_| navigator.go_back(),
                "‹ Back"
            }
            h1 { "{title}" }
        }
    })
}
```

### Android Navigation

```rust
#[cfg(target_os = "android")]
#[component]
fn AndroidAppBar(cx: Scope, title: String) -> Element {
    let navigator = use_navigator(cx);
    
    cx.render(rsx! {
        div {
            class: "android-app-bar",
            // Up button for hierarchy
            button {
                onclick: move |_| navigator.go_back(),
                "↑"
            }
            h1 { "{title}" }
        }
    })
}
```

---

## Navigation Best Practices

### Back Button Handling

```
iOS:
├── Edge swipe from left (system gesture)
├── Back button in nav bar (optional)
└── Never override swipe back

Android:
├── System back button/gesture
├── Up button in toolbar (for drill-down)
├── Predictive back animation (Android 14+)
└── Must handle back correctly

Cross-Platform Rule:
├── Back ALWAYS navigates up the stack
├── Never hijack back for other purposes
├── Confirm before discarding unsaved data
└── Deep links should allow full back traversal
```

### Navigation Checklist

**Before Navigation Architecture:**
- [ ] App type determined (tabs/stack/drawer)
- [ ] Number of top-level destinations counted
- [ ] Deep link URL scheme planned
- [ ] Auth flow integrated with navigation
- [ ] Platform differences documented

**Before Every Screen:**
- [ ] Can user navigate back? (not dead end)
- [ ] Deep link to this screen planned
- [ ] State preserved on navigate away
- [ ] Transition appropriate
- [ ] Auth required? Handled?

**Before Release:**
- [ ] All deep links tested
- [ ] Back button works everywhere
- [ ] Edge swipe works (iOS)
- [ ] Predictive back works (Android 14+)
- [ ] Universal/App links configured

---

> **Remember:** Navigation is invisible when done right. Users shouldn't think about HOW to get somewhere—they just get there.
