# Level 1 — Runs & Models

## Purpose and scope

Level 1 adds read-only browsing for persisted ML runs and their training attempts. It provides a searchable and filterable run list, run details, and attempt details with the recorded stage and execution hierarchy. It does not create, retry, delete, or mutate runs.

The backend is authoritative for run state. The pages fetch the ML backend’s persisted run-management API through `mlClient`. The reporting backend/client remains separate and is not used for these pages.

## ML API contract

| Frontend call | Exact route | Response contract |
|---|---|---|
| `listRuns()` | `GET /api/v1/runs` | `RunSummaryResponse[]` (`list[RunSummaryResponse]` in the backend schema). |
| `getRun(runId)` | `GET /api/v1/runs/{run_id}` | `RunSummaryResponse`. |
| `getAttempt(runId, attemptId)` | `GET /api/v1/runs/{run_id}/attempts/{attempt_id}` | `AttemptDetailResponse`. |

The run routes are registered by the ML backend’s runs router with the `/api/v1/runs` prefix. They are not reporting routes. The frontend calls these paths using the existing `mlClient`, whose base URL is `VITE_ML_API_BASE_URL` (example: `http://127.0.0.1:8000`). It does not call `reportingClient` for run list or detail data.

The frontend TypeScript response shapes are declared in `src/api/runTypes.ts` and mirror the backend’s `RunSummaryResponse`, `AttemptDetailResponse`, `AttemptView`, `StageView`, and `ExecutionView` schema fields. Key relationships:

```text
RunSummaryResponse
  ├─ run_metadata: employee_code?, employee_name?, run_name?
  ├─ run_id, status, created/updated/started/completed timestamps
  ├─ latest_attempt_id?, active_inference_attempt_id?, inference_ready
  ├─ attempts: AttemptView[]
  ├─ inference_invocation_count, inference_invocations
  ├─ summary, errors
  └─ AttemptDetailResponse.attempt → stages[] → executions[]
```

The schema has nullable employee metadata and lifecycle timestamps/IDs where indicated. `summary`, `metrics`, and error `details` are records of contract-provided values. Sanitized error messages, codes, timestamps, scopes, and associated IDs are represented by the workflow error types. TypeScript uses `string` for backend literal status/stage values rather than validating a closed union.

Backend lifecycle literals currently include run/attempt statuses `created`, `running`, `partially_completed`, `completed`, `failed`, and `cancelled`; stage statuses `pending`, `running`, `completed`, and `failed`; and execution/inference-invocation statuses `running`, `completed`, `failed`, and `cancelled`. Training stage names include `part_a`, `part_b`, `part_c`, `part_d`, and `inference_bootstrap`.

## Files and responsibilities

| File | Responsibility |
|---|---|
| `src/api/runTypes.ts` | Frontend TS types for run summaries, attempts, stages, executions, inference invocations, and workflow errors. |
| `src/api/runsApi.ts` | Typed read-only ML run API functions; safely encodes run and attempt path parameters; checks key response shapes at runtime. |
| `src/api/runQueries.ts` | TanStack Query hooks and stable keys for run list, run detail, and attempt detail. |
| `src/pages/runsHelpers.ts` | Locale-aware timestamp formatting, nullable display fallback, and pure client-side run search/filter function. |
| `src/pages/RunsPages.tsx` | `/runs`, run detail, attempt detail, their state handling, and nested presentation components. |
| `src/pages/RunsPages.test.tsx` | Level 1 page tests with mocked API functions. |
| `src/components/common/LifecycleStatus.tsx` | MUI lifecycle status chip used for run, attempt, stage, and execution states. |
| `src/api/httpClient.ts` | Shared HTTP client used by `mlClient`; reads successful response bodies and maps HTTP/network/timeout errors. |
| `src/api/mlClient.ts` | ML `HttpClient` instance and base URL. |
| `src/app/queryClient.ts` | Shared retry and refetch defaults inherited by the run queries. |
| `src/App.tsx` | Registers the three run routes inside the existing shell and navigation. |

The shell, environment variables, common components, and Level 0 tests are described in [Level 0 — Frontend Foundation](LEVEL_0_FOUNDATION.md).

### Concise file tree

```text
frontend/src/
├─ App.tsx
├─ api/
│  ├─ runTypes.ts, runsApi.ts, runQueries.ts
│  ├─ mlClient.ts, httpClient.ts
│  └─ reportingClient.ts (Level 2 client; not used by these pages)
├─ components/common/LifecycleStatus.tsx
└─ pages/
   ├─ RunsPages.tsx, RunsPages.test.tsx
   └─ runsHelpers.ts
```

## Data flow and query behavior

```text
RunsPage / RunDetailPage / AttemptDetailPage
  → useRuns / useRun / useAttempt
  → listRuns / getRun / getAttempt
  → mlClient.get(path)
  → HttpClient native fetch
  → ML backend
```

Stable query keys are:

| Query | Key |
|---|---|
| Run list | `['runs']` |
| Run detail | `['runs', runId]` |
| Attempt detail | `['runs', runId, 'attempts', attemptId]` |

The run and attempt hooks are disabled until their route parameter values are non-empty. Path parameter values are passed through `encodeURIComponent`. The shared query client retries once and refetches active queries every 30 seconds (not in the background); pages can retain existing data while a background refetch runs. The list page’s manual Refresh calls `query.refetch()`. On successful run-list data it displays TanStack Query’s `dataUpdatedAt` as the last update time. The shell health refresh button invalidates health keys only; it is separate from the Runs page refresh.

API functions receive responses as `unknown` at the runtime validation boundary. The run list validates that the response is an array and that each item has key fields (`run_id`, `status`, `run_metadata`, `attempts`, `inference_ready`). Run detail checks the same keys. Attempt detail checks `run_id`, the attempt object and ID, and its stages array. These checks catch malformed top-level shapes, not every nested field. A detected mismatch throws a readable unexpected-response error; no raw stack trace is rendered.

