# Level 2 - Reporting and Results Review

This guide describes the reporting review features present in `frontend/src` and the read-only contracts implemented by `reporting_backend`. Frontend code is authoritative for page behavior; backend route and reader code defines the persisted report payloads. Reporting endpoints are separate from the ML run-management endpoints used by Level 1.

## Purpose, scope, and boundaries

Level 2 adds read-only review of persisted Part A through Part D execution reports and persisted inference invocation reports. It augments the Level 1 run and attempt pages with reporting-backend summaries and provides dedicated report pages. It does not start training or inference, mutate runs, or implement a report editor.

The UI renders values returned by the reporting service. It does not recalculate backend metrics. Report details are flexible JSON-shaped data: the frontend types common fields, but the backend readers determine which fields exist for each stored result and may omit values.

Level 2 does not implement report artifact downloads, arbitrary artifact file browsing, reporting filters, training workflows, or inference execution workflows. The main `/inference` navigation item remains a Level 0 placeholder. Run discovery, run details, attempt details and their lifecycle hierarchy remain ML-backend data from Level 1.

## Concise file tree

```text
frontend/
|-- .env.example
|-- package.json
|-- src/
|   |-- App.tsx
|   |-- api/
|   |   |-- httpClient.ts
|   |   |-- mlClient.ts
|   |   |-- reportingClient.ts
|   |   |-- reportTypes.ts
|   |   |-- reportingApi.ts
|   |   |-- reportQueries.ts
|   |   |-- reportErrorDisplay.ts
|   |   |-- reportErrorDisplay.test.ts
|   |   |-- runTypes.ts, runsApi.ts, runQueries.ts
|   |-- app/queryClient.ts
|   |-- components/
|   |   |-- common/ (shared page, loading, empty, error, and status UI)
|   |   |-- reporting/ReportData.tsx
|   |   |-- reporting/ReportingPanels.tsx
|   |-- config/env.ts
|   |-- pages/
|       |-- ReportingPages.tsx
|       |-- ReportingPages.test.tsx
|       |-- RunsPages.tsx
|       |-- RunsPages.test.tsx
|-- docs/LEVEL_2_REPORTING.md
```

This is a responsibility-oriented subset of the frontend tree, not a list of generated output. `dist/` is produced by Vite during a production build, and `tsconfig.tsbuildinfo` is TypeScript build state; neither is source documentation or an input to report rendering.

## Architecture and request flow

Reporting data follows this path:

```text
Reporting page or panel
  -> report query hook (TanStack Query)
  -> reporting API function and response-shape check
  -> reportingClient (shared HttpClient)
  -> GET request to reporting backend on port 8001
```

For example, `StageReportPage` reads `runId`, `attemptId` and `stage` from the URL, calls `useStageReport`, and the hook calls `getStageReport`. `getStageReport` checks the stage, URL-encodes path identifiers, and calls `reportingClient.get` for `/api/v1/reports/runs/.../attempts/.../stages/...`.

Run discovery remains with `mlClient`: the `/runs` list and the Level 1 run/attempt detail endpoints are ML-backend contracts on port 8000. Reporting summaries, stage reports and inference report data come from the reporting backend through `reportingClient` on port 8001. This split is intentional: reporting backend exposes `/api/v1/reports/...`, and does not replace Level 1's ML run-management API. `ReportingPanels` are separately queried panels embedded in ML detail pages, so a reporting failure does not replace or hide successful ML run and attempt data.

The clients are distinct `HttpClient` instances configured with `VITE_ML_API_BASE_URL` and `VITE_REPORTING_API_BASE_URL`. Both use native `fetch`, request JSON, and share timeout and HTTP/network error behavior in `src/api/httpClient.ts`. The reporting API functions do not issue raw fetch calls.

