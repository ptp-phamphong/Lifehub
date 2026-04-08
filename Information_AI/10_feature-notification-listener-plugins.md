# Feature: Android Notification Listener (Native Plugins)

This documents the three Expo config plugins in `Mobile_Raspberry/plugins/` that extend Android native behavior at build time. These plugins generate or modify Android-native files during `eas build`.

## Overview

| Plugin file | Purpose |
|---|---|
| `withNotificationListener.js` | Register Android NotificationListenerService |
| `withCleartextTraffic.js` | Allow HTTP (non-HTTPS) traffic to all domains |
| `withAppInfoModule.js` | Add native Java module for app name/icon lookup || `withNotificationIdentityFields.js` | Patch native library to expose notification identity fields + message signatures |
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
4. `handleNotification` (in `notificationService.ts`) processes each payload:
   - Parses the notification JSON.
   - Runs it through `shouldIgnoreNotification()` (filter logic).
   - If not filtered, extracts ALL message signatures from the notification payload (not just the latest).
   - For each message signature, creates a separate notification record with extracted sender/text.
   - Resolves the app name and serializes writes via a persist queue to prevent lost notifications on burst.
   - Stores all extracted notifications via API (with fallback to AsyncStorage if API unavailable).

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

## Plugin 4: withNotificationIdentityFields

### File

`Mobile_Raspberry/plugins/withNotificationIdentityFields.js`

### What it does

Patches the `RNNotification.java` class from `react-native-android-notification-listener` to extract and expose notification identity fields and all message signatures from the notification payload.

### Why it's needed

- The library's default implementation only captures basic notification fields.
- To handle **notification bursts** (when many messages arrive during network outage), we need:
  - Notification identity fields: `notificationKey`, `notificationId`, `notificationTag`, `postTime`
  - All message signatures, not just the summary text (Android MessagingStyle.Message extraction)
- This allows the app to differentiate individual messages within a single notification update.

### Patches applied to RNNotification.java

1. **Fields injection** (after `iconLarge` field):
   ```java
   protected String notificationKey;        // StatusBarNotification.getKey()
   protected String notificationId;         // StatusBarNotification.getId()
   protected String notificationTag;        // StatusBarNotification.getTag()
   protected ArrayList<String> messageSignatures;  // Extracted from EXTRA_MESSAGES
   ```

2. **Field assignment** (in constructor, after `this.time = ...`):
   ```java
   this.notificationKey = sbn.getKey();
   this.notificationId = Integer.toString(sbn.getId());
   this.notificationTag = sbn.getTag();
   this.messageSignatures = this.getMessageSignatures(notification);
   ```

3. **Message extraction helper** (new private method):
   ```java
   private ArrayList<String> getMessageSignatures(Notification notification) {
       ArrayList<String> result = new ArrayList<String>();
       try {
           // Extract from Notification.EXTRA_MESSAGES (MessagingStyle)
           android.os.Parcelable[] parcelables = notification.extras.getParcelableArray(Notification.EXTRA_MESSAGES);
           if (parcelables == null || parcelables.length == 0) return result;
           
           java.util.List<Notification.MessagingStyle.Message> messages =
               Notification.MessagingStyle.Message.getMessagesFromBundleArray(parcelables);
           
           // Build signature string: timestamp|sender|text
           for (Notification.MessagingStyle.Message message : messages) {
               CharSequence textValue = message.getText();
               CharSequence senderValue = message.getSender();
               long timestamp = message.getTimestamp();
               
               String safeText = (textValue == null) ? "" : textValue.toString().trim();
               String safeSender = (senderValue == null) ? "" : senderValue.toString().trim();
               
               result.add(Long.toString(timestamp) + "|" + safeSender + "|" + safeText);
           }
       } catch (Exception e) {
           Log.d(TAG, e.getMessage());
       }
       return result;
   }
   ```

### Message signature format

Each element in `messageSignatures` array is a pipe-separated string:
```
timestamp|sender|text
```

Example:
```
1712547890000|Alice|Hello
1712547895000|Alice|How are you?
```

This format allows the React Native layer to extract individual messages even when Android groups multiple messages into one notification update.

### Impact on notification handling

- The `handleNotification` function in `notificationService.ts` now:
  1. Reads ALL `messageSignatures` from the payload (instead of just taking the latest one).
  2. Deduplicates by parsing each signature to extract sender/text.
  3. Creates a separate notification record for EACH message.
  4. Serializes writes via a persist queue to prevent data loss when burst notifications arrive rapidly.

### Build requirement

This plugin runs during `eas build` and modifies the native library code in `node_modules`. **Any change to this plugin requires a full APK rebuild**—`eas update` will NOT apply the patch.

Build errors will occur if `RNNotification.java` path or anchor points change in a future version of `react-native-android-notification-listener`. The plugin validates this and fails fast with clear error messages.

---

## JavaScript Service: notificationService.ts

### Key functions added to handle bursts

**Persist queue** (global state):
```typescript
let persistQueue: Promise<void> = Promise.resolve();
```
Ensures notification writes are serialized, preventing request loss during burst events.

**getMessageSignatures() → string[]**:
Reads all message signatures from the notification payload and deduplicates them.

**buildNotificationIdentities() → NotificationIdentity[]**:
Returns an array (not a single object) because one notification event may contain multiple message signatures. Each identity includes:
- `notificationKey` (Android's unique key or computed from message signature hash)
- `androidTime` (extracted from message timestamp or fallback to postTime)
- `messageSender` & `messageText` (parsed from signature)

**mergeNotifications(remote, local) → NotificationData[]**:
When reading notifications, merges API response with local AsyncStorage fallback. This prevents data loss if API requests fail during burst.

**enqueuePersist(work) → Promise**:
Queues async work (e.g., storing a notification) to serialize disk writes when burst events arrive rapidly.

**handleNotification() flow**:
1. Parse raw payload.
2. Check filter (`shouldIgnoreNotification`).
3. Extract identities (array) and base title/text.
4. Queue async work that loops through each identity:
   - Build NotificationData with extracted sender (if available) or fallback to base title.
   - Call `storeNotification()` for each.
5. This ensures all messages are captured even if Android delivers them in a single event.

### Important notes

- All four plugins run during `eas build` only. They do NOT apply during `eas update`.
- Any change to these plugins requires a full APK rebuild.
- The plugins use Expo's `withAndroidManifest`, `withDangerousMod`, `withMainApplication`, and `withDangerousMod` APIs.
- The generated Java code is part of the build output, not committed to the repository source.
- Database constraint changes (removal of UNIQUE indexes) are applied via a separate EF Core migration on the backend.
