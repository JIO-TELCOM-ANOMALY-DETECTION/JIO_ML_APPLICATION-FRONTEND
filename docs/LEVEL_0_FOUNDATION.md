# Level 0 — Frontend Foundation

## Purpose and scope

Level 0 establishes the shared React application foundation for the JIO Telecom Anomaly Detection workspace. It provides the responsive navigation shell, Material UI light and dark themes, URL routing, shared query state, typed native-fetch clients, backend health indicators, common UI states, and the baseline tests.

The current source also includes Level 1 run-management pages. Level 0’s shell remains shared by those pages. These docs describe what the source does today; placeholder routes are not implemented workflows.

## Architecture and runtime flow

```text
index.html (#root)
  └─ src/main.tsx
      └─ App (theme → QueryClientProvider → BrowserRouter → Shell)
          ├─ navigation, health indicators and shared layout
          ├─ route page
          └─ API query → API function → mlClient or reportingClient
              └─ HttpClient → browser fetch → backend
```

`main.tsx` gets the `root` element from `index.html` and renders `<App />` with React DOM’s `createRoot`. `App` owns the current color mode and memoized MUI theme, then provides the shared `QueryClient` and `BrowserRouter`. `Shell` renders navigation, health, the current page route, and a small route-path footer.

### Source and configuration files

| File | Responsibility |
|---|---|
| `index.html` | Vite HTML entry point, viewport metadata, app title, `#root`, and `/src/main.tsx` module. |
| `src/main.tsx` | React DOM entry point; imports the app and global CSS and mounts `App`. |
| `src/App.tsx` | MUI theme setup and persistence; providers; responsive shell, navigation, routes, health queries, dashboard, and placeholders. |
| `src/index.css` | Small global reset: font rendering and minimum body width/margins. |
| `src/types.ts` | Shared `HealthState` union (`checking`, `healthy`, `unavailable`). |
| `src/config/env.ts` | Reads and validates Vite API URL variables and removes trailing slashes. |
| `src/api/httpClient.ts` | Shared `HttpClient` and `ApiError`, including GET, timeout, response parsing, and error classification. |
| `src/api/mlClient.ts` | ML-specific `HttpClient` instance using `config.mlApiBaseUrl`. |
| `src/api/reportingClient.ts` | Reporting-specific `HttpClient` instance using `config.reportingApiBaseUrl`. |
| `src/api/healthApi.ts` | Independent `/health` calls through the corresponding ML and reporting clients. |
| `src/app/queryClient.ts` | Shared TanStack `QueryClient` defaults. |
| `src/components/common/StatusBadge.tsx` | MUI badge for service health states, used by dashboard service cards. |
| `src/components/common/LoadingState.tsx` | Shared spinner and status text. |
| `src/components/common/ErrorAlert.tsx` | Shared MUI error alert. |
| `src/components/common/EmptyState.tsx` | Shared title and description for empty or missing content. |
| `src/components/common/PageContainer.tsx` | Responsive max-width page container. |
| `src/components/common/PageHeader.tsx` | Shared page title and description layout. |
| `src/components/common/SectionCard.tsx` | Outlined card with a section heading and content area. |
| `src/test/setup.ts` | Vitest setup: jest-dom matchers and `matchMedia` mock. |
| `src/App.test.tsx` | Shell, health-state badge, placeholder navigation, theme persistence, and unknown-route tests. |
| `src/api/httpClient.test.ts` | HTTP client JSON, HTTP error, non-JSON error, and network error tests. |
| `package.json` | Runtime/development dependencies and npm scripts. |
| `package-lock.json` | Locked npm dependency graph. |
| `vite.config.ts` | Vite React plugin and Vitest jsdom/setup configuration. |
| `tsconfig.json` | Strict TypeScript compiler options and included source/config files. |
| `eslint.config.js` | ESLint JavaScript, TypeScript, hooks, and React refresh rules. |
| `.env.example` | Example ML and reporting API base URLs. |
| `.env.local` | Local developer environment file when present; values are read by Vite and are not a checked-in source of defaults. |
| `.gitignore` | Frontend-local ignore rules. |

The current Level 1 source modules and their responsibilities are documented in [Level 1 — Runs & Models](LEVEL_1_RUNS_AND_MODELS.md).

