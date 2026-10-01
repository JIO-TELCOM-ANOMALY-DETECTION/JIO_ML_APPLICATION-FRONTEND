# Level 3 - Guided Training Workspace and Part A

## Scope

Level 3 creates a reusable guided-training workspace and makes standalone Part A (EDA) executable from the frontend. It submits one synchronous ML workflow request and displays its persisted lifecycle response. Parts B, C and D are shown in the stage stepper as future levels; they cannot be selected or submitted. Quick Training and inference execution remain placeholders. No file is uploaded by the browser.

## Routes and architecture

Both `/training/guided` and `/training/guided/part-a` render the Part A workspace. The existing Guided Training navigation entry now opens `/training/guided`. Successful and failed workflow responses preserve `run_id` and `attempt_id` as URL search parameters so the workspace context survives reloads and can be shared.

The request path is:

```text
PartAWorkspacePage form
  -> buildEDARequest / validateEDAForm
  -> useMutation
  -> runEDA
  -> mlClient.post('/api/v1/eda/run', request, workflowTimeout)
  -> ML backend on port 8000
```

Part A execution uses `mlClient`, never `reportingClient`. On completion, links navigate to existing Level 1 run/attempt pages and the existing Level 2 Part A report route. The report route is offered only when the returned Part A execution is completed; the page may still show a report-unavailable response if the reporting backend has not yet indexed/persisted its report data.

## Reusable StageWorkspace

`src/components/training/StageWorkspace.tsx` provides the shared frame for guided A-to-B-to-C-to-D work: accessible Part A heading and explanation, four-step indicator, current status, run/attempt context, synchronous pending warning, error area, response/execution summary and links. The active form is rendered in its content area. Parts B-D are disabled and labelled as future functionality, with no navigation to unimplemented pages. Material UI breakpoints stack the form and context card on narrow screens.

`src/pages/PartAWorkspacePage.tsx` supplies Part A form and submission behavior. Keeping lifecycle context/status presentation in the workspace and Part A controls in its page lets later stage pages reuse the shell without replacing its base layout.

## Backend contract and endpoint

The implementation was checked against `ML_backend/app/api/eda.py`, `ML_backend/app/schemas/workflows/stage_requests.py`, `ML_backend/app/schemas/workflows/common.py`, `ML_backend/app/schemas/workflows/responses.py`, and `ML_backend/app/schemas/common/dataset.py`. The sole execution endpoint is:

```http
POST /api/v1/eda/run
```

It is called using `mlClient` configured with `VITE_ML_API_BASE_URL` (default `http://127.0.0.1:8000`). The backend rejects unknown request fields. The frontend uses separate workflow types in `src/api/workflowTypes.ts`; they are not mixed into the Level 2 report types.

The payload has this shape (conditional keys are intentionally absent when inactive):

```json
{
  "run_id": "optional-existing-run-id",
  "attempt_id": "optional-target-attempt-id",
  "run_metadata": { "employee_code": "E42", "employee_name": "Asha Rao", "run_name": "North cluster" },
  "dataset": {
    "input_file": "C:\\data\\telecom.csv",
    "columns": {
      "circle_column": "Jio_Circles", "cluster_column": "Jio_Cluster",
      "site_name_column": "AMF_Site_Name", "timestamp_column": "time",
      "value_column": "computedValue", "kpi_name_column": "kpiName",
      "server_type_column": "JIO_AMF_Server_Type", "consequent_value_column": "consequentValue",
      "bucket_type_column": "bucketType", "bucket_size_column": "bucketSize"
    },
    "bucket": { "bucket_type": "Minutes", "bucket_size": 15 },
    "single_kpi_name": "traffic",
    "expected_timeline": { "timeline_mode": "global_min_max" }
  }
}
```

### Execution modes and metadata

| UI mode | Request identifiers | Backend behavior |
| --- | --- | --- |
| New run | Omits `run_id` and `attempt_id` | Creates a run and a new attempt. |
| New attempt in existing run | Sends `run_id`; omits `attempt_id` | Resolves the run and creates a fresh attempt under it. |
| Target existing attempt | Sends both `run_id` and `attempt_id` | Resolves and targets that attempt. Run Management decides whether retrying Part A is legal. |

