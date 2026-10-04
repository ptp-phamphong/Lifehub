# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Three applications that share one backend, all running live on a Raspberry Pi:

| Directory | Stack | Runs as |
|---|---|---|
| `API_Raspberry/API_Raspberry/` | ASP.NET Core 10.0, EF Core, MariaDB | `app.ptp-phamphong.com/api/*` |
| `Front_End_Raspberry/` | Angular 18 SPA (login required) | `app.ptp-phamphong.com` · demo at `demo.ptp-phamphong.com` |
| `Mobile_Raspberry/` | React Native + Expo | EAS build |

Note the **doubled backend path** — `API_Raspberry/API_Raspberry/Controllers/…`, not `API_Raspberry/Controllers/…`.

Deployment, Caddy config, systemd, and the Pi's operational setup live in a **separate private infra repo**, not here. Don't add deploy scripts or host configuration to this repository.

## Start here

Per-feature narrative lives in `Information_AI/NN_feature-*.md` — read the matching doc before changing a feature. `Information_AI/02_architecture-patterns.md` covers the layering, `01_tech-stack-and-versions.md` the dependency versions.

## Architecture

Backend is a strict layered flow: **Controller → Service → Repository → EF Core (`AppDbContext`) → MariaDB**, with a separate **Mapper** layer converting between DTOs and entities (`ToDto`, `ToEntity`, `UpdateEntity`). All services/repositories/mappers are interface-based and registered with `AddScoped<>` in `Program.cs` — no manual instantiation in current code (older pre-2024 code may still `new` things up; don't copy that pattern).

- Entities: `API_Raspberry/API_Raspberry/Model/`
- DTOs: `API_Raspberry/API_Raspberry/Dto/`
- Migrations: `API_Raspberry/API_Raspberry/Migrations/` (EF Core code-first; `db.Database.Migrate()` runs automatically on startup)
- DbContext: `API_Raspberry/API_Raspberry/Data/AppDbContext.cs`
- `DataFix/` SQL scripts are supplemental only, not the schema source of truth
- The Pi runs **MariaDB**, but the backend connects via Pomelo pinned to `MySqlServerVersion(8, 0, 36)`. Works today; worth recalling when a migration or query misbehaves.
- Recurring/scheduled work uses **Hangfire** (`Service/Jobs/*`, registered via `IRecurringJobManager`), not `AddHostedService`.

Frontend: Angular is component-driven (`src/app/all-app-component/`), components call `HttpClient` directly (no shared API service layer), local component state only (no NgRx). Mobile: screens/components/services split (`src/screens/`, `src/components/`, `src/services/`), functional components with hooks, no global state library.

**Pi-only code paths auto-disable off-Linux — don't delete them to develop locally:**
- `ButtonListener` (a hosted service watching GPIO pin 27 for a physical button, sending email notifications) is only registered when `OperatingSystem.IsLinux()`; override with `ButtonListener:Enabled` in appsettings. Its constructor also swallows GPIO failures, so it degrades instead of taking the app down.
- `CurrentInfoService.GetSystemStatus()` (behind `/SystemInfo`) shells out to `vcgencmd`/`free`/`df` via `/usr/bin/bash`; off-Linux it returns stub values so the UI still renders.

## Commands

```bash
# Backend (project lives at the doubled path API_Raspberry/API_Raspberry/)
cd API_Raspberry/API_Raspberry
dotnet run                             # start API locally (check launchSettings.json for port)
dotnet ef migrations add [Name]        # after changing an entity
dotnet ef database update              # apply pending EF Core migrations
(cd .. && dotnet test API_Raspberry.Tests)   # xUnit; run from API_Raspberry/ (also guards the demo allowlist)

# Frontend (Angular)
cd Front_End_Raspberry
ng serve                               # dev server, http://localhost:4200
ng build --configuration production    # production build
ng test                                # unit tests

# Mobile (Expo)
cd Mobile_Raspberry
npx expo start                         # dev server
npx tsc --noEmit                       # type check (run before finishing any mobile UI change)
```

## Critical conventions

- **DI is mandatory**: every service/repository is an interface, registered in `Program.cs`, injected via constructor. Never `new` up a service or repository.
- **No `/api` prefix**: routes are `/ExpenseNote`, `/SystemInfo`, etc., defined directly on action methods (not at controller level). The reverse proxy in front of the API strips `/api` before forwarding, so the backend never sees it.
- **Auth is on by default**: a global JWT `FallbackPolicy` means every endpoint requires auth unless marked `[AllowAnonymous]`.
- **Demo instance is deny-by-default**: on demo (`IDemoModeService.IsDemo`) every endpoint without `[AllowInDemo]` returns an empty 404, including `[AllowAnonymous]` ones. A new endpoint is blocked on demo unless you put `[AllowInDemo]` on the *method* (never the class) — only when it is harmless (no mail/Zalo, no external service, no real data) — **and** update `ExpectedAllowlist` in `API_Raspberry.Tests/DemoAllowlistTests.cs`. Use `IDemoModeService`, not raw `DemoMode`. Narrative: `Information_AI/25_feature-demo-environment.md`.
- **Nullable disabled** (`<Nullable>disable</Nullable>`) — don't add null-forgiving operators.
- **CORS is a restricted origin allowlist**, despite the policy being *named* `AllowAll` in `Program.cs`. It permits only the production hosts plus `localhost:4200` (Angular dev), `:8081` (mobile dev), `:3000` (portfolio dev). Add origins there when a new client needs access — don't assume the name means it's open.
- **Never commit a real credential.** `appsettings*.json` in this repo holds placeholders only; production values arrive as environment variables (`Jwt__SecretKey`, `ConnectionStrings__DefaultConnection`, `UehLogin__TaiKhoan`, `UehLogin__MatKhau`, `Auth__PasswordHash`, `Auth__AdminEmail`) via ASP.NET Core's normal configuration convention — no code change needed to read them. This repository is public.
- **No hardcoded user-facing strings — the app is bilingual (vi/en)**. Every label, button, table header, placeholder, validation/error message, `Alert.alert`/`window.confirm` text and `title=` tooltip goes through the translation layer, in the same change. Narrative: `Information_AI/24_feature-i18n-bilingual.md`.
  - Angular: `{{ 'key' | translate }}` (bind for attributes: `[placeholder]="'key' | translate"`); add the key to `Dictionary` in `src/app/i18n/types.ts` and to **both** `dictionaries/vi.ts` and `en.ts` — TypeScript fails the build if the two diverge.
  - **Store message keys, never translated strings.** A component field holding `translate.instant(...)` output stays frozen in the old language when the user switches. Keep client-side errors as keys (`errorKey`), and verbatim backend text separately (`errorRaw`). `login.component.ts` is the reference.
  - **`LOCALE_ID` is fixed at bootstrap** and does not react to a runtime language switch — pass the locale explicitly to every pipe: `{{ amount | currency:'VND':'symbol':'1.0-0':locale() }}` from `LanguageService.locale()`. VND has 0 decimals, unlike USD.
  - Vietnamese stays the source language and the fallback: write `vi.ts` first, with diacritics. Spell it `Xóa`, not `Xoá` — both are valid, the repo is standardised on the former.
  - **Migration is incomplete and still in progress.** Unconverted features are still hardcoded Vietnamese — that is known, not a bug to fix ad-hoc. **The per-feature table in `document/plans/i18n-bilingual-migration.md` §6 is the single source of truth for what is done** (ticked ✅) and what is left; don't restate the list here or anywhere else, it only drifts. Convert a feature wholesale when you touch it and tick it off in that table; don't leave a feature half-translated.
  - **Labels only — database values are never translated.** The line is: a string a developer typed into code gets translated; a string that arrived from the DB is rendered verbatim. A `ReasonType` named `Vũng Tàu` stays `Vũng Tàu` in English mode, as do expense/income notes, course names and `learningMode` from the UEH portal, semester names, usernames, `SystemConfiguration` keys/values, phone-notification content, and visitor city/country/browser from DB-IP. This is the owner's explicit scope decision, not an unfinished piece — **never add a translation table or an `…En` column for user data**. Consequence: an English screen legitimately mixes languages (a chart showing `Vũng Tàu`, `Ăn uống` beside a generated `Other` is correct). `utils/learning-mode.ts` therefore needs no i18n work at all — and `NGHỈ` there is a sentinel compared in code, so translating it would break cancelled-session detection. Full table: §4.3 of `document/plans/i18n-bilingual-migration.md`.
  - Also exempt: technical identifiers and proper nouns (`Email`, `IP`, `bot`, `Portfolio`), the `IP Geolocation by DB-IP` attribution (required by DB-IP's CC-BY licence), HTML attributes (`id=`, `autocomplete=`), and cross-layer sentinel strings like `'Invalid credentials'` in `authService.ts` that are matched in code rather than shown.
- **Dark mode is mandatory for any UI change** (web or mobile), in the same change:
  - Angular: use `var(--color-*)` tokens from `Front_End_Raspberry/src/styles.scss`; never hardcode light-only colors.
  - React Native: use `useTheme()` from `Mobile_Raspberry/src/ThemeContext.tsx`; apply colors via runtime style overrides, not fixed values.
  - Verify both light and dark before considering a UI task done.
- **Feature docs must be kept current**: when adding a feature, write `Information_AI/NN_feature-[name].md`.

## Git

- Never run `git commit` or `git push` unless the user explicitly asks, even mid-task.