### Concise file tree

```text
frontend/
├─ index.html
├─ package.json, package-lock.json
├─ vite.config.ts, tsconfig.json, eslint.config.js
├─ .env.example, .env.local, .gitignore
└─ src/
   ├─ main.tsx, App.tsx, App.test.tsx, index.css, types.ts
   ├─ app/queryClient.ts
   ├─ config/env.ts
   ├─ api/{httpClient,mlClient,reportingClient,healthApi}.ts
   ├─ api/httpClient.test.ts
   ├─ components/common/*.tsx
   └─ test/setup.ts
```

### Routes and shell

`BrowserRouter` wraps the `Shell`. The navigation list includes Dashboard (`/`), Guided Training, Quick Training, Inference, Runs & Models, Settings, and Feedback. The `NavLink` for the current route receives the active style; the root link uses `end` so it only matches `/`.

Routes currently implemented in `App.tsx`:

| Path | Current behavior |
|---|---|
| `/` | Dashboard with service-health cards and workspace cards. |
| `/runs` | Level 1 Runs & Models page. |
| `/runs/:runId` | Level 1 run details. |
| `/runs/:runId/attempts/:attemptId` | Level 1 attempt details. |
| `/training/guided` and `/training/guided/part-a` through `/training/guided/part-d` | Guided Training stages (Levels 3–5). |
| `/training/quick` | Complete Quick Training configuration and pipeline result (Level 6). |
| `/inference`, `/settings`, `/feedback` | Shared-shell placeholders. |
| Any unmatched path | “Page not found” view with a link back to the dashboard. |

The shell uses a permanent left drawer at medium desktop widths and a temporary drawer opened by the menu button on smaller screens. Health badges move into the content area on narrow screens. The footer shows the current pathname and the text `Level 0 foundation`.

### Theme and color-mode persistence

`App` creates a MUI theme from the current `mode` state. On startup, `getInitialMode` reads `localStorage['jio-color-mode']`; if that value is not `light` or `dark`, it follows `prefers-color-scheme`. The toolbar toggle changes the mode and writes the new value back to local storage. `CssBaseline` applies MUI’s global baseline. Theme palette colors, typography, and border radius are configured in `App.tsx`.

### TanStack Query

`src/app/queryClient.ts` exports one `QueryClient`, supplied to the app through `QueryClientProvider`. Its query defaults are:

```ts
{ retry: 1, refetchInterval: 30000, refetchIntervalInBackground: false }
```

Queries therefore retry once after failure, poll every 30 seconds while active, and do not poll while the browser page is in the background. Individual health queries set a 25-second `staleTime`.

### Environment and API clients

The frontend uses these Vite variables, also shown by `.env.example`:

| Variable | Default in example | Client |
|---|---|---|
| `VITE_ML_API_BASE_URL` | `http://127.0.0.1:8000` | `mlClient` |
| `VITE_REPORTING_API_BASE_URL` | `http://127.0.0.1:8001` | `reportingClient` |

`src/config/env.ts` trims whitespace and trailing slashes. Outside test mode, a missing URL throws a “Missing required environment variable” error. In test mode only, the same URLs are provided as fallbacks. The clients share the `HttpClient` implementation, but they have separate base URLs and service responsibilities; Level 1 runs calls use only `mlClient`.

To prepare a local environment from `frontend/`:

```powershell
npm install
Copy-Item .env.example .env.local
```

Edit `.env.local` only when your local backend URLs differ from the example. Vite reads `VITE_` variables at development/build time.

### `HttpClient` behavior

`HttpClient.get<T>()` uses the browser’s native `fetch`, adds `Accept: application/json`, and applies a 5,000 ms timeout using `AbortController` and `window.setTimeout`.

- If the response `Content-Type` contains `json`, it attempts JSON parsing; otherwise it reads text.
- A JSON or text body is returned as `T` for a successful HTTP status. The generic type is compile-time only; endpoints that need runtime shape checking do that in their API module.
- A non-2xx status throws `ApiError` with `kind: 'http'` and the status. Its message is taken from a string body, a JSON `detail`, a JSON `error.message`, or a status-based fallback.
- If timeout cancellation caused the failure, it throws `ApiError` with `kind: 'timeout'`.
- Other rejected fetch operations throw `ApiError` with `kind: 'network'`.
- Failed JSON parsing results in an undefined body; the HTTP status still determines success or failure. A malformed body on a successful response is therefore only detected where the caller validates its shape.

