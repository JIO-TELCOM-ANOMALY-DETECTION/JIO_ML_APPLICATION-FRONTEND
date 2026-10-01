# JIO Telecom Anomaly Detection Frontend

React frontend for the JIO telecom anomaly-detection application. Levels 0–7 cover the foundation, runs, reporting, Guided Training Parts A–D, Quick Training, and inference execution/history.

## Documentation

- [V1 Help system and maintenance](docs/HELP_SYSTEM.md)

- [Level 0 - Frontend Foundation](docs/LEVEL_0_FOUNDATION.md)
- [Level 1 - Runs & Models](docs/LEVEL_1_RUNS_AND_MODELS.md)
- [Level 2 - Reporting and Results Review](docs/LEVEL_2_REPORTING.md)
- [Level 3 - Guided Training and Part A](docs/LEVEL_3_GUIDED_TRAINING_PART_A.md)
- [Level 4 - Guided Training Parts B and C](docs/LEVEL_4_GUIDED_TRAINING_PARTS_B_C.md)
- [Level 5 - Guided Training Part D](docs/LEVEL_5_GUIDED_TRAINING_PART_D.md)
- [Level 6 - Quick Training](docs/LEVEL_6_QUICK_TRAINING.md)
- [Level 7 - Inference execution and history](docs/LEVEL_7_INFERENCE.md)

## Prerequisites

- Node.js 20.19+ or 22.12+ and npm
- ML backend and reporting backend started manually when checking live health

## Install and configure

```bash
npm install
Copy-Item .env.example .env.local
```

Set `VITE_ML_API_BASE_URL` and `VITE_REPORTING_API_BASE_URL` in `.env.local`. Defaults in `.env.example` are based on the existing project contract: ML `http://127.0.0.1:8000`, reporting `http://127.0.0.1:8001`.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

## Backend health verification

From the repository root, start ML with `uvicorn app.main:app --app-dir ML_backend --port 8000`. Start reporting with `uvicorn app.main:app --app-dir reporting_backend --port 8001` from the repository root. Open the Vite URL printed by `npm run dev`; the top bar and dashboard show independent health checks and refresh them every 30 seconds. Use the refresh icon for an immediate check. Directly verify each service with `Invoke-WebRequest http://127.0.0.1:8000/health` and `Invoke-WebRequest http://127.0.0.1:8001/health`.

The backend applications enforce CORS. Their current source configurations allow the local Vite origins `http://localhost:5173` and `http://127.0.0.1:5173`; the reporting allow-list is configurable. If a browser still reports a CORS/network error, check that the configured frontend origin matches the backend allow-list and that the API process is listening at the configured API URL. CORS permission does not make either backend listen on the Vite frontend port. The frontend only sends requests and does not configure backend CORS.




