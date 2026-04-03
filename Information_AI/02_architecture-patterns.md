# Architecture Patterns

## 1. Backend Architecture

Current backend pattern:
- Layered architecture
- ASP.NET Core dependency injection
- Repository pattern
- Service layer
- Mapper layer
- Entity Framework Core code-first

Practical flow:
- Controller -> Service -> Repository -> DbContext/MySQL
- Mapper classes convert between DTOs and entity models

### 1.1 Dependency Injection

The backend currently uses ASP.NET Core's built-in DI container in `Program.cs`.

Registered layers:
- DbContext: `AppDbContext`
- Mappers: `IReasonTypeMapper`, `IExpenseRecordMapper`, `ICourseScheduleMapper`, `IPhoneNotificationMapper`, `INotificationFilterMapper`, `ISystemInfoMapper`
- Repositories: `IExpenseRepository`, `IReasonTypeRepository`, `ICourseScheduleRepository`, `IPhoneNotificationRepository`, `INotificationFilterRepository`
- Services: `IExpenseService`, `IReasonTypeService`, `ICourseScheduleService`, `ICourseScheduleImportService`, `IPhoneNotificationService`, `INotificationFilterService`, `ICurrentInfoService`, `ISpeechToTextService`, `IAiExpenseService`

Lifetime:
- Most registrations are `AddScoped`, which is appropriate for request-scoped EF Core usage.

### 1.2 Repository Pattern

Repositories encapsulate data access and EF Core queries.

Examples:
- `ExpenseRepository` handles filtering, aggregation, CRUD, and query composition.
- Repositories depend on `AppDbContext`.

Responsibilities that belong in repository layer:
- Querying entities with LINQ
- Saving changes through EF Core
- Translating filter DTOs into database queries

### 1.3 Service Layer Pattern

Services hold business logic and orchestration between repositories and mappers.

Examples of service responsibilities:
- Convert create/update DTOs into entities through mappers
- Combine data from multiple repositories
- Apply business rules such as current-week and current-month summaries
- Select AI provider implementation from DI

### 1.4 Mapper Pattern

Dedicated mapper classes convert between DTOs and entities.

Why this is useful here:
- Keeps controllers thin
- Avoids leaking EF entities directly to API consumers
- Centralizes transformation logic
- Makes update behavior explicit

Example mapping responsibilities in the codebase:
- `ToDto(entity)`
- `ToDtoList(entities)`
- `ToEntity(createDto)`
- `UpdateEntity(entity, updateDto)`

### 1.5 EF Core Code-First Pattern

The backend uses EF Core code-first with migrations.

Observed behavior:
- Entities are defined in `Model/`
- `AppDbContext` defines `DbSet<>` properties and relationships
- Migrations are stored in `Migrations/`
- `db.Database.Migrate()` is executed automatically on startup

Implications:
- Schema is primarily owned by C# model and migration files
- Deployments can auto-apply pending migrations at startup
- SQL scripts in `DataFix/` are supplemental, not the main schema mechanism

### 1.6 Hosted Service Pattern

The project also uses a hosted background service:
- `ButtonListener` is registered with `AddHostedService<ButtonListener>()`

Purpose:
- Run Raspberry Pi GPIO button listening in the background beside the HTTP API.

## 2. Web Frontend Architecture

Current Angular pattern:
- Module-based Angular application
- Component-driven UI
- Route-based navigation via Angular Router
- Template-driven forms via `FormsModule`
- Direct `HttpClient` usage inside components
- Shared model classes for typed data shapes

### 2.1 Component Pattern

The Angular app is organized mainly around feature components under `src/app/all-app-component/`.

Examples:
- Expense components
- Reason type components
- Course schedule components
- System info component
- Main route shell container

This is a classic component-first Angular structure rather than a strict domain module structure.

### 2.4 Navigation Pattern

The Angular web app now uses route-based navigation instead of rendering tab content in-place.

Observed pattern:
- Root route `/` redirects to the System Info route
- `MainTabComponent` acts as the navigation shell
- Each tab button maps to a route through `routerLink`
- Child content is rendered via `router-outlet`

Tradeoff:
- Better URL sharing and browser history behavior
- Clearer separation between navigation shell and feature content

### 2.2 Data Access Pattern

The current Angular code does not appear to use a dedicated API service layer for most features.

Observed pattern:
- Components inject `HttpClient` directly
- Components call endpoints themselves
- Environment files provide the API base URL

Tradeoff:
- Simple and fast for small apps
- Harder to reuse API logic across many components as the app grows

### 2.3 State Management Pattern

The Angular app mainly uses local component state.

Observed characteristics:
- No NgRx or other centralized state library
- State is managed inside components
- Parent-child component coordination is done through inputs/events/local logic

## 3. Mobile Frontend Architecture

Current React Native pattern:
- Screen/component/service separation
- Functional React components with hooks
- Service modules wrapping `fetch`
- Bottom-tab navigation via React Navigation
- Local screen state instead of a global state library

### 3.1 Screen + Component Split

Structure:
- `src/screens/`: screen-level containers
- `src/components/`: reusable UI pieces
- `src/services/`: API wrappers
- `src/models/`: typed data models

This gives the mobile app a cleaner separation than the current Angular app.

### 3.2 Service Module Pattern

API access is abstracted into plain TypeScript service modules.

Observed pattern:
- Reusable helpers like `postJson` and `getJson`
- Screen components call service functions such as `getAllExpenseNotes()`
- API base URL comes from runtime config in `src/config.ts`

### 3.3 State Management Pattern

State is mostly screen-local using React hooks.

Observed characteristics:
- `useState`, `useEffect`, and `useCallback`
- No Redux, Zustand, MobX, or React Query currently visible
- Reload logic is kept inside each screen

### 3.4 Navigation Pattern

Navigation is handled by React Navigation using a bottom tab navigator in `App.tsx`.

### 3.5 Native Extension Pattern

The mobile app uses Expo config plugins to extend Android native behavior.

This is the current bridge between JavaScript and Android-native features:
- Register a notification listener service
- Enable global cleartext HTTP traffic through Android network config
- Generate and register Java native module files for app info lookup

This means the project is mostly React Native/Expo, with small Android-native customization generated during build.

## 4. Design Summary

Short summary by area:

| Area | Current pattern |
|---|---|
| Database | MySQL with EF Core code-first migrations |
| Backend | Layered architecture with DI, services, repositories, mappers |
| Web frontend | Component-driven Angular app with direct HttpClient in components |
| Mobile frontend | Screen/component/service split with hooks and navigation |

## 5. Important Reality Check

Older notes may describe the backend as manually instantiating services/repositories.

That is not the current state of this repository.

The current backend is already using:
- constructor injection
- interface-based services/repositories/mappers
- scoped registration in `Program.cs`