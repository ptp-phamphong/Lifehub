# Feature: Theme Settings (Dark Mode)

Dark mode support for both web (Angular) and mobile (React Native) platforms. Theme preferences are persisted in the database via the existing `SystemConfiguration` key-value table.

## Language is a parallel preference, not part of this feature

Since 2026-07, the Angular web app also has a runtime **language** switcher (VI/EN) living right next to
dark mode in the UI — same settings page, same header toggle group — but it is a **separate system**,
documented in full at `Information_AI/24_feature-i18n-bilingual.md`. Worth knowing the differences before
touching either:

| | Theme (this doc) | Language |
|---|---|---|
| Web storage | `SystemConfiguration` (`THEME_WEB_DARK`) via API, `localStorage` as fallback cache | `localStorage['web-language']` only — **no API, no DB key**, does not sync across devices |
| Mobile storage | `SystemConfiguration` (`THEME_MOBILE_DARK`) via API | Not implemented yet — mobile i18n is deliberately paused, see the plan doc |
| Web service | `ThemeService` (`services/theme.service.ts`) | `LanguageService` (`services/language.service.ts`) — same shape (signal-based, one `init()` at startup), different persistence |
| Applied via | `dark-theme` class on `<body>` | `TranslateService.use()` + `document.documentElement.lang` |
| UI location | Theme Settings page (`theme-settings.component.html`) toggle cards; **also duplicated in the app header** (`main-tab.component.html`) for quick access without opening Settings | Same two locations — the `.language-switcher`/`.lang-button` markup in `theme-settings.component.html` is the "official home"; `main-tab.component.html` has an independent copy for the header |

**Why language doesn't have a `SystemConfiguration` key yet**: nothing technical blocks it — the plan doc
(`document/plans/i18n-bilingual-migration.md` §7.2) already spells out the fix (add `LANG_WEB`, mirror
`THEME_WEB_DARK`, all read/write already funneled through `LanguageService` so no component would need to
change). It just hasn't been asked for. If cross-device sync for language is ever requested, look there
first instead of re-deriving the approach.

**One thing NOT to copy from theme mode**: dark mode reacts to no browser signal by default (no
`prefers-color-scheme` fallback is wired in `ThemeService`), whereas `LanguageService` **does** fall back
to `navigator.language` before defaulting to Vietnamese. Don't "fix" language to match theme's behavior —
that fallback was a deliberate choice (see `resolveInitialLanguage()` in `language.service.ts`).

## Database Design

Uses the existing `systemConfiguration` table with two special keys:

| KeyConfig | ValueConfig | Description |
|---|---|---|
| `THEME_WEB_DARK` | `true` / `false` | Dark mode toggle for Angular web |
| `THEME_MOBILE_DARK` | `true` / `false` | Dark mode toggle for React Native mobile |

No new migration is needed — data is stored as key-value pairs in the existing `SystemConfiguration` table.

## Backend

### Endpoints

| Method | Route | Body | Returns |
|---|---|---|---|
| GET | /GetThemeSetting | - | ThemeSettingDto |
| PUT | /UpdateThemeSetting | ThemeSettingDto | bool |

### DTO

```csharp
public class ThemeSettingDto
{
    public bool WebDarkMode { get; set; }
    public bool MobileDarkMode { get; set; }
}
```

### Flow

ThemeSettingController → IThemeSettingService → AppDbContext (SystemConfigurations table)

### Key files

- Controller: `API_Raspberry/Controllers/ThemeSettingController.cs`
- Service: `API_Raspberry/Service/ThemeSettingService.cs`
- DTO: `API_Raspberry/Dto/ThemeSettingDto.cs`
- DI Registration: `Program.cs` → `AddScoped<IThemeSettingService, ThemeSettingService>()`

### Service Logic