## Level 2 files and responsibilities

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | Registers the stage-report and inference-report routes while keeping the common shell and Level 1 routes. |
| `src/api/reportTypes.ts` | Frontend response types for report envelopes, artifacts, report details, stage summaries, run summaries and invocation lists; declares the four supported stage names. |
| `src/api/reportingApi.ts` | Reporting endpoint functions, ID/stage validation, URL encoding, and runtime checks for response shape. |
| `src/api/reportQueries.ts` | Stable report query keys and TanStack Query hooks, including input enablement and disabled interval polling. |
| `src/api/reportErrorDisplay.ts` | Sanitizes reporting error text by replacing traceback details and redacting absolute paths. |
| `src/api/reportErrorDisplay.test.ts` | Verifies traceback replacement and Windows/Unix absolute-path redaction. |
| `src/components/reporting/ReportData.tsx` | Generic nested structured-data renderer, report section wrapper, artifact metadata cards, and bounded preview tables. |
| `src/components/reporting/ReportingPanels.tsx` | Adds reporting run summary and inference history panels to run detail, and persisted stage status/report links to attempt detail. |
| `src/pages/ReportingPages.tsx` | Stage and inference report pages, invalid-route display, report metadata, stage-specific rendering, warnings, and report error/retry UI. |
| `src/pages/ReportingPages.test.tsx` | Route and component integration tests for Level 2 reporting behavior. |
| `src/pages/RunsPages.tsx` | Existing Level 1 run/attempt pages; Level 2 adds reporting panels without changing their ML source. |
| `src/pages/RunsPages.test.tsx` | Existing Level 1 tests for run listing/details and ML lifecycle hierarchy; supports regression coverage for the integration surface. |
| `src/api/httpClient.ts`, `src/api/reportingClient.ts`, `src/config/env.ts` | Shared HTTP behavior, reporting base URL client, and environment-variable configuration used by report requests. |
| `src/api/runTypes.ts`, `src/api/runsApi.ts`, `src/api/runQueries.ts`, `src/api/mlClient.ts` | Level 1 ML run and attempt contracts, API functions, query hooks, and ML client. These remain the source for run discovery/details. |
| `src/app/queryClient.ts` | Shared TanStack Query defaults used across the application. |
| `src/components/common/*` | Shared loading, error, empty, status, page-container, page-header and section UI used by Level 2 pages and panels. |
| `package.json`, `.env.example` | Frontend commands/dependencies and example API base URL configuration; no Level 2 dependency was added for rendering reports. |

## Routes and page behavior

| Route | Page behavior and data source |
| --- | --- |
| `/runs` | Existing Level 1 ML run listing via `useRuns` and `mlClient`; search and filters are client-side. |
| `/runs/:runId` | Existing ML run detail via `useRun`, plus separately loaded reporting summary and inference invocation history through `RunReportingPanels`. |
| `/runs/:runId/attempts/:attemptId` | Existing ML attempt/stage/execution hierarchy via `useAttempt`, plus reporting backend stage statuses and links through `AttemptReportingPanel`. |
| `/runs/:runId/attempts/:attemptId/reports/:stage` | Dedicated report page for canonical `part_a`, `part_b`, `part_c` or `part_d` report. |
| `/runs/:runId/inference/:invocationId` | Dedicated inference invocation report page. |

Run-report and attempt-report integration is additive. The ML run still supplies run metadata, timestamps, status, summary, sanitized errors, attempt and execution data. The reporting backend supplies its own persisted run projection, inference invocation list and attempt stage projection. If a reporting query errors, its panel shows a reporting error and retry action while the surrounding ML detail remains rendered.

## Reporting backend endpoints

The routes below are mounted beneath `/api/v1` by the reporting backend. They are all called by `reportingApi.ts` using `reportingClient`; none of these Level 2 requests use `mlClient`.

| Method and path | Frontend function | Response purpose |
| --- | --- | --- |
| `GET /api/v1/reports/runs/{run_id}` | `getRunReport` | Persisted run summary, attempt IDs, readiness and inference invocation count. |
| `GET /api/v1/reports/runs/{run_id}/attempts/{attempt_id}` | `getAttemptReport` | Attempt status and stage-status map, with successful execution IDs. |
| `GET /api/v1/reports/runs/{run_id}/attempts/{attempt_id}/stages/{stage}` | `getStageReport` | One Part A-D `ReportEnvelope` for a completed stage with a successful execution. |
| `GET /api/v1/reports/runs/{run_id}/inference` | `listInferenceReports` | Persisted invocation summary rows for a run. |
| `GET /api/v1/reports/runs/{run_id}/inference/{invocation_id}` | `getInferenceReport` | One completed inference `ReportEnvelope`. |

The reporting API accepts identifiers matching `^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$` and encodes IDs in URL paths. The frontend stage allowlist is exactly `part_a`, `part_b`, `part_c`, `part_d`. Although the reporting attempt projection can include `inference_bootstrap`, that is not a supported stage-report route or report page.

### Endpoint ownership and data examples

Level 1 run listing uses `GET /api/v1/runs` on ML backend, returning `list[RunSummaryResponse]`; a Level 1 attempt detail uses `GET /api/v1/runs/{run_id}/attempts/{attempt_id}` and the existing `AttemptDetailResponse` / `AttemptView` / `StageView` / `ExecutionView` types. Level 2's reporting run projection is a different response from that ML `RunSummaryResponse`.

