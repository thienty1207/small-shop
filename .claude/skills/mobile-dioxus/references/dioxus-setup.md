# Dioxus Mobile Setup

> Complete guide to setting up Dioxus for iOS and Android mobile development.

---

## Prerequisites

### Required Tools

**All Platforms:**
```bash
# Rust toolchain (latest stable)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update

# cargo-mobile2 (Tauri's mobile tooling)
cargo install --git https://github.com/tauri-apps/cargo-mobile2
```

**iOS Development (macOS only):**
```bash
# Xcode (from App Store)
xcode-select --install

# iOS targets
rustup target add aarch64-apple-ios
rustup target add x86_64-apple-ios  # For simulator
```

**Android Development (all platforms):**
```bash
# Android Studio
# Download from: https://developer.android.com/studio

# Android SDK (via Android Studio)
# Install: Build Tools, NDK, Command Line Tools

# Android targets
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add i686-linux-android
rustup target add x86_64-linux-android

# Set environment variables
export ANDROID_HOME=$HOME/Android/Sdk
export NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
```

---

## Project Setup

### 1. Create New Dioxus Mobile Project

```bash
# Initialize a new project
cargo new my-mobile-app
cd my-mobile-app

# Initialize mobile configuration
cargo mobile init
```

This creates:
```
my-mobile-app/
├── Cargo.toml
├── src/
│   └── main.rs
├── gen/                    # Generated platform code
│   ├── android/
│   └── ios/
└── .mobile/
    └── config.toml         # Mobile configuration
```

### 2. Configure Cargo.toml

```toml
[package]
name = "my-mobile-app"
version = "0.1.0"
edition = "2021"

[dependencies]
dioxus = { version = "0.6", features = ["mobile"] }
dioxus-mobile = "0.6"

# Platform-specific
[target.'cfg(target_os = "ios")'.dependencies]
objc = "0.2"

[target.'cfg(target_os = "android")'.dependencies]
jni = "0.21"
ndk = "0.8"
ndk-glue = "0.7"

# Metadata for mobile builds
[package.metadata.android]
build_targets = ["aarch64-linux-android", "armv7-linux-androideabi"]
package = "com.example.mymobileapp"

[package.metadata.android.sdk]
min_sdk_version = 24
target_sdk_version = 34
```

### 3. Configure Mobile Settings

Edit `.mobile/config.toml`:

```toml
[app]
name = "My Mobile App"
lib_name = "my_mobile_app"
asset_dir = "assets"
bundle_id = "com.example.mymobileapp"

[app.ios]
development_team = "YOUR_TEAM_ID"  # From Apple Developer account
deployment_target = "14.0"

[app.android]
min_sdk_version = 24
target_sdk_version = 34
```

---

## Basic App Structure

### main.rs

```rust
use dioxus::prelude::*;

fn main() {
    dioxus_mobile::launch(app);
}

fn app(cx: Scope) -> Element {
    let mut count = use_state(cx, || 0);

    cx.render(rsx! {
        div {
            style: "
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                font-family: sans-serif;
            ",
            
            h1 { "Dioxus Mobile App" }
            
            p {
                style: "font-size: 2rem;",
                "Count: {count}"
            }
            
            button {
                style: "
                    padding: 1rem 2rem;
                    font-size: 1.2rem;
                    border-radius: 8px;
                    border: none;
                    background: #007AFF;
                    color: white;
                ",
                onclick: move |_| *count.make_mut() += 1,
                "Increment"
            }
        }
    })
}
```

---

## Running the App

### iOS Simulator

```bash
# List available simulators
cargo mobile run --device list

# Run on default iOS simulator
cargo mobile run --device ios

# Run on specific simulator
cargo mobile run --device "iPhone 15 Pro"
```

### iOS Physical Device

```bash
# Connect iPhone via USB
# Trust computer on device

# List connected devices
cargo mobile run --device list

# Deploy to connected iPhone
cargo mobile run --device "Your iPhone Name"
```

### Android Emulator

```bash
# Create emulator via Android Studio
# Or via command line:
avdmanager create avd -n Pixel_7 -k "system-images;android-34;google_apis;x86_64"

# Start emulator
emulator -avd Pixel_7 &

# Run app
cargo mobile run --device android
```

### Android Physical Device

```bash
# Enable Developer Options on Android device
# Enable USB Debugging
# Connect via USB

# Verify connection
adb devices

# Run app
cargo mobile run --device android
```

---

## Building for Release

### iOS App Store

```bash
# Build release archive
cargo mobile build --release --device ios

# Archive will be in: gen/apple/build/

# Upload via Xcode:
# 1. Open gen/apple/YourApp.xcworkspace in Xcode
# 2. Product → Archive
# 3. Distribute App → App Store Connect
```

### Google Play Store

```bash
# Build release AAB
cargo mobile build --release --device android --format aab

# Sign the AAB
jarsigner -verbose \
  -keystore ~/my-release-key.keystore \
  gen/android/app/build/outputs/bundle/release/app-release.aab \
  my-key-alias

# Upload to Play Console
# https://play.google.com/console
```

---

## Platform-Specific Code

### iOS Native Integration

```rust
#[cfg(target_os = "ios")]
mod ios {
    use objc::*;
    
    pub fn request_notifications() {
        unsafe {
            let center: *mut Object = msg_send![
                class!(UNUserNotificationCenter),
                currentNotificationCenter
            ];
            let _: () = msg_send![
                center,
                requestAuthorizationWithOptions:7  // Alert | Badge | Sound
                completionHandler: |granted, error| {
                    println!("Notifications: {}", granted);
                }
            ];
        }
    }
}
```

### Android Native Integration

```rust
#[cfg(target_os = "android")]
mod android {
    use jni::JNIEnv;
    use ndk::context::AndroidContext;
    
    pub fn request_permissions(env: &JNIEnv) {
        // Request Android permissions
        let activity = ndk_glue::native_activity();
        // ... permission request code
    }
}
```

---

## Hot Reload (Development)

```bash
# Install dioxus-cli
cargo install dioxus-cli

# Run with hot reload
dx serve --platform ios
# or
dx serve --platform android
```

---

## Troubleshooting

### Common Issues

**iOS: "No development team selected"**
```bash
# Solution: Set development team in .mobile/config.toml
[app.ios]
development_team = "YOUR_TEAM_ID"
```

**Android: "NDK not found"**
```bash
# Solution: Set NDK_HOME
export NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
```

**Both: "Target not found"**
```bash
# Solution: Add missing targets
rustup target add aarch64-apple-ios
rustup target add aarch64-linux-android
```

---

## Next Steps

After setup:
1. Read [mobile-navigation.md](mobile-navigation.md) for navigation patterns
2. Read [mobile-performance.md](mobile-performance.md) for optimization
3. Read [mobile-ui-components.md](mobile-ui-components.md) for UI components

---

## Resources

- **Dioxus Mobile Docs**: https://dioxuslabs.com/learn/0.6/reference/mobile
- **cargo-mobile2**: https://github.com/tauri-apps/cargo-mobile2
- **Dioxus Examples**: https://github.com/DioxusLabs/example-projects