The client validates that an attempt ID cannot be used without a run ID and does not send unused optional IDs as empty strings. It does not override backend lifecycle protection: completed stage immutability and active-execution conflicts remain backend decisions. Backend Part A currently uses `run_metadata` when creating a new run. For an existing run (including a newly-created attempt or targeted attempt) it resolves the existing run and does not update its metadata; the form explains this behavior.

Metadata fields are optional and trimmed. Blank values are omitted. `employee_code` has a maximum of 128 characters; `employee_name` and `run_name` each have a maximum of 256. If supplied, whitespace-only values are not sent.

## Dataset input, mappings and conditional settings

### Server-readable CSV path

`dataset.input_file` is required and is sent as a string path. The control is a text input, not a file picker. The path must be readable by the ML backend process. With the current local Windows configuration that process can read a Windows path such as `C:\data\telecom.csv`. The frontend does not check file existence, read CSV bytes, discover headers, or upload a file. Backend validation remains authoritative for path existence/type, CSV extension, emptiness, encoding and content. For retrying an existing attempt the backend skips external-file preflight and uses its immutable attempt input copy, even though the request schema still requires `dataset.input_file`.

### Column mappings

Advanced configuration exposes every `DatasetColumnMapping` property and its backend default:

| Request field | Default |
| --- | --- |
| `circle_column` | `Jio_Circles` |
| `cluster_column` | `Jio_Cluster` |
| `site_name_column` | `AMF_Site_Name` |
| `timestamp_column` | `time` |
| `value_column` | `computedValue` |
| `kpi_name_column` | `kpiName` |
| `server_type_column` | `JIO_AMF_Server_Type` |
| `consequent_value_column` | `consequentValue` |
| `bucket_type_column` | `bucketType` |
| `bucket_size_column` | `bucketSize` |

All values are trimmed, required and pairwise unique, matching backend schema rules. Duplicate names produce field-level messages for both conflicting mappings. `server_type_column` and `consequent_value_column` represent optional source columns for analysis, but their mapping names remain required as part of the mapping object. The frontend does not inspect a CSV to confirm any header.

The derived required-column list updates from configured mappings and current selections. The always-required CSV columns are circle, cluster, site name, timestamp and value. `kpi_name_column` is added when `single_kpi_name` is omitted. Bucket type and size columns are added when request-level `bucket` is omitted.

### KPI identity

- CSV mode is the default: `single_kpi_name` is omitted and backend expects the configured KPI-name source column.
- Single-KPI mode includes the trimmed, required `single_kpi_name`; the backend no longer requires a KPI-name source column for that request.

### Bucket information

- CSV mode is the default and omits `dataset.bucket`; the source must then provide the configured bucket type and size columns.
- Request mode includes both `bucket_type` (trimmed, required string) and `bucket_size` (positive integer). The client never emits an empty or partial bucket object.

`bucket_type` is a free string. The UI does not invent or impose an enum.

### Expected timeline

Only the selected timeline fields are included in `expected_timeline`:

| `timeline_mode` | Required fields | Omitted fields |
| --- | --- | --- |
| `global_min_max` (default) | None | `expected_start`, `expected_end`, `num_days` |
| `date_range` | `expected_start`, `expected_end`, with end later than start | `num_days` |
| `num_days` | Positive integer `num_days` | `expected_start`, `expected_end` |

Changing the mode clears all three input values and their validation errors. Datetime controls use local wall-clock `datetime-local` strings and append seconds as `YYYY-MM-DDTHH:mm:ss`; no browser timezone conversion is applied. The backend's Pydantic datetime and cross-field validation remain authoritative.

## Response handling and lifecycle context

