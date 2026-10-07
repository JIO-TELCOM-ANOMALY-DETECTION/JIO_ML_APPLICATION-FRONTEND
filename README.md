# Telecom KPI Anomaly Detection — Frontend

React and TypeScript workspace for configuring, executing, tracking and reporting on the Telecom KPI Anomaly Detection and Monitoring Platform.

Developed by Aditya Pramod Pawar under the mentorship of Sanjana Chaudhary.

## Workflows and service connections

The UI calls the [ML backend](https://github.com/Bored-Pawar/ML_Backend_JIO) for training, inference, health and run/attempt tracking. It calls the [reporting backend](https://github.com/Bored-Pawar/REPORTING_BACKEND_JIO) for saved reports, summaries and result exploration. Start both services separately; reporting needs filesystem access to ML run storage.

- **Guided Training:** configure and execute Part A EDA, Part B preprocessing, Part C features and Part D model training in stage workspaces. Inspect outcomes and use supported stage recovery before proceeding.
- **Quick Training, new run:** submit to `POST /api/v1/pipeline/master-pipeline-request-acknowledgement-return`. CSV validation precedes acknowledgement, which supplies a run ID, `status: "created"`, and a null attempt ID. Training continues in the backend process. The tracker polls run/attempt state every two seconds while work is active, shows stage progress, and links to attempt review and inference when ready.
- **Quick Training, existing run:** submit to `POST /api/v1/pipeline/run` with the run ID. This synchronous mode creates a fresh attempt; keep the page open for the response. It does not resume a failed attempt.
- **Run tracking and inference:** explore runs/attempts, inspect lifecycle and model readiness, execute inference with saved artefacts, and review invocation history.
- **Report exploration:** inspect Part A–D reports and inference summaries; explore anomaly-first result pages with identity/KPI/status filters, date/time bounds, sorting and pagination. Switch to all results to include normal observations.
- **Help:** application workflow guides and field help complement the local documentation.

The UI guards duplicate pending submissions. Training mutations never automatically retry or resubmit. After timeout/network uncertainty, check Runs & Models before submitting again: a run may exist even if acknowledgement was lost. Acknowledgement confirms acceptance, not completed training. Backend background work is in-process, has no restart guarantee and does not support cancellation.

## Stack and layout

React 19, TypeScript, Vite 7, Material UI/Emotion, React Router, TanStack Query and React Hook Form. Vitest, jsdom and React Testing Library test workflows; ESLint checks source quality. [package.json](package.json) declares scripts/dependencies and `package-lock.json` records resolved versions.

```text
src/main.tsx, App.tsx   Application entry and routes
src/pages/             Training, runs, inference, reports and help
src/components/        Common UI, training editors/tracker and report panels
src/api/               Clients, builders, query hooks and types
src/config/env.ts      Validated API URLs and workflow timeout
src/test/              Test setup; tests also live beside source
public/                Static assets
docs/                  User guide, demo and implementation notes
vite.config.ts         Vite and Vitest configuration
.env.example           Development API configuration
```

## Setup and development

Prerequisites: Node.js 20.19+ within Node 20, or Node.js 22.12+ (Vite's engine range is `^20.19.0 || >=22.12.0`), npm, and running backends for live workflows. Run from this repository root.

PowerShell:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Copy the example when creating a new configuration; preserve an existing `.env.local`. On POSIX shells use `cp .env.example .env.local`.

The example contains:

```dotenv
VITE_ML_API_BASE_URL=http://127.0.0.1:8000
VITE_REPORTING_API_BASE_URL=http://127.0.0.1:8001
VITE_ML_WORKFLOW_TIMEOUT_MS=1800000
```

Both base URLs are required outside test mode. Use service origins without `/api/v1`; clients append route paths. The optional workflow timeout defaults to 1,800,000 ms (30 minutes) and must be a positive finite number. It changes client waiting time, not backend durability/cancellation.

Vite defaults to development port **5173** and can select another available port if occupied. Open `http://localhost:5173` or the printed URL. Select a host/port explicitly with:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Change `--port` to change the frontend listener. Change the corresponding API URL in `.env.local` and restart Vite to change a backend address. These variables are embedded at build time; rebuild for changes to a built application's service URLs. They are public browser configuration and must not contain secrets.

## Backend and CORS setup

In separate terminals, from each backend repository root with its Python environment active:

```powershell
# ML backend terminal
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# Reporting backend terminal
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Follow each backend README for dependencies and environment/data paths. Reporting requires a correct `ML_RUNS_ROOT` and an explicit listener port; its settings alone do not configure Uvicorn.

ML hard-codes CORS for `http://localhost:5173` and `http://127.0.0.1:5173`. Reporting defaults to those origins and permits changes through `CORS_ALLOWED_ORIGINS`, but its `.env.example` specifies port 3000. Match the running frontend origin. A different ML frontend origin requires a separately authorized backend code change. Vite has no API proxy configured; calls go directly to the configured services.

Backend documentation is at `http://127.0.0.1:8000/docs` and `http://127.0.0.1:8001/docs` (also `/redoc` and `/openapi.json`). The frontend exposes no Swagger/OpenAPI. Health checks call each backend's `/health` independently.

## Build and verification

```powershell
npm run lint
npm run typecheck
npm run test -- --run
npm run build
npm run preview
```

`npm run test` starts watch mode; `-- --run` performs one run. Tests cover request builders, API errors and UI workflows. `build` checks TypeScript and creates output in `dist/`. `preview` serves the local build (Vite's default preview port is 4173); it is a local inspection command, not a documented production deployment.

## Troubleshooting and limitations

- Missing environment variable: set both API origins in `.env.local` and restart Vite.
- Network/CORS error: check backend health, host/port and browser-origin allow-lists. Use `--strictPort` to prevent Vite silently selecting another port.
- Dataset not found: entered paths must be readable by the ML backend; a browser-local path is not an upload to a remote server.
- Uncertain Quick Training response: inspect runs before manually submitting again. Retry tracking when a known run cannot refresh.
- Incomplete report: verify the selected execution completed and reporting can read saved artefacts.
- `spawn EPERM` during Vite/Vitest startup: the environment may block esbuild/test subprocesses; use an environment that permits them.

## Information Needed / Assumptions

No Docker/Compose files or production hosting configuration were found. Confirm the intended hosting strategy and backend deployment/storage layout; these instructions cover local development.

## Documentation

- [User guide](docs/USER_GUIDE.md) and [presentation demo](docs/PRESENTATION_DEMO.md)
- [Help-system maintenance](docs/HELP_SYSTEM.md)
- [Foundation](docs/LEVEL_0_FOUNDATION.md), [runs and models](docs/LEVEL_1_RUNS_AND_MODELS.md), and [reporting](docs/LEVEL_2_REPORTING.md)
- Guided Training: [Part A](docs/LEVEL_3_GUIDED_TRAINING_PART_A.md), [Parts B/C](docs/LEVEL_4_GUIDED_TRAINING_PARTS_B_C.md), and [Part D](docs/LEVEL_5_GUIDED_TRAINING_PART_D.md)
- [Quick Training](docs/LEVEL_6_QUICK_TRAINING.md), [inference](docs/LEVEL_7_INFERENCE.md), and [final polish](docs/LEVEL_8_FINAL_POLISH.md)

Some notes describe earlier milestones. Use this README, local source and backend OpenAPI for current endpoint behaviour.
