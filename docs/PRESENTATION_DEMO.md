# Presentation demo

1. Start the ML API, Reporting API, and Vite frontend using the project's existing service instructions. Do not run training until a demo execution is intended.
2. Check both health badges on the Dashboard.
3. Show the Dashboard workflow: Dataset → A → B → C → D → bootstrap → Inference.
4. Open Guided Training, inspect Part A and its new-tab settings guide, then show the guides for Parts B–D.
5. Open Quick Training and show each stage guide and the final synchronous review. Explain that its pipeline sends one request.
6. Open Runs & Models. Show search, filters, 10-row pagination, a run, its attempts, and reports. Page changes do not request the list again.
7. Verify an inference-ready run and its active training attempt.
8. For an authorized live demo, use `demo_data/end_to_end_demo/inference_01.csv` at a path readable by the ML server and execute inference. Continue with `inference_02.csv` through `inference_05.csv` in order if needed. The frontend does not upload the files.
9. Open the inference invocation report and show its invocation ID.
10. Open Feedback, save a nonsensitive sample, then copy or export it. Explain that entries remain in this browser only.
11. Explain limitations: all runs arrive in the initial backend response; training is synchronous; reporting reads persisted results; no feedback backend exists; inference does not retrain.

Do not modify the demo datasets. Reuse an existing training run where possible during a presentation.