Example reporting requests, with the host determined by `VITE_REPORTING_API_BASE_URL`:

```http
GET http://127.0.0.1:8001/api/v1/reports/runs/run-123
GET http://127.0.0.1:8001/api/v1/reports/runs/run-123/attempts/attempt-7/stages/part_a
```

The first response is shaped approximately as follows; nullable fields can be null and the values are read from the persisted reporting manifest:

```json
{
  "run_id": "run-123",
  "status": "completed",
  "latest_attempt_id": "attempt-7",
  "active_inference_attempt_id": null,
  "inference_ready": true,
  "attempts": ["attempt-7"],
  "inference_invocation_count": 0
}
```

The frontend `RunReportSummary` type expects those fields; backend `run()` constructs that projection from its manifest. `AttemptReportSummary` contains `run_id`, `attempt_id`, nullable `status`, and `stages: Record<string, { status: string | null; successful_execution_id: string | null }>`. These reporting types do not include the richer Level 1 run metadata or the nested execution history.

## Report response types and rendered content

### `ReportEnvelope`

The reporting backend schema and frontend `ReportEnvelope` agree on these common fields:

| Field | Meaning |
| --- | --- |
| `run_id` | Persisted run identity. |
| `attempt_id` | Attempt identity for stage reports; nullable for inference reports. |
| `stage` | Stage identifier, or `inference` for inference reports. |
| `status` | Report status. The current stage and inference readers produce `completed` reports. |
| `execution_id` | Successful stage execution ID, nullable for inference. |
| `invocation_id` | Inference invocation identity, nullable for stage reports. |
| `training_attempt_id` | Training attempt associated with inference, nullable when absent. |
| `generated_at` | Report response generation timestamp. |
| `summary` | Flexible JSON object of report-level values. |
| `artifacts` | Artifact metadata and an optional bounded preview. |
| `warnings` | String warnings returned by the reader. |
| `details` | Flexible JSON object containing KPI, training, or series details. |

`StructuredValue` models JSON scalars, arrays and objects. `ReportDetails` gives common optional entries (`kpis`, `training_records`, `series`, `skipped_series`) while allowing additional JSON-compatible fields. `ReportKpiDetail` and `InferenceSeriesDetail` type frequently rendered values and retain an index signature for backend fields. This is a frontend view of a flexible backend envelope, not a promise that every report contains every optional field.

The API parsers check expected top-level object/array structure and required report envelope and artifact metadata fields. They do not fully validate every nested value or reject unknown fields. A malformed top-level response becomes an unexpected-response error.

### Part A, B, C, and D

The shared report page renders report identity and status, generation time, warnings, summary, details and artifacts. `StageSpecific` chooses `details.training_records` for Part D and `details.kpis` for Parts A-C. If no KPI rows are present, it renders the returned details object as structured data instead.

| Stage | Backend reader values exposed in `summary` and `details` |
| --- | --- |
| Part A | Summary `kpi_count`, `prepared_dataset_count`. Per-KPI records include `kpi_name`, `site_analysis` (`total_rows`, `total_unique_sites`, `rows_with_missing_site_identity`), `server_validation` (`check_skipped`, `total_sites`, `consistent_site_count`, `inconsistent_site_count`, `unresolved_site_count`, `rows_with_missing_server`) and `integrity` (`total_sites`, `expected_timestamps_per_site`, `total_missing_timestamps`, `total_gap_events`, `rows_with_invalid_timestamp`, `rows_outside_expected_timeline`). |
| Part B | Summary `kpi_count`. Per-KPI records include `kpi_name`, `prophet_enabled`, row counts, duplicate/inserted/invalid row counts, valid/invalid series, outliers, original gaps/missing points, phase 1-4 fill counts, and `unresolved_points`. |
| Part C | Summary `kpi_count`. Per-KPI records include `kpi_name`, `feature_columns`, row/site processing counts, skipped/insufficient-history sites, populated/missing feature cell counts, and `resolved_config`. |
| Part D | Summary `model_type`, `kpi_count`. `training_records` include KPI, training status/model type, minimum history points, total/valid/trained/skipped series counts, model feature columns and target column. For the training summary, metadata and decision settings, the reader also loads selected JSON values into each record when available. |

Exact optional values depend on the result snapshot and files that exist. The backend reader selects these fields; the frontend presents the returned structure and does not infer missing metrics.

### Inference reports

The run detail's inference panel renders the listing fields available for each invocation: `invocation_id`, optional `training_attempt_id`, `status`, `started_at_utc`, `completed_at_utc` and `metrics`. Each invocation card links to `/runs/:runId/inference/:invocationId`.

