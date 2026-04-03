# Feature: Phone Notification Management

Two related features:
1. **Notification Monitor** — captures, stores, views, and emails phone notifications.
2. **Notification Filter** — manages rules to auto-ignore unwanted notifications.

Both are **mobile-only features** with backend storage. No Angular web UI.

---

## Part 1: Notification Monitor

### Backend Endpoints

| Method | Route | Body/Param | Returns |
|---|---|---|---|
| POST | `/AddPhoneNotification` | `PhoneNotificationCreateDto` | `int` (new id) |
| GET | `/GetAllPhoneNotifications` | `?sortBy=createddate&sortDirection=desc` | `List<PhoneNotificationDto>` |
| DELETE | `/DeletePhoneNotification/{id}` | — | `bool` |
| DELETE | `/DeleteAllPhoneNotifications` | — | `bool` |
| POST | `/SendNotificationEmail` | `NotificationEmailDto` | `{ message }` |

### Backend flow

```
PhoneNotificationController → IPhoneNotificationService → IPhoneNotificationRepository → AppDbContext
                                                         → IPhoneNotificationMapper
NotificationEmailController → EmailService (Gmail SMTP)
```

### Key backend files

- Controller: `API_Raspberry/Controllers/PhoneNotificationController.cs`
- Email controller: `API_Raspberry/Controllers/NotificationEmailController.cs`
- Service: `API_Raspberry/Service/PhoneNotificationService.cs`
- Repository: `API_Raspberry/Repository/PhoneNotificationRepository.cs`
- Mapper: `API_Raspberry/Mapper/PhoneNotificationMapper.cs`
- DTOs: `API_Raspberry/Dto/PhoneNotificationDto.cs`, `API_Raspberry/Dto/NotificationEmailDto.cs`
- Model: `API_Raspberry/Model/PhoneNotification.cs`

### PhoneNotification entity fields

- `Id` (int, PK)
- `App` (string, required) — package name (e.g., com.facebook.orca)
- `AppName` (string) — human-readable name
- `Title` (string)
- `Text` (string)
- `Time` (string) — formatted timestamp from phone
- `CreatedDate` (DateTime?)

### Email feature

`NotificationEmailController.SendNotificationEmail`:
- Accepts a list of notification items.
- Reads `EMAIL_ADDRESS` and `EMAIL_APP_PASSWORD` from environment variables.
- Builds an HTML table of notifications.
- Sends email to hardcoded `ptp.phamphong@gmail.com` via Gmail SMTP.

### React Native Mobile

#### Key files

- `Mobile_Raspberry/src/screens/NotificationMonitorScreen.tsx`
- `Mobile_Raspberry/src/services/notificationService.ts`
- `Mobile_Raspberry/src/services/appInfoService.ts`
- `Mobile_Raspberry/src/models/notification.model.ts`

#### Screen features

- Shows notification capture permission status.
- Provides button to grant Notification Access permission (opens Android Settings).
- Lists all captured notifications with app icon, app name, title, text, and time.
- Sort by time or by app name.
- Delete single notification or delete all.
- Send all notifications via email through backend API.
- Pull-to-refresh.

#### Notification storage logic (notificationService.ts)

- Primary: sends notification to backend API (`POST /AddPhoneNotification`).
- Fallback: stores in AsyncStorage if API is unreachable.
- Read: fetches from API first, falls back to AsyncStorage.
- Max 500 notifications in local fallback.

#### App info resolution (appInfoService.ts)

- Resolves package names to human-readable app names and icons.
- Uses native `AppInfoModule` (Java) via React Native bridge.
- Results are cached in memory maps.
- `resolveAppInfoBatch()` resolves multiple packages in parallel.

#### NotificationData model

```typescript
interface NotificationData {
  id?: number;
  app: string;       // package name
  appName?: string;  // display name
  title: string;
  text: string;
  time: string;
  createdDate?: string;
}
```

---

## Part 2: Notification Filter

### Backend Endpoints

