# Tech Stack And Versions

## 1. Database

Primary database:
- MySQL

How it is used:
- The backend connects through the `DefaultConnection` string in `API_Raspberry/API_Raspberry/appsettings.json`.
- Entity Framework Core is used in code-first style.
- Schema changes are tracked through EF Core migrations under `API_Raspberry/API_Raspberry/Migrations`.
- Additional SQL migration/support scripts also exist under `DataFix/`.

Version note:
- The MySQL server version itself is not pinned anywhere in this repository.
- The MySQL EF provider version used by the backend is `Pomelo.EntityFrameworkCore.MySql 9.0.0`.

## 2. Backend

Platform:
- ASP.NET Core Web API on `.NET 9` (`net9.0`)
- Language: C#
- ORM: Entity Framework Core code-first

Main NuGet packages from `API_Raspberry/API_Raspberry/API_Raspberry.csproj`:

| Package | Version | Purpose |
|---|---:|---|
| Azure.AI.OpenAI | 2.1.0 | AI integration support |
| ClosedXML | 0.105.0 | Excel import/export work |
| Microsoft.EntityFrameworkCore | 9.0.16 | ORM core |
| Microsoft.EntityFrameworkCore.Design | 9.0.16 | EF design-time tooling |
| Microsoft.EntityFrameworkCore.Tools | 9.0.16 | EF CLI/tooling support |
| Pomelo.EntityFrameworkCore.MySql | 9.0.0 | MySQL provider for EF Core |
| Swashbuckle.AspNetCore | 6.6.2 | Swagger/OpenAPI |
| System.Device.Gpio | 4.0.1 | Raspberry Pi GPIO button integration |
| Whisper.net | 1.9.0 | Speech-to-text integration |
| Whisper.net.Runtime | 1.9.0 | Runtime for Whisper |

Other backend technologies in use:
- ASP.NET Core built-in dependency injection
- Hosted background service for GPIO button listening
- Swagger in development
- CORS policy named `AllowAll`
- AI provider switching between Gemini and Ollama via config

## 3. Web Frontend

Platform:
- Angular `18.2.x`
- TypeScript `~5.4.5`

Main dependencies from `Front_End_Raspberry/package.json`:

| Package | Version |
|---|---:|
| @angular/animations | ^18.2.14 |
| @angular/cdk | ^18.2.14 |
| @angular/common | ^18.2.14 |
| @angular/compiler | ^18.2.14 |
| @angular/core | ^18.2.14 |
| @angular/forms | ^18.2.14 |
| @angular/material | ^18.2.14 |
| @angular/platform-browser | ^18.2.14 |
| @angular/platform-browser-dynamic | ^18.2.14 |
| @angular/router | ^18.2.14 |
| @ng-bootstrap/ng-bootstrap | ^17.0.1 |
| @ng-select/ng-select | ^13.9.1 |
| bootstrap | ^5.3.8 |
| hammerjs | ^2.0.8 |
| lunisolar | 1.5.1 |
| rxjs | ~7.8.0 |
| tslib | ^2.3.0 |
| zone.js | ~0.14.10 |

Main dev dependencies:

| Package | Version |
|---|---:|
| @angular-devkit/build-angular | ^18.2.21 |
| @angular/cli | ^18.2.21 |
| @angular/compiler-cli | ^18.2.14 |
| typescript | ~5.4.5 |
| jasmine-core | ~4.6.0 |
| karma | ~6.4.0 |

Environment behavior:
- Development API base URL: `https://localhost:44391`
- Production API base URL: `/api`

## 4. Mobile Frontend

Platform:
- React Native `0.81.5`
- React `19.1.0`
- Expo SDK `~54.0.0`
- TypeScript `~5.9.2`

Main dependencies from `Mobile_Raspberry/package.json`:

| Package | Version |
|---|---:|
| @react-native-async-storage/async-storage | ^2.2.0 |
| @react-native-community/datetimepicker | 8.4.4 |
| @react-navigation/bottom-tabs | ^7.15.2 |
| @react-navigation/native | ^7.1.31 |
| expo | ~54.0.0 |
| expo-asset | ~12.0.12 |
| expo-av | ~16.0.8 |
| expo-constants | ~18.0.13 |
| expo-file-system | ~19.0.21 |
| expo-font | ~14.0.11 |
| expo-keep-awake | ~15.0.8 |
| expo-status-bar | ~3.0.9 |
| expo-updates | ~29.0.16 |
| lunisolar | ^1.3.4 |
| react | 19.1.0 |
| react-dom | 19.1.0 |
| react-native | 0.81.5 |
| react-native-android-notification-listener | ^5.0.1 |
| react-native-gesture-handler | ^2.15.0 |
| react-native-safe-area-context | ~5.6.0 |
| react-native-screens | ~4.16.0 |
| react-native-web | ^0.21.0 |

Mobile build/deploy tooling:
- EAS Build and EAS Update
- `eas.json` requires CLI version `>= 15.0.0`

Native Android customization:
- The mobile app includes Expo config plugins that generate Android native files during build.
- This includes manifest updates, cleartext traffic config, notification listener registration, and a generated Java native module for app info lookup.

## 5. Cross-Cutting Technology Notes

Infrastructure and runtime pieces used across the solution:
- Raspberry Pi as deployment target for backend and web app
- Apache for serving Angular static files on the Pi
- Caddy as reverse proxy and HTTPS terminator
- SSH and SCP for deployment from Windows to Raspberry Pi
- Tailscale / network access to reach the Pi