Inference detail is another `ReportEnvelope` with `stage: "inference"`. Backend summary selection includes `model_type`, `inference_days`, `inference_start`, `inference_end_exclusive`, `total_saved_series`, `completed_series`, `skipped_series_count` and `unmodelled_part_c_series`, augmented by invocation start/completion timestamps and `metrics` when returned. `details.series` includes available KPI/series identity, row/scorable counts and anomaly counts/rate (including model, lower-bound and upper-bound anomaly counts); `details.skipped_series` contains the backend-provided skipped-series data. The page shows a per-series section and a skipped-series section, including explicit empty messages when either has no records.

## Artifacts and preview limits

Each `ReportArtifact` has `name`, `kind`, `format`, `relative_path`, `size_bytes` and nullable `preview`. The UI displays these metadata fields and, when supplied, draws the preview rows as a table. The table derives its columns from keys in the returned preview row objects. A null preview produces “No bounded preview was returned”; an empty preview has a separate empty-preview message.

Backend readers resolve artifact paths under configured run roots and include previews for selected CSV artifacts. The bounded reader uses the backend `max_csv_preview_rows` configuration. The browser only receives metadata and those bounded preview rows in the report response. It does not receive a download URL or ask the backend for arbitrary `relative_path` content. Therefore artifact downloads are not available in this implementation; displaying a relative path is informational and does not make it a browser-accessible file URL.

## Query keys, enablement, and refresh behavior

`src/api/reportQueries.ts` defines these query keys:

| Data | Query key |
| --- | --- |
| Run report | `['reports', 'runs', runId]` |
| Attempt report | `['reports', 'runs', runId, 'attempts', attemptId]` |
| Stage report | `['reports', 'runs', runId, 'attempts', attemptId, 'stages', stage]` |
| Invocation list | `['reports', 'runs', runId, 'inference']` |
| Inference detail | `['reports', 'runs', runId, 'inference', invocationId]` |

Hooks are enabled only when IDs pass `isValidReportId`; stage report is additionally enabled only for the four canonical stage strings. Report hooks specify `refetchInterval: false`, so they do not use periodic polling. The shared `QueryClient` defaults still apply otherwise (including its retry/staleness settings); pages and panels expose explicit refresh/retry buttons that call `refetch()`. While data exists and a refresh is running, the UI retains the prior report and displays a refreshing status; buttons are disabled during fetch.

## Errors, state handling, and isolation

Reporting service errors use the backend's structured `{"error":{"code":"...","message":"..."}}` shape when available. `HttpClient` maps message, status and code to `ApiError`. `reportErrorMessage` replaces traceback-shaped text with safe log guidance and redacts Windows and Unix absolute paths. Report pages preserve a structured API error code in their displayed message. The sanitizer does not rewrite relative artifact paths intentionally included as report metadata.

| Condition | Current behavior |
| --- | --- |
| Initial report/panel request | Shared `LoadingState` label indicates which report is loading. |
| Background/manual refresh with data | Existing data remains visible, a refreshing status appears, and the refresh button is disabled until the request settles. |
| Reporting API failure | Reporting-specific `ErrorAlert` plus retry button; the run/attempt ML sections remain independently rendered. |
| HTTP 404 for a report or invocation | Report page labels it “Report not found” and shows sanitized service detail/code. Level 1 run/attempt pages retain their own not-found state for ML 404s. |
| Stage unavailable / incomplete stage | HTTP 409 and codes such as `STAGE_NOT_COMPLETED` or `NO_SUCCESSFUL_EXECUTION` render “Stage report unavailable” with a retry action. Backend only builds a stage report for a completed stage with a successful execution and readable result snapshot. |
| Unsupported stage or malformed ID in report URL | “Invalid report URL” page with explanation and link to `/runs`; hooks are disabled and no report request is made. |
| Empty invocation list | “No inference reports” state. |
| Empty per-series or skipped-series content | Explicit empty text in the corresponding inference section. |
| Empty artifact list or absent preview | “No artifacts were returned”, no bounded preview, or empty bounded preview message as appropriate. |
| Empty report details | Stage details fall back to generic structured data; generic renderer says when an object has no values. |
| Unknown frontend route | Shared shell's not-found page. |
| Reporting service unavailable | Reporting panel/page displays service error and retry while already-loaded ML data remains visible. |

The Level 2 integration deliberately uses independent React Query keys and separate HTTP clients for reporting and ML. A reporting 404/409/503 cannot replace the ML run query's state. Conversely, failure to load ML run details does not manufacture or imply a reporting summary.

