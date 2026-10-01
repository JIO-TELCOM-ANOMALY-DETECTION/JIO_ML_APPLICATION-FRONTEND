# Level 6: Quick Training

Quick Training is available at `/training/quick`. It configures one complete A → B → C → D → inference bootstrap attempt. Guided Training remains available for running and recovering individual stages.

## Runs and request

New run mode omits `run_id` and sends nonempty `run_metadata` fields (`employee_code`, `employee_name`, `run_name`). Existing run mode verifies a directly entered ID through the run detail endpoint and sends `run_id` without metadata. Both modes create a **new attempt**. The request never contains `attempt_id`, and Quick Training cannot overwrite an existing attempt. The page does not fetch the unpaginated runs list to select a run.

The typed builder sends `dataset`, `preprocessing`, `training`, and optional `feature_engineering` and `inference_bootstrap` to `POST /api/v1/pipeline/run` through `mlClient` with the existing workflow timeout. The backend requires the preprocessing and training wrappers, and `preprocessing.outlier` is required even when every other Part B setting uses a backend default. The default wrapper sends `{ "outlier": { "method": "global_iqr", "direction": "lower_only", "iqr_multiplier": 1.5 } }`; other selected outlier methods retain only their compatible fields. Part A uses a server-readable CSV path, physical column mappings, bucket and KPI mode, and expected timeline. The browser does not upload the file.

Part B supports outlier choices, valid value limits, series usability, custom contiguous gap ranges, phases 1–4, and intermediate outputs. It reuses the Guided Part B validator and payload builder. Part C uses the existing field-level feature editors and supports backend defaults, an edited XGBoost or Isolation Forest profile, or all 14 custom feature types. The backend-default mode omits `feature_engineering`; the pipeline backend then chooses a profile from `training.model_type`. An edited profile must match the selected Part D model. Custom feature lists are preserved when switching the Part D model. Part D reuses the Guided training form and builder, including direct, fixed candidate, and Optuna strategies and strict decimal parsing.

Inference bootstrap accepts `max_gap_days` (integer at least 0), `max_gap_ratio` (0–1), and `late_data_reconstruction_enabled`. Its backend defaults are 0, 0.0, and true. This stage prepares history and gap policy for later inference; it does not run inference on new data. Internal cache calculations remain backend-owned.

## Execution and recovery

The endpoint is synchronous. Keep the tab open until it returns. There is no job ID, progress percentage, cancellation, polling, or reliable reconnection. A browser timeout or network error can leave the server attempt in an uncertain state; inspect run details before starting another pipeline. The frontend does not retry a pipeline POST automatically.

The result shows each returned stage, identifiers, available summary, and sanitized errors. Full success reports `inference_ready=true` and `next_stage="inference"`. A failure stops at the failing stage; earlier completed stages can remain persisted, and a later failure can return `partially_completed`. The page links to run and attempt details, available completed-stage reports, and the Guided stage for recovery. Part A goes to Guided A, Part B to B, Part C to C, and Part D or bootstrap to D, preserving run and attempt IDs. A failed pipeline is never resubmitted automatically. Structured error text and summary values are sanitized before display; reporting query failures do not replace the ML result.

Level 7 will provide actual inference execution on new data. The current `/inference` route is a placeholder.