- `GetThemeSetting()`: Reads `THEME_WEB_DARK` and `THEME_MOBILE_DARK` from SystemConfiguration table, returns as booleans (defaults to `false` if keys don't exist)
- `UpdateThemeSetting()`: Upserts both keys (creates if missing, updates if existing)

## Angular Web Frontend

### Navigation and Route

- Route: `/settings/theme-settings`
- Access: Top menu "Cài đặt" → Sidebar item "🎨 Theme"
- Legacy redirects: `/theme-settings`, `/setting/theme-settings`

### Key Files

- Component: `Front_End_Raspberry/src/app/all-app-component/theme-settings/theme-settings.component.ts`
- Template: `Front_End_Raspberry/src/app/all-app-component/theme-settings/theme-settings.component.html`
- Styles: `Front_End_Raspberry/src/app/all-app-component/theme-settings/theme-settings.component.scss`
- Service: `Front_End_Raspberry/src/app/services/theme.service.ts`
- Global dark CSS: `Front_End_Raspberry/src/styles.scss` (section "DARK THEME GLOBAL OVERRIDES")

### How Web Dark Mode Works

1. **On app startup** (`AppComponent.ngOnInit`): `ThemeService.loadAndApplyTheme()` fetches `GET /GetThemeSetting` and applies/removes `dark-theme` CSS class on `<body>`
2. **Fallback**: If API is unavailable, falls back to `localStorage` cache (`web-dark-mode` key)
3. **CSS strategy**: Token-based theme with CSS custom properties in `styles.scss` (`:root` for light and `body.dark-theme` for dark), components consume colors via `var(--color-*)`
4. **Toggle**: Clicking the toggle in Theme settings immediately applies the class and saves to API via `PUT /UpdateThemeSetting`

### Dark Mode Color Palette (Web)

| Element | Light | Dark |
|---|---|---|
| Body background | #f1f5f9 | #0f172a |
| Surface (cards) | #ffffff | #1e293b |
| Text primary | #1e293b | #e2e8f0 |
| Text secondary | #64748b | #94a3b8 |
| Border | #e2e8f0 | #334155 |
| Primary accent | #0ea5e9 | #2563eb / #60a5fa |

### Settings UI

Two toggle switches displayed as cards:
- **Web Dark Mode** — Toggles dark theme for the Angular web app
- **Mobile Dark Mode** — Toggles dark theme for the React Native mobile app (saved to DB, applied on mobile app startup)

## React Native Mobile

### Key Files

- Theme context: `Mobile_Raspberry/src/ThemeContext.tsx`
- App wrapper: `Mobile_Raspberry/App.tsx` (ThemeProvider)

### How Mobile Dark Mode Works

1. **ThemeProvider** wraps the entire app in `App.tsx`
2. On mount, `ThemeProvider` fetches `GET /GetThemeSetting` from the API
3. If `mobileDarkMode === true`, switches to dark color palette
4. Navigation theme (header, tab bar) is set dynamically in `App.tsx`
5. Screens use `useTheme()` hook to get `colors` object for dynamic styling
6. Screens apply `colors.background`, `colors.surface`, `colors.text`, etc. via inline style overrides

### Dark Mode Color Palette (Mobile)

| Element | Light | Dark |
|---|---|---|
| Background | #f1f5f9 | #0f172a |
| Surface | #ffffff | #1e293b |
| Text | #1e293b | #e2e8f0 |
| Text secondary | #64748b | #94a3b8 |
| Border | #e2e8f0 | #334155 |
| Primary | #0ea5e9 | #3b82f6 |
| Header bg | #0d6efd | #1e293b |
| Tab bar bg | #ffffff | #1e293b |

### Screens with Theme Support

- `SystemInfoScreen.tsx` — Full theme integration (container, cards, text, buttons)
- `ExpenseListScreen.tsx` — Container, summary, rows, buttons, toggles
- `CourseScheduleScreen.tsx` — Container, toggle bar
- `NotificationMonitorScreen.tsx` — Cards, controls, status states, list views
- `NotificationFilterScreen.tsx` — Header, section headers, cards, modal/input states
- `SettingsScreen.tsx` — Full screen theming for sections/inputs/buttons
- `ReasonTypeScreen.tsx` — Theme-aware container/text
- `SpeechToTextScreen.tsx` — Theme-aware layout/result/loading states

### Shared Components with Theme Support

- `FilterReasonType.tsx`
- `MonthPagination.tsx`
- `ExpenseFormModal.tsx`
- `LoadingOverlay.tsx`
- `CourseMonthCalendar.tsx`
- `CourseWeekCalendar.tsx`

## Mandatory Checklist for New UI Features

Use this checklist whenever adding or modifying UI:

1. **No light-only hardcoded backgrounds for core surfaces**
    - Avoid direct `#fff`, `#f8f9fa`, `bg-light` for container/card/modal/input unless intentionally semantic.

2. **Web (Angular) requirements**
    - Use `var(--color-*)` tokens from `Front_End_Raspberry/src/styles.scss`.
    - If integrating third-party classes (Bootstrap/Material), verify dark mode compatibility.

3. **Mobile (React Native) requirements**
    - Use `useTheme()` from `ThemeContext.tsx`.
    - Keep layout in `StyleSheet.create()`, inject color at runtime via style arrays.

4. **State coverage required**
    - Check normal, inactive/disabled, out-of-range (e.g., days not in current month), and highlighted states (e.g., today/current) in dark mode.

5. **Validation before merge**
    - Web: `cd Front_End_Raspberry && npx ng build`
    - Mobile: `cd Mobile_Raspberry && npx tsc --noEmit`