The generic structured renderer shows nested objects and arrays recursively. At depth four, nested structured values are placed in a collapsible JSON block. This limits visual expansion while retaining the returned data. The UI renders lifecycle strings through `LifecycleStatus`, which normalizes known status spellings for badge color/label and keeps unrecognized values visible as normalized text; it does not alter the backend status.

## Tests and coverage

No tests or builds were run for this documentation-only update. Existing Level 2 tests are:

| Test file | Behaviors covered |
| --- | --- |
| `src/pages/ReportingPages.test.tsx` | Run detail renders reporting run summary and invocation list; reporting failure leaves ML run detail visible; attempt panel shows persisted stage statuses and only links completed supported stages; Part A report renders summary and bounded preview/absent-preview states; empty inference history; inference detail common and per-series data; unsupported stage makes no report request; structured 409 stage error; unknown invocation 404. The tests use mocked API functions and JSON-shaped fetch responses. |
| `src/api/reportErrorDisplay.test.ts` | Traceback text is replaced with safe guidance; Windows and Unix absolute paths are redacted. |
| `src/pages/RunsPages.test.tsx` | Existing Level 1 regression coverage for ML run listing, filtering and run/attempt detail behavior; it is not a substitute for the Level 2 reporting-specific tests. |

Test setup uses Vitest with jsdom (`vite.config.ts`); `package.json` scripts define test execution. Test responses are fixtures and do not prove that external services are running or that a live manifest has particular contents.

## Manual verification

Use three local processes. The frontend uses Vite's default development port 5173. The two API processes are independent and use their own configured ports:

| Process | Port | Example command from repository root |
| --- | ---: | --- |
| ML backend (Level 1 run discovery and details) | 8000 | `uvicorn app.main:app --app-dir ML_backend --port 8000` |
| Reporting backend (Level 2 reports) | 8001 | `uvicorn app.main:app --app-dir reporting_backend --port 8001` |
| Frontend | 5173 | From `frontend/`, `npm run dev` |

Configure `frontend/.env.local` from `.env.example` if needed:

```dotenv
VITE_ML_API_BASE_URL=http://127.0.0.1:8000
VITE_REPORTING_API_BASE_URL=http://127.0.0.1:8001
```

Then open the Vite URL and verify:

1. `/runs` lists runs from the ML service. Search and filters change the visible list locally.
2. Open a run. Its metadata and attempts load from ML; its reporting summary and invocation list load separately from reporting.
3. Open an attempt. Inspect the ML stage/execution hierarchy and the reporting status map. A completed Part A-D stage with a successful execution should expose an Open report link.
4. Open a stage report. Confirm the common envelope, stage summary/details, artifact metadata and any bounded preview. Refresh and observe the refresh state.
5. Open an inference invocation from the run reporting panel and inspect its summary, per-series results, skipped series and returned artifacts.
6. Stop or make the reporting service unavailable while keeping ML up. Run/attempt details should remain visible, with a reporting-specific error and retry action in the report panel.
7. Review the independent ML and Reporting health indicators in the app shell; those health checks do not replace report requests.

The reporting backend must have persisted manifests and matching result/artifact files for useful report content. Starting the processes alone does not create a sample run or guarantee completed stage/inference reports.

## Development verification commands

From `frontend/`:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

These are existing package scripts: `lint` runs ESLint, `typecheck` runs `tsc -b`, `test` runs Vitest, and `build` runs `tsc -b && vite build`. `dist/` and `tsconfig.tsbuildinfo` may be created by build commands and are generated outputs rather than maintained source files. They are not inputs to this guide's account of current report behavior.

## Known backend limits and Level 3 boundary

- Stage report endpoints support only `part_a`, `part_b`, `part_c`, and `part_d`. The attempt status projection may include other stages such as `inference_bootstrap`, but the frontend shows no detailed report link for those stages.
- A stage report requires a completed stage, successful execution ID, execution record, result file and a supported result schema. An incomplete stage is an unavailable report, not an empty successful report.
- Inference detail is available only for completed persisted invocations with a result snapshot whose invocation ID matches the manifest record. Missing, noncompleted or inconsistent records return structured backend errors.
- Artifact previews are bounded by backend configuration and selected by stage readers. There is no artifact download endpoint or frontend download behavior in the Level 2 source inspected here.
- Report details depend on the backend's persisted snapshot schema and the actual files/fields present. Readers can report unsupported or incomplete schemas and missing/corrupt artifacts as errors.
- Reports are read-only. Level 3 is the boundary for later training workflows, inference execution workflows, and any new interactive operations. Such functionality is not implemented by these report pages.

