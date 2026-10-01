# Frontend user guide

The Dashboard shows ML and Reporting health and links to the workflows. The frontend reads CSV files by **server-readable path**; the browser does not upload datasets. Use Guided Training to run and review Part A (dataset), Part B (preprocessing), Part C (features), and Part D (model training and inference bootstrap) one stage at a time. Quick Training configures A–D and bootstrap, then runs one synchronous pipeline request. Keep the tab open until it finishes.

Help is available at `/help`, with concise pages for each training part, bootstrap, inference, and runs/reports. Each Guided and Quick Training stage opens its guide in a separate tab. The Part B guide defines statuses -2 through 4; status lists accept comma-separated integers such as `2, 4`.

## Records and reports

**Run → Attempt → Stage → Execution** identifies persisted training work. A new attempt can use a different dataset, so enter its path again. Inference creates a separate **invocation** for each request. Keep these IDs when comparing results or requesting support. Runs & Models searches and filters the returned list locally, then renders 10 rows per page by default. The backend still returns **all runs** in one response; scalable loading needs a future backend limit/offset or cursor endpoint. Refresh explicitly to reload. Attempt and inference reports are read from persisted reporting data without rerunning ML.

## Inference

Verify an inference-ready run, then enter its run ID, a server-readable input path, and a positive `inference_days` count. The backend chooses the active training attempt. Process sequential input files in order because later calls depend on cached history. Inference does not retrain the model. Normal and late-data reconstruction behavior depends on bootstrap limits; `inference_days` cannot bridge missing history.

## Feedback and settings

Feedback is stored in this browser's localStorage only. It is **not sent to a server**. You can copy, export, or delete entries. Do not enter sensitive paths or payloads. Settings display configured API URLs, timeouts and theme. Environment changes require editing frontend environment variables and restarting Vite. Reporting outages do not prevent ML run details from appearing.
