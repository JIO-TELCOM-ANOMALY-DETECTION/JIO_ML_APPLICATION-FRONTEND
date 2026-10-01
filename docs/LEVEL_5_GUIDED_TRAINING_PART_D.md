# Level 5: Guided Training Part D

## Route and prerequisites

Open `/training/guided/part-d?run_id=...&attempt_id=...` after Part C completes. Eligibility comes from the persisted attempt returned by the ML backend, so a refreshed or directly opened URL works. The guide and attempt details page preserve both identifiers across Parts A–D. Invalid or missing identifiers provide links to Runs and Part A.

## Configuration

Basic settings choose XGBoost or Isolation Forest, lower/upper/both threshold direction, and direct, fixed candidate, or Optuna training. Advanced settings are collapsed by default. The form sends `training` to `POST /api/v1/training/run` with the two identifiers. It never sends settings for a hidden strategy or another model.

Advanced controls are optional. Omitted direct hyperparameters use the backend single default. Omitted fixed candidates use the backend complete default candidate list. Omitted Optuna search space and controls use the backend default search and trial settings. If supplied, direct and candidate sets must contain all eight XGBoost or all five Isolation Forest fields; search spaces must contain every parameter. Candidates can be added, removed, edited, and moved up. XGBoost uses numeric Optuna ranges. Isolation Forest uses an integer range for `n_estimators`, categorical choices for `max_samples`, `contamination`, and `bootstrap`, and a float range for `max_features`.

Optional split percentages cover train, validation, calibration, and test for tuned XGBoost; train, calibration, and test for direct XGBoost; train, validation, and test for tuned Isolation Forest; train and test for direct Isolation Forest. Supplied shares must be positive and total 100. Validation is required only with tuning. These shares apply after Part C's history reservation. XGBoost tuning supports distinct MAE/RMSE selection metrics, estimator count, and early stopping. Its residual quantile is a decimal fraction strictly between 0.5 and 1. Isolation Forest uses the backend's `score_separation` selection metric and has no residual calibration. Minimum usable rows are 1,000 train, 400 validation when tuning, 400 test, and 400 XGBoost calibration.

## Lifecycle and results

The synchronous endpoint runs Part D training and then inference bootstrap. It does not execute inference. The page shows separate response executions, persisted stage timestamps and metrics, and sanitized errors. An attempt is shown as inference ready only when the backend says `inference_ready=true`. A completed Part D followed by failed bootstrap can be resumed on the same attempt; a failed Part D can be retried. Completed Part D plus completed bootstrap is immutable. Training again starts at Part A in existing run/new attempt mode with the run ID and no attempt ID.

The Part D result links to run and attempt details and the completed Part D report. Inference execution remains a Level 7 placeholder. Quick Training remains a later level; the typed payload builder and form are reusable there.

Workflow POSTs use `VITE_ML_WORKFLOW_TIMEOUT_MS`; ordinary GETs retain their normal timeout. A client timeout does not prove the backend stopped, so refresh attempt details before retrying. Lifecycle conflicts, validation errors, network errors, and structured workflow failures are displayed with traceback and absolute path sanitization.