`src/api/workflowTypes.ts` models the backend's `StandaloneStageResponse` and its `StageExecutionSummary` entries. The response includes `status` (`completed`, `failed`, or `partially_completed`), `run_id`, `attempt_id`, `requested_stage`, `executions`, `message`, nullable `next_stage`, `inference_ready`, `summary`, and nullable structured `error`. Each execution has stage, execution ID, status, summary and nullable error detail.

The API layer validates the response shape, and the UI uses workflow `status` instead of treating all HTTP 2xx responses as successful. A 2xx response with `status: "failed"` is rendered as a failed workflow with its execution details and does not offer a Part A report link. A successful response prominently shows run/attempt/execution IDs, backend message and summary, returned next stage and Level 1/2 links. The returned `next_stage` is informational: the frontend never automatically starts Part B.

On any returned workflow response, the `run_id` and `attempt_id` are copied into workspace search parameters. The next step says Part B is for a later level and was not started. The backend can also return `partially_completed`; it remains visible with the returned executions/errors rather than being represented as fully completed.

## Long-running request, refresh and error behavior

### Per-request workflow timeout

`HttpClient` retains its 5,000 ms default for normal GET requests and health checks. `request`/`post` accept a per-request timeout; only `runEDA` uses `config.mlWorkflowTimeoutMs`. Configure:

```dotenv
VITE_ML_WORKFLOW_TIMEOUT_MS=1800000
```

The default is 1,800,000 ms (30 minutes). Configuration must parse as a positive finite number or frontend initialization fails with a configuration error. No backend timeout was changed. While the request is pending, the submit button is disabled, a synchronous progress state is shown, and the user is warned to keep the page open. There is no fake percentage progress, cancel button or claim of reliable continuation if the browser disconnects.

### Query invalidation

After a workflow HTTP-success response (including failed/partially-completed workflow statuses) or a request error that may have persisted state, the mutation invalidates the existing keys from `runKeys` and `reportKeys`:

- `runKeys.all`
- `runKeys.detail(run_id)`
- `runKeys.attempt(run_id, attempt_id)`
- `reportKeys.run(run_id)`
- `reportKeys.attempt(run_id, attempt_id)`
- `reportKeys.stage(run_id, attempt_id, 'part_a')`

No polling was added. Existing invalidated queries refetch according to TanStack Query behavior when active; the Part A page does not mount duplicate run/report data queries.

### Error display and unsaved form guard

Frontend validation covers the required path, conditional IDs, metadata limits, required/unique mappings, bucket fields, KPI name and timeline requirements. Errors are attached to fields before submission. HTTP errors preserve status and backend `error_code`; common cases are labelled as missing run/attempt (404), lifecycle conflict (409), request/file validation (422), timeout, network failure or general ML request failure. Public FastAPI errors use the structured `WorkflowErrorResponse` with `error.error_code`, `error.message` and safe `error.details`; sanitized allowlisted validation locations/messages are shown when present. Non-JSON server failures are handled as text/status errors.

Raw tracebacks are replaced with generic ML-log guidance, and Windows/Unix absolute paths in displayed error text are redacted. Workflow errors are labelled as ML workflow errors, separate from Level 2 reporting errors. Backend's own generic internal error messages remain as-is after path redaction when they are already safe.

The page registers browser `beforeunload` protection while the form is dirty or a request is pending. Reset after a response clears the dirty state. There is no client-side route blocker.

## Files created and modified

| File | Change and responsibility |
| --- | --- |
| `src/api/workflowTypes.ts` | New exact Part A request, response and execution types. |
| `src/api/edaApi.ts` | New defaults, validation, conditional request builder, ML POST and response-shape guard. |
| `src/api/edaApi.test.ts` | New focused request and validation tests. |
| `src/api/workflowErrorDisplay.ts` | New traceback and absolute-path sanitization for ML workflow messages. |
| `src/api/httpClient.test.ts` | Extended shared client coverage to verify a POST timeout override without changing the client default. |
| `src/components/training/StageWorkspace.tsx` | New reusable multi-stage workspace frame and structured workflow response view. |
| `src/pages/PartAWorkspacePage.tsx` | New Part A form, conditional UI, mutation, invalidation, query-string context and pending/error states. |
| `src/pages/PartAWorkspacePage.test.tsx` | New mocked-network page tests; no real workflow is called. |
| `src/App.tsx` | Guided base route now opens Part A; added explicit Part A route. Other future placeholders and reporting routes remain. |
| `src/api/httpClient.ts` | Added POST and request-specific timeout support; existing default GET timeout remains 5,000 ms. Structured backend `error_code` is now recognized. |
| `src/config/env.ts` | Added positive finite workflow-timeout setting with 30-minute default. |
| `.env.example` | Documents `VITE_ML_WORKFLOW_TIMEOUT_MS`. |
| `README.md` | Added link to this Level 3 guide and updated implemented-level summary. |

