# Feature: Android Notification Listener (Native Plugins)

This documents the three Expo config plugins in `Mobile_Raspberry/plugins/` that extend Android native behavior at build time. These plugins generate or modify Android-native files during `eas build`.

## Overview

| Plugin file | Purpose |
|---|---|
| `withNotificationListener.js` | Register Android NotificationListenerService |
| `withCleartextTraffic.js` | Allow HTTP (non-HTTPS) traffic to all domains |
| `withAppInfoModule.js` | Add native Java module for app name/icon lookup |

These plugins are registered in `Mobile_Raspberry/app.json` under `"plugins"`.

---

## Plugin 1: withNotificationListener

### File

`Mobile_Raspberry/plugins/withNotificationListener.js`

### What it does

Modifies `AndroidManifest.xml` to register the `RNAndroidNotificationListenerService` from the `react-native-android-notification-listener` library.

### Manifest changes

1. Adds `xmlns:tools` namespace.
2. Adds `tools:replace="android:allowBackup"` to resolve manifest merge conflict.
3. Registers `<service>` with:
   - Name: `com.lesimoes.androidnotificationlistener.RNAndroidNotificationListenerService`
   - Permission: `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`
   - Intent filter: `android.service.notification.NotificationListenerService`

### How notification capture works

1. Android calls the registered service whenever any notification appears on the device.
2. The service dispatches to the React Native headless task: `RNAndroidNotificationListenerHeadlessJs`.
3. This task is registered in `Mobile_Raspberry/index.ts`:
   ```typescript
   AppRegistry.registerHeadlessTask(
     'RNAndroidNotificationListenerHeadlessJs',
     () => handleNotification
   );
   ```
4. `handleNotification` (in `notificationService.ts`):
   - Parses the notification JSON.
   - Runs it through `shouldIgnoreNotification()` (filter logic).
   - If not filtered, resolves the app name and stores the notification via API.

### User requirement

The user must manually grant **Notification Access** permission in Android Settings. The app provides a button to open this setting page via:
```typescript
Linking.sendIntent('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS')
```

---

## Plugin 2: withCleartextTraffic

### File

`Mobile_Raspberry/plugins/withCleartextTraffic.js`

### What it does

Overrides Android's network security config to allow HTTP (cleartext) traffic to all domains.

### Why it's needed

- `expo-updates` auto-generates a `network_security_config.xml` that only allows cleartext to Expo's update server.
- This blocks HTTP requests to other domains (e.g., the Raspberry Pi API via DuckDNS).
- Android 9+ blocks cleartext by default.
- Chrome on the same phone works fine because it uses its own network stack.

### Changes made

1. Sets `android:usesCleartextTraffic="true"` in AndroidManifest.
2. Points `android:networkSecurityConfig` to a custom XML file.
3. Creates `app/src/main/res/xml/network_security_config.xml`:
   ```xml
   <network-security-config>
       <base-config cleartextTrafficPermitted="true">
           <trust-anchors>
               <certificates src="system" />
           </trust-anchors>
       </base-config>
   </network-security-config>
   ```

### Impact

Allows the app to make HTTP requests to any domain. Required because the Raspberry Pi API may be accessed via HTTP on the local network.

---

## Plugin 3: withAppInfoModule

### File

`Mobile_Raspberry/plugins/withAppInfoModule.js`

### What it does

Generates a Java native module that provides app name and icon lookup from Android's PackageManager API.

### Generated files

Two Java files are created at build time:

1. `app/src/main/java/com/phamphong/mobileRaspberry/appinfo/AppInfoModule.java`
2. `app/src/main/java/com/phamphong/mobileRaspberry/appinfo/AppInfoPackage.java`

### Native module methods

| Method | Input | Output |
|---|---|---|
| `getAppName(packageName)` | `"com.facebook.orca"` | `"Messenger"` (Promise) |
| `getAppIcon(packageName)` | package name string | base64 PNG string (Promise) |
| `getAppInfo(packageName)` | package name string | `{ name, icon, packageName }` (Promise) |

### Android permission

Adds `android.permission.QUERY_ALL_PACKAGES` to AndroidManifest.

This is required since Android 11 (API 30) — without it, `PackageManager.getApplicationInfo()` throws `NameNotFoundException` for most third-party apps.

### MainApplication registration

The plugin also modifies `MainApplication.java` (or `.kt`) to add:
```java
packages.add(new AppInfoPackage());
```

### React Native bridge

The native module is accessed from TypeScript via:
```typescript
import { NativeModules } from 'react-native';
const { AppInfoModule } = NativeModules;

// Usage
const name = await AppInfoModule.getAppName('com.facebook.orca');
const info = await AppInfoModule.getAppInfo('com.facebook.orca');
```

Wrapped by `Mobile_Raspberry/src/services/appInfoService.ts` which adds caching.

### Icon handling

- Icons are converted from Android `Drawable` → `Bitmap` → base64 PNG.
- Handles both regular `BitmapDrawable` and Android 8+ `AdaptiveIconDrawable`.
- Icons are resized to 72x72 pixels.

---

## Important notes

- All three plugins run during `eas build` only. They do NOT apply during `eas update`.
- Any change to these plugins requires a full APK rebuild.
- The plugins use Expo's `withAndroidManifest`, `withDangerousMod`, and `withMainApplication` APIs.
- The generated Java code is part of the build output, not committed to the repository source.