### Independent backend health

The top bar and dashboard run separate TanStack queries with keys `['health', 'ml']` and `['health', 'reporting']`. `healthApi.ml` requests `/health` through `mlClient`; `healthApi.reporting` requests `/health` through `reportingClient`. Any successful HTTP response marks that service reachable; the body is not interpreted.

The top-bar indicators show `checking`, `healthy`, or `unavailable`; the dashboard uses `StatusBadge` with those same states. When unavailable, the top indicator tooltip exposes the error message and the dashboard card says the connection is unavailable with the detail on hover. The global query polling refreshes each health query every 30 seconds. The shell refresh icon invalidates `['health']`, immediately refreshing both active service checks independently.

### Shared UI states and components

`LoadingState`, `ErrorAlert`, and `EmptyState` are small shared primitives. `PageContainer`, `PageHeader`, and `SectionCard` provide consistent page layout. The Level 0 dashboard currently uses the shell’s local `PageTitle`, `ServiceCard`, and placeholder components; the reusable page components are used by Level 1 pages. Do not infer a global automatic use of these shared components beyond their actual imports.

At the foundation level, loading and unavailable health are represented by the query state and health badges, dashboard service cards show the unavailable state and error tooltip, and unknown routes show a not-found view. `EmptyState` is used by Level 1 for empty and missing run data. `ErrorAlert` and `LoadingState` are also used by Level 1.

### Local ports and CORS

The current local setup uses:

| Service | Local URL/port |
|---|---|
| Vite frontend | `http://localhost:5173` by Vite’s default dev-server port (Vite may choose another port if it is busy). |
| ML backend | `http://127.0.0.1:8000` in `.env.example` and the documented Uvicorn command. |
| Reporting backend | `http://127.0.0.1:8001` in `.env.example` and the documented Uvicorn command. |

The ML backend configures CORS in its FastAPI app for `http://localhost:5173` and `http://127.0.0.1:5173`. The reporting backend has a configurable CORS allow-list whose source defaults include those origins. An earlier paragraph in `frontend/README.md` said the reporting allow-list defaults to empty; that description disagrees with the current source in `reporting_backend/app/core/config.py`, so this document records the source defaults. CORS is enforced and configured by the backends. The frontend only sends HTTP requests; it does not configure CORS or make a backend listen on the frontend’s port. An allowed frontend origin does not mean a backend listens on that port: the browser origin (Vite) and API server addresses are separate.

The frontend sends browser requests directly to the configured API URL, so browser CORS rules apply. A browser CORS error can prevent the frontend from reading a response even if the backend process is running. Backend port binding and CORS allow-list configuration are separate settings.

### Development and verification commands

Run these from `frontend/`:

```bash
npm run dev
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

`npm run dev` launches Vite (normally on port 5173). Backends must be started separately when live health/API access is needed. The package scripts map to ESLint, `tsc -b`, Vitest, and `tsc -b && vite build`, respectively.

### Level 0 test coverage

`src/App.test.tsx` covers shell/navigation rendering and initial checking state, placeholder navigation, health badge states, light/dark toggle persistence, and unknown routes. `src/api/httpClient.test.ts` covers successful JSON, JSON HTTP errors with status and detail, non-JSON HTTP errors, and network failures. `src/test/setup.ts` installs DOM matchers and a `matchMedia` test stub. The tests mock fetch and do not require live backends.

### Boundaries

Level 0 does not provide functional training, inference, settings, feedback, scheduler, authentication, or reporting screens. Dashboard workspace cards for later workflows link to shell placeholders only. Run browsing is implemented in Level 1; reporting and report rendering remain a later level. No backend behavior is implemented by the frontend foundation.

### Source files and generated output

`src/` and the configuration files listed above are editable source/configuration. `dist/` is generated by `npm run build` and contains production output; `tsconfig.tsbuildinfo` is TypeScript’s generated incremental build information. Neither is the source of truth for frontend behavior.