The changes are frontend-only. `ML_backend` and `reporting_backend` contracts were inspected read-only; neither backend was modified.

## Test coverage

`src/api/edaApi.test.ts` verifies new-run omission/defaults, server path trimming and required validation, optional metadata omission, existing-run/retry identifiers, no attempt without a run, duplicate/empty mappings, request-level versus CSV bucket construction, KPI source selection, global/date-range/num-days conditional fields, date ordering, positive days, and omission of stale fields from the selected timeline payload.

`src/pages/PartAWorkspacePage.test.tsx` verifies page defaults, required server-readable path, mocked new-run POST payload, result IDs and correct run/attempt/Part A report links, query-string context, disabled duplicate submission while pending, HTTP-2xx failed workflow rendering, and safe structured HTTP 409 and 422 errors. `src/api/httpClient.test.ts` also verifies that the per-request workflow timeout is independent from the client's default timeout. Existing Level 0-2 tests remain in place and the complete suite is run during verification.

## Manual verification

1. Start the ML backend from the repository root: `uvicorn app.main:app --app-dir ML_backend --port 8000`.
2. From `frontend/`, install/configure as usual, set `VITE_ML_API_BASE_URL=http://127.0.0.1:8000`, optionally set `VITE_ML_WORKFLOW_TIMEOUT_MS=1800000`, then run `npm run dev` (Vite default port 5173).
3. Visit `/training/guided` or `/training/guided/part-a`, inspect defaults and derived required columns, then enter a CSV path readable by the backend process. Do not select a browser file; none is uploaded.
4. For a safe integration run, use a disposable test CSV and select New run. Confirm the synchronous loading warning/button disable, response IDs/status/execution/summary, URL search parameters and run/attempt/report links.
5. Separately verify existing-run and target-attempt modes with known valid IDs. Backend lifecycle state may correctly reject a completed Part A or an active execution; the frontend displays that response and does not attempt to bypass it.
6. Verify validation without making requests: leave path blank; create duplicate column mappings; test invalid date ordering and nonpositive number fields. Switch timeline modes and confirm irrelevant controls clear.
7. Test timeout/network/422 errors only with appropriate mocked tests or a controlled non-production service. Do not start a real training run for automated verification.

The backend must be able to read and validate the supplied CSV. Selecting a new run persists backend state and performs real EDA; do not use the manual new-run step against production data without intending that side effect.

## Deferred functionality and backend limitations

- Parts B, C and D are future steps only. No Part B-D endpoint is called and Part A completion does not chain into another stage.
- Quick Training and inference execution remain unimplemented.
- There is no multipart upload endpoint in the current backend contract. The backend accepts `dataset.input_file` as a path readable by the backend process.
- New-attempt Part A validates and copies the supplied CSV before execution; retrying an existing attempt uses its immutable input copy and skips external file preflight.
- Run metadata is consumed when creating a new run. Existing run metadata is not updated by this Part A workflow.
- Run Management is authoritative for retry legality, completed-stage immutability and active execution conflicts. Part A can return an HTTP error before a standalone response exists, and runner/contract failures after execution creation can instead be returned as HTTP 2xx with `status: "failed"`.
- EDA is synchronous. The frontend request timeout is configurable, but a browser timeout/disconnect does not prove the backend stopped processing or guarantee the UI can recover the response.

