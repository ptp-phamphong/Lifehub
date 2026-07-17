# Feature: System Info

Read-only feature that displays Raspberry Pi hardware status (CPU temperature, RAM, disk space).

## Backend

### Endpoint

| Method | Route | Returns |
|---|---|---|
| GET | `/SystemInfo` | `SystemInfoDto` |

### Flow

```
SystemInfoController → ICurrentInfoService → runs bash commands on Pi → SystemInfoMapper → SystemInfoDto
```

### Key files

- Controller: `API_Raspberry/Controllers/SystemInfoController.cs`
- Service: `API_Raspberry/Service/CurrentInfoService.cs`
- Mapper: `API_Raspberry/Mapper/SystemInfoMapper.cs`
- Model: `API_Raspberry/Model/SystemInfo.cs`
- Dto: `API_Raspberry/Dto/SystemInfoDto.cs`

### How it works

`CurrentInfoService.GetSystemStatus()` executes three bash commands via `Process.Start`:

```bash
# CPU temperature
/usr/bin/vcgencmd measure_temp | cut -d'=' -f2 | tr -d "'C"

# RAM available
free -h | grep Mem | awk '{print $7"B available"}'

# Disk space
df -h / | awk 'NR==2 {print $4"B free"}'
```

Returns a `SystemInfo` model with string fields: `CpuTemperature`, `RamAvailable`, `MemoryAvailable`.

### DTO shape

```json
{
  "cpuTemperature": "45.1",
  "ramAvailable": "2.6GB available",
  "memoryAvailable": "12GB free"
}
```

### Notes

- The shell commands only exist on the Pi. **Off-Linux, `GetSystemStatus()` returns stub values instead of failing** (`"42.0"`, `"1.5GiB available (dev stub)"`, `"12GB free (dev stub)"`), so the endpoint and the UI still work when developing on Windows. Don't delete the call to make local dev work — it already degrades.
- No database involved — purely runtime shell execution.
- **Requires authentication**, like every endpoint: the global JWT `FallbackPolicy` in `Program.cs` covers this controller, and it carries no `[AllowAnonymous]`. Calling `GET /SystemInfo` without a bearer token returns 401.
- The `"B available"` / `"B free"` suffixes are produced by the `awk` commands, so this feature's values render in English even though the rest of the UI is Vietnamese.

## Angular Web Frontend

### Key file

- `Front_End_Raspberry/src/app/all-app-component/system-info-tab/system-info-tab.component.ts`

### Pattern

- Injects `HttpClient` directly into the component.
- Calls `GET {apiBaseUrl}/SystemInfo` on `ngOnInit`.
- Stores result in `result: any` and tracks `loading` and `lastUpdated`.
- Manual refresh available through `callApi()` method.
- No dedicated Angular service — HTTP call is inline in the component.

### UI behavior

- Shows loading spinner while fetching.
- Displays CPU temperature, RAM available, and disk space.
- Shows last update timestamp.
- Displays error message if API call fails.

## React Native Mobile

### Key file

- `Mobile_Raspberry/src/screens/SystemInfoScreen.tsx`

### Pattern

- Functional component with `useState` and `useEffect` hooks.
- Uses raw `fetch()` to call `GET {apiBaseUrl}/SystemInfo`.
- Typed response as `SystemInfo` interface (local to file).
- No service module — fetch is inline in the screen.
- Manual refresh button calls `callApi()` again.

### UI behavior

- Three colored cards showing CPU temperature, RAM, and disk space.
- Loading indicator on first load.
- Error card displayed on failure.
- Last updated timestamp shown.

## Platform comparison

| Aspect | Angular | React Native |
|---|---|---|
| API call location | Component (HttpClient) | Screen (fetch) |
| Service abstraction | None | None |
| Auto-refresh | On init only | On mount only |
| Manual refresh | Yes | Yes |
