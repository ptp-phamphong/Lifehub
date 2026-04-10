# Other Features and Missing Feature Summary

## Features present in the codebase (excluded from detailed docs per request)

### Speech-to-Text

- Backend: `SpeechToTextController`, `ISpeechToTextService`
- Endpoint: `POST /SpeechToText` (accepts audio file via multipart form)
- Uses Whisper.net for local speech recognition
- Mobile screen: `SpeechToTextScreen.tsx` (currently commented out in App.tsx tab navigator)
- Mobile service: `speechToTextService.ts`

### AI Expense Parsing

- Backend: `AiExpenseController`, `IAiExpenseService`
- Two implementations: `GeminiExpenseService`, `OllamaExpenseService`
- Endpoint: `POST /AiExpense` (accepts text prompt, returns parsed expense fields)
- Provider selected via `AiProvider` config in `appsettings.json`
- Uses reason type list to help AI categorize expenses

### GPIO Button Listener

- Backend: `ButtonListener` (hosted background service)
- Listens to Raspberry Pi GPIO pin 27 (InputPullDown mode)
- On button press: sends email to predefined addresses via Gmail SMTP
- Log file: `/home/pi/BotApp/button.log`
- Only functional on Raspberry Pi hardware

### Email Service

- Backend: `EmailService` (used by ButtonListener and NotificationEmailController)
- Gmail SMTP with App Password (port 587, TLS)
- Configured via environment variables: `EMAIL_ADDRESS`, `EMAIL_APP_PASSWORD`

---

## Features present ONLY on one platform

### Web-only features (Angular)

| Feature | Notes |
|---|---|
| Course Schedule Excel import | File upload + semester tag |
| Course Schedule bulk delete by semester | Double confirmation UI |
| Reason Type CRUD management | Create + update via dialog |
| Tab-based navigation | MainTabComponent with router tabs |

### Mobile-only features (React Native)

| Feature | Notes |
|---|---|
| Notification capture | Android NotificationListenerService |
| Notification monitor | View, sort, delete, email notifications |
| Notification filter management | CRUD for package/keyword/flag filters |
| App info resolution | Native module for app name/icon from PackageManager |
| Settings screen | SettingsScreen.tsx (commented out in navigator) |

---

## Missing or incomplete features

### 1. ReasonType CRUD on mobile

- **Current state**: Placeholder screen with static text.
- **What's missing**: Full CRUD UI (list, add, edit, toggle active).
- **Backend ready**: All endpoints exist and work.
- **Service gap**: `reasonTypeService.ts` only has `getAllReasonTypes()`.

### 2. Course Schedule CRUD on mobile

- **Current state**: Only calendar display (week/month views).
- **What's missing**: Add, edit, delete course forms. Excel import.
- **Backend ready**: All endpoints exist.
- **Service gap**: `courseScheduleService.ts` only has `getCourseScheduleByMonth()`.

### 3. Notification features on web

- **Current state**: No notification-related UI in Angular.
- **What's missing**: Notification list view, filter management page.
- **Backend ready**: All endpoints exist.
- **Feasibility**: Notification capture is inherently mobile-only, but viewing/managing stored notifications and filters could work on web.

### 4. Expense form on mobile — AI parsing integration

- **Current state**: Manual expense form exists. AI parsing endpoint exists.
- **What's missing**: UI integration to let users type natural language and have AI parse it into expense fields.
- **Backend ready**: `POST /AiExpense` endpoint works.

### 5. Speech-to-Text on mobile

- **Current state**: Screen exists but is commented out in tab navigator.
- **Status**: Likely experimental/incomplete.

### 6. Settings screen on mobile

- **Current state**: `SettingsScreen.tsx` exists but is commented out in tab navigator.
- **What it likely contains**: API URL configuration (runtime changeable via `setApiBaseUrl()`).

### 7. Income CRUD on mobile

- **Current state**: Income CRUD is available on backend and Angular web.
- **What's missing**: Mobile list/form/edit/delete UI for income records.
- **Backend ready**: Income endpoints are available (`/IncomeNote`, `/GetAllIncomeNote`, ...).

---

## Summary table

| Feature | Backend | Angular Web | Mobile |
|---|---|---|---|
| System Info | ✅ | ✅ | ✅ |
| Expense CRUD | ✅ | ✅ | ✅ |
| Income CRUD | ✅ | ✅ | ❌ |
| Reason Type CRUD | ✅ | ✅ | ❌ Placeholder |
| Course Schedule CRUD | ✅ | ✅ | ❌ Read-only calendar |
| Course Calendar display | ✅ | ✅ | ✅ |
| Notification capture | ✅ (storage) | ❌ | ✅ |
| Notification monitor | ✅ | ❌ | ✅ |
| Notification filter | ✅ | ❌ | ✅ |
| Email notifications | ✅ | ❌ | ✅ |
| AI expense parsing | ✅ | ❌ | ❌ |
| Speech-to-Text | ✅ | ❌ | ⚠️ Commented out |
| GPIO button | ✅ | N/A | N/A |
| Excel import (courses) | ✅ | ✅ | ❌ |
| Settings/config | ✅ | ❌ | ⚠️ Commented out |
