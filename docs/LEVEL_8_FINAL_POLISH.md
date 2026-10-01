# Level 8 final polish

Guided Part B now keeps all Prophet settings before its action button. Guided and Quick Training share the same Phase 4 editor. Part C status inputs accept comma-separated supported integers and show the complete status legend. Runs render 10 records initially with client-side pagination, filters before slicing, and a 30-second runs-query stale time. The backend still sends all runs; a server pagination endpoint is needed for scalable transfer.

Help provides an index and focused routes for Parts A–D, bootstrap, inference, and runs/reports. Training help buttons open a new tab with `noopener noreferrer`. The Dashboard explains the workflow, Settings shows read-only environment values, and Feedback stores entries only in browser localStorage with copy/export/delete controls. No feedback submission endpoint is used.

Known backend limits remain: synchronous training, no browser upload, and no server-side runs pagination. The production build currently reports one 802.43 kB JavaScript chunk above Vite's 500 kB warning threshold. Route splitting was left for a separate change to avoid disturbing established training routes during this polish pass.