| Method | Route | Body/Param | Returns |
|---|---|---|---|
| GET | `/GetAllNotificationFilters` | — | `List<NotificationFilterDto>` |
| GET | `/GetActiveNotificationFilters` | — | `List<NotificationFilterDto>` |
| GET | `/GetNotificationFilter/{id}` | — | `NotificationFilterDto` |
| POST | `/AddNotificationFilter` | `NotificationFilterCreateDto` | `int` (new id) |
| PUT | `/UpdateNotificationFilter/{id}` | `NotificationFilterUpdateDto` | `bool` |
| DELETE | `/DeleteNotificationFilter/{id}` | — | `bool` |
| POST | `/SeedNotificationFilters` | — | `bool` |

### Backend flow

```
NotificationFilterController → INotificationFilterService → INotificationFilterRepository → AppDbContext
                                                           → INotificationFilterMapper
```

### NotificationFilter entity fields

- `Id` (int, PK)
- `FilterType` (string, required) — `"package"`, `"keyword"`, or `"flag"`
- `FilterValue` (string, required)
- `Description` (string)
- `IsActive` (bool)
- `CreatedDate` (DateTime?)

### Filter types explained

| Type | FilterValue example | What it matches |
|---|---|---|
| `package` | `com.android.systemui` | Notification from this Android package |
| `keyword` | `đang chạy trong nền` | Title/text/bigText/subText contains this string (case-insensitive) |
| `flag` | `ongoing` | Android notification flag bit is set |

### Seed defaults

`SeedDefaults()` inserts predefined filters for common system notifications (Android system UI, Google Play, charging, USB debugging, chat bubbles, etc.) if they don't already exist. Called on app startup in `Program.cs`.

### React Native Mobile

#### Key files

- `Mobile_Raspberry/src/screens/NotificationFilterScreen.tsx`
- `Mobile_Raspberry/src/services/notificationFilterService.ts`
- `Mobile_Raspberry/src/models/notificationFilter.model.ts`

#### Screen features

- SectionList grouped by filter type: Flags, Packages, Keywords.
- Toggle switch to enable/disable each filter.
- Delete individual filter with confirmation.
- Add new filter via modal (type pre-selected based on section, enter value + description).
- Invalidates local cache after any change.
- Pull-to-refresh.

#### Filter service (notificationFilterService.ts)

API functions:
```typescript
getAllFilters(): Promise<NotificationFilterData[]>
getActiveFilters(): Promise<NotificationFilterData[]>
addFilter(filter): Promise<number>
updateFilter(id, update): Promise<void>
deleteFilter(id): Promise<void>
seedDefaultFilters(): Promise<void>
```

Cache management:
- Active filters are cached in AsyncStorage with 5-minute TTL.
- `getCachedActiveFilters()`: returns cached if fresh, fetches from API otherwise, falls back to stale cache if API fails.
- `invalidateFilterCache()`: clears cache to force next fetch.

Filter logic (`shouldIgnoreNotification`):
- Called in the headless notification handler.
- Checks package blacklist.
- Checks keyword blacklist (case-insensitive, matches against title + text + bigText + subText).
- Checks Android notification flag bits using `FLAG_NAME_TO_BIT` mapping.
- Also ignores notifications with no text content at all.

#### Android flag bit mapping

```typescript
const FLAG_NAME_TO_BIT = {
  ongoing: 0x00000002,           // FLAG_ONGOING_EVENT
  foreground_service: 0x00000040, // FLAG_FOREGROUND_SERVICE
  no_clear: 0x00000020,          // FLAG_NO_CLEAR
  group_summary: 0x00000200,     // FLAG_GROUP_SUMMARY
};
```

---

## Platform comparison

| Aspect | Angular Web | React Native Mobile |
|---|---|---|
| Notification monitor | Not available | Full implementation |
| Notification filter management | Not available | Full implementation |
| Send email report | Not available | Available via backend API |
| Notification capture | Not possible in browser | Android NotificationListenerService |
