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
- The MySQL EF provider version used by the backend is `Pomelo.EntityFrameworkCore.MySql 8.0.2`.

## 2. Backend

Platform:
- ASP.NET Core Web API on `.NET 8` (`net8.0`)
- Language: C#
- ORM: Entity Framework Core code-first

Main NuGet packages from `API_Raspberry/API_Raspberry/API_Raspberry.csproj`:

| Package | Version | Purpose |
|---|---:|---|
| Azure.AI.OpenAI | 2.1.0 | AI integration support |
| ClosedXML | 0.105.0 | Excel import/export work |
| Microsoft.EntityFrameworkCore | 8.0.11 | ORM core |
| Microsoft.EntityFrameworkCore.Design | 8.0.11 | EF design-time tooling |
| Microsoft.EntityFrameworkCore.Tools | 8.0.11 | EF CLI/tooling support |
| Pomelo.EntityFrameworkCore.MySql | 8.0.2 | MySQL provider for EF Core |
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
- Angular `16.2.x`
- TypeScript `~5.1.3`

Main dependencies from `Front_End_Raspberry/package.json`:

| Package | Version |
|---|---:|
| @angular/animations | ^16.2.0 |
| @angular/cdk | ^16.2.14 |
| @angular/common | ^16.2.0 |
| @angular/compiler | ^16.2.0 |
| @angular/core | ^16.2.0 |
| @angular/forms | ^16.2.0 |
| @angular/material | ^16.2.14 |
| @angular/platform-browser | ^16.2.0 |
| @angular/platform-browser-dynamic | ^16.2.0 |
| @angular/router | ^16.2.0 |
| @ng-bootstrap/ng-bootstrap | ^15.1.2 |
| @ng-select/ng-select | ^10.0.4 |
| bootstrap | ^5.3.8 |
| hammerjs | ^2.0.8 |
| lunisolar | ^1.3.4 |
| rxjs | ~7.8.0 |
| tslib | ^2.3.0 |
| zone.js | ~0.13.0 |

Main dev dependencies:

| Package | Version |
|---|---:|
| @angular-devkit/build-angular | ^16.2.10 |
| @angular/cli | ^16.2.10 |
| @angular/compiler-cli | ^16.2.0 |
| typescript | ~5.1.3 |
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