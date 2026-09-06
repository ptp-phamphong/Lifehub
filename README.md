# LifeHub — full-stack on a Raspberry Pi

A personal hub for the things I track day to day — spending, income, class schedule, notifications, and the health of the machine it all runs on. An ASP.NET Core API, an Angular admin SPA, and a React Native mobile client, all served from a Raspberry Pi 4 sitting in my apartment, behind HTTPS on my own domain.

**Live:**
- Web app — [app.ptp-phamphong.com](https://app.ptp-phamphong.com) *(login required)*
- Public demo — [demo.ptp-phamphong.com](https://demo.ptp-phamphong.com) *(seeded data, no account needed)*

The demo runs the **same build** as the real app against a separate database seeded with generated data, so the app can be shown without exposing my finances.

---

## Stack

| Layer | Tech |
|---|---|
| API | ASP.NET Core 10.0 · EF Core (code-first) · Pomelo MySQL provider · Hangfire · JWT |
| Database | MariaDB on the Pi |
| Web | Angular 18 · TypeScript · SCSS · ngx-translate |
| Mobile | React Native 0.81 · Expo SDK 54 · EAS Build |
| Host | Raspberry Pi 4 · Caddy (auto-HTTPS, wildcard cert) · systemd |

---

## What it does

- **Expense and income tracking** with categories, plus an analytics dashboard — trends, heatmaps, category breakdowns, KPI tiles (hand-rolled inline SVG charts, so they re-theme for free instead of pulling in a canvas chart library).
- **Course schedule** imported from my university's student portal, with week and month calendar views and Vietnamese lunar dates.
- **AI expense analysis** — pluggable provider, either Google Gemini or a local Ollama model.
- **Visitor analytics** for the public portfolio site, with GeoIP lookup and bot filtering.
- **Background jobs** on Hangfire — scheduled portal sync, log maintenance, with a UI to trigger and inspect runs.
- **Physical button** wired to GPIO pin 27: pressing it sends an email notification. This is the part that makes it a Raspberry Pi project rather than a VPS project.
- **System monitor** reading real CPU temperature, memory and disk off the Pi via `vcgencmd`/`free`/`df`.

---

## Architecture

The backend is a deliberately strict layered flow, with one class per layer per feature:

```
Controller → Service → Repository → EF Core (AppDbContext) → MariaDB
                ↕
             Mapper  (DTO ↔ entity)
```

Every service, repository and mapper is an interface registered with `AddScoped<>` in `Program.cs` and injected through the constructor — nothing is ever `new`ed up. DTOs never leak entities to the client and entities never carry view concerns.

A few decisions worth calling out:

- **Auth is deny-by-default.** A global JWT `FallbackPolicy` means every endpoint requires a token unless it is explicitly marked `[AllowAnonymous]` — adding a new controller cannot accidentally expose it.
- **The API never sees `/api`.** The reverse proxy strips the prefix before forwarding, so controllers declare bare routes (`[Route("Auth/Login")]`). Roles are split per subdomain rather than per path, so trimming a URL cannot walk from the public site into the admin app.
- **Migrations run at startup** (`db.Database.Migrate()`), which keeps deployment to a single artifact copy.
- **Pi-only code paths degrade instead of crashing.** GPIO and `vcgencmd` are guarded behind `OperatingSystem.IsLinux()` and return stubs off-Linux, so the whole thing still builds and runs on Windows for development.

---

## Bilingual and theming

The web app ships in Vietnamese and English with a runtime switch, and in light and dark mode. Two constraints shaped the implementation:

- Both dictionaries implement the same TypeScript type, so **forgetting a translation fails the build** rather than silently falling back.
- **Only developer-authored labels are translated; data from the database is rendered verbatim.** A category the user named `Ăn uống` stays `Ăn uống` in English mode. This is a deliberate scope decision — an English screen legitimately mixes languages, and that is correct rather than a bug.

---

## Running it locally

Requires .NET 10 SDK, Node 18+ and a MySQL/MariaDB instance.

```bash
# Backend — note the doubled directory
cd API_Raspberry/API_Raspberry
dotnet run

# Web
cd Front_End_Raspberry
npm ci && ng serve            # http://localhost:4200

# Mobile
cd Mobile_Raspberry
npm ci && npx expo start
```

`appsettings*.json` in this repository contain **placeholders only**. Supply real values through environment variables — ASP.NET Core's standard configuration binding picks them up with no code change:

```
ConnectionStrings__DefaultConnection
Jwt__SecretKey
Auth__PasswordHash          Auth__AdminEmail
UehLogin__TaiKhoan          UehLogin__MatKhau
```

---

## Repository layout

```
API_Raspberry/API_Raspberry/   ASP.NET Core API (Controllers, Service, Repository, Mapper, Model, Dto, Migrations)
Front_End_Raspberry/           Angular 18 SPA
Mobile_Raspberry/              Expo / React Native client
Information_AI/                per-feature technical documentation (24 documents)
```

`Information_AI/` is the real documentation: one file per feature covering why it is built the way it is, the traps found while building it, and how it was verified. Start at `02_architecture-patterns.md`.

Deployment scripts, Caddy configuration and the Pi's operational setup live in a separate private repository — they are infrastructure, not application code.

---

## Related

- [ptp-phamphong.com](https://ptp-phamphong.com) — portfolio site ([source](https://github.com/ptp-phamphong/portfolio)), also served from the same Pi.
