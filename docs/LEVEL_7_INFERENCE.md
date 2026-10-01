# Level 7: Inference execution and history

## Route and request

`/inference` accepts an optional `?run_id=...` prefill. The user must still verify it with `GET /api/v1/runs/{run_id}`. The page does not load the complete runs list. The run must report `inference_ready=true`; training and inference bootstrap must finish first. The active inference attempt is selected by the ML backend and shown read-only. The frontend cannot select an attempt.

The synchronous `POST /api/v1/inference/run` request uses the existing ML client and workflow timeout (30 minutes by default). It sends exactly:

```json
{"run_id":"run-1","input_file":"incoming/data.csv","inference_days":1}
```

`run_id` follows the backend's 1–96 character identifier format. `input_file` is a server-readable CSV path, trimmed at its edges. A browser-local file selection does not upload data. `inference_days` must be a whole integer at least 1; an empty field is invalid. The page does not expose training or bootstrap settings.

Keep the page open while the request runs. There is no background job, progress percentage, automatic retry, or cancellation API. A browser disconnection or timeout does not establish whether the backend completed. Refreshing the page never resubmits.

## Responses and reports

The ML response has `status` (`completed`, `failed`, or `cancelled`), `run_id`, `training_attempt_id`, `invocation_id`, `stage` (`inference`), `message`, `summary`, and `error`. A successful HTTP response can still describe a failed or cancelled workflow. The page displays the three returned identifiers immediately with copy controls, sanitized summary and error details, and links to the run, attempt, and existing Level 2 inference report at `/runs/:runId/inference/:invocationId`.

For every verified run, `GET /api/v1/reports/runs/{run_id}/inference` shows the persisted invocation list. A run may have multiple invocations, each with its own ID, status, timestamps, metrics, and report link. Reporting failure stays separate from ML verification and execution. After an ML response, relevant run, attempt, reporting summary, invocation list, and report queries are invalidated.

HTTP errors distinguish schema errors, missing runs or files, lifecycle conflicts, and input or history validation where the backend provides such detail. Network failure and timeout have separate labels. Structured codes, field locations, and safe details are retained. Tracebacks, stack frames, and internal absolute paths are sanitized before display.

## Saved contract and late data

Inference uses the selected training run's saved dataset mappings, bucket, preprocessing, feature, model, and history contracts. Normal forward data extends inference history. Supported late data within the maintained reconstruction window may trigger reconstruction if the saved bootstrap policy allows it. Older late data may be ignored. The inference workflow never retrains the model. The frontend has no switches to override the frozen history or reconstruction contract.

## Remaining polish

Final pagination, help content, and hyperparameter explanations remain outside Level 7. Invocation history is a compact list and has no frontend pagination.