## `/runs` — run list

The page title and description introduce persisted runs. Each returned run is shown as a responsive, keyboard-accessible linked card. Available card information includes the run name (falling back to run ID), run ID, employee name/code, run status, inference readiness, update time, and the latest attempt ID when it is present among the attempts.

- **Search:** case-insensitive partial match on employee code, employee name, run name, and run ID. It runs in the browser against the loaded collection.
- **Status filter:** “All statuses” plus the distinct status values present in the current response, sorted alphabetically.
- **Inference-readiness filter:** All, Ready, or Not ready, using the `inference_ready` boolean.
- **Count:** displays the filtered count and total loaded runs.
- **Refresh:** invokes the list query’s manual refetch. The button disables while fetching. When data already exists, a small refreshing indicator appears; after data has loaded, a failed background refresh shows a warning while retaining the prior results.
- **Navigation:** selecting a run card opens `/runs/:runId`.

The list endpoint’s response is already ordered newest-first by the backend; the frontend does not sort or send filtering parameters. Empty collection and no-filter-match conditions have distinct messages.

## `/runs/:runId` — run details

The run details page fetches its own `RunSummaryResponse`. Breadcrumbs lead back to Runs & Models. The overview shows run name/ID, run status, inference-ready state, employee name/code, created and updated timestamps, run metadata, the run summary, and recorded error messages when supplied.

The attempts section displays the API-provided attempt count and iterates over `attempts`. Each linked attempt card shows its position in that returned array, attempt ID/status, the most recently positioned stage as “Current stage” (or “Stage unavailable”), and started/completed times, using created/updated timestamps as fallbacks for the displayed start/completion labels. Selecting a card navigates to `/runs/:runId/attempts/:attemptId`.

The page does not currently render the run’s `inference_invocations` collection or every run timestamp: those fields exist in the response type but are not shown in this view.

## `/runs/:runId/attempts/:attemptId` — attempt details

Breadcrumbs link to Runs & Models and the parent run. The page displays the run ID, attempt ID and status, inference readiness reported by the attempt response, and created/started/completed/updated attempt timestamps. It also displays the attempt summary and sanitized error messages.

The stages section iterates through the returned `StageView[]`. Each stage card shows its normalized stage name, lifecycle status, active and successful execution IDs, and its executions. Execution entries show execution ID/status, start/completion times, metrics, and the supplied error message. Empty stage or execution collections get explicit empty copy. Layout uses stacked cards at all breakpoints; it does not currently switch to a desktop table.

This page visualizes the hierarchy `RUN → ATTEMPT → STAGE → EXECUTION`. It does not provide report-view buttons or stage report routes.

## Lifecycle badges and display formatting

`LifecycleStatus` replaces underscores in the status text with spaces and adds an accessible `Status: …` label. `completed` is green (`success`), `failed` and `cancelled` are red (`error`), `running` is blue (`info`), and other/unrecognized values use MUI’s default color. Date values are formatted using `Intl.DateTimeFormat` with locale defaults and medium date/short time. Null, missing, empty, or unparsable date/value fields display an em dash in helper-rendered values. Long run/attempt IDs wrap in details and list content; the list run ID has a tooltip for its full value.

## Loading, errors, empty data, and not-found behavior

| Situation | Current UI behavior |
|---|---|
| Initial request | Shared `LoadingState` with a page-specific loading label. |
| Recoverable query error without data | `ErrorAlert` with the error message and a Retry button calling `refetch()`. This includes network, timeout, unavailable-service, and non-404 HTTP failures. |
| Background list refresh error with prior data | Keeps prior runs visible and shows a warning. The query state/error message is not substituted for the existing data. |
| Empty run collection | “No runs yet” empty state. |
| Filters return no records | “No matching runs” empty state. |
| Run/attempt endpoint returns HTTP 404 | “Run not found” or “Attempt not found”. |
| Other invalid or malformed response | A runtime-shape error appears through the normal error-and-retry UI. |
| Invalid ID format/status other than 404 | There is no frontend identifier-format prevalidation. IDs are URI-encoded; the returned backend error is displayed with Retry unless the status is 404. |

The endpoint errors are carried through `ApiError`; error text is selected from the shared client’s supported response fields or a status fallback. UI does not render exception stacks. Missing nullable values use an em dash in formatted values; employee list fallback copy says “Employee unavailable”.

## Tests

`src/pages/RunsPages.test.tsx` mocks `runsApi` at the API boundary. It verifies list loading and populated/empty states, API failure with retry, search by run ID, status and readiness filtering, navigation from the run list to run details with its attempts visible, stage/execution presentation on attempt detail, run/attempt 404 states, and filtering to only inference-ready runs. The attempt-detail test loads the attempt URL directly; it does not simulate clicking an attempt card. The tests do not rely on a live ML backend. Level 0 shell, health, theme, HTTP client, and navigation tests remain in `App.test.tsx` and `api/httpClient.test.ts`.

## Operational note: persisted statuses

Old certification or test runs displayed as `running` are persisted ML backend records. They are not created by the Runs page, and they are not records from React/browser cache. The frontend reads and displays the backend’s persisted state; it does not modify or reconcile a run’s status.

## Boundaries and generated files

Level 1 is read-only. Reporting pages and report rendering, training workflows, and inference workflows belong to later levels. This page set does not create/delete/retry runs, execute inference, or implement mutations.

The files under `src/` and frontend configuration are source/configuration. `dist/` is generated production output, and `tsconfig.tsbuildinfo` is generated TypeScript incremental build data; neither should be treated as the implementation source.
