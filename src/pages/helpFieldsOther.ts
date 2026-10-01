import { field as f, type HelpFieldSections } from './helpFieldTypes';
import { partDFields } from './helpFieldsD';

export const otherFields: Record<string, HelpFieldSections> = {
  'training/inference-bootstrap': { bootstrap: partDFields.bootstrap },
  'training/quick': {
    'run-setup': [
      f('Run mode', 'Create new run registers a new run and its first attempt. Create new attempt attaches a fresh attempt to an existing run; Quick Training cannot overwrite an earlier attempt.', 'Choose Create new attempt under existing run when comparing a changed configuration.', 'Create new run'),
      f('Existing run ID', 'Identifies the existing run that will receive a new attempt. The form verifies the ID before submission; an unknown ID blocks the request.', 'Paste a run ID from Runs, verify it, then review the new attempt in that run.'),
    ],
    review: [
      f('Review and run', 'Sends the configured Parts A through D and bootstrap as one synchronous request. Keep this page open while it runs; a failed later stage can leave earlier stages persisted.', 'If Part C fails, copy the returned run and attempt IDs and inspect that attempt before continuing.'),
    ],
  },
  inference: {
    'select-run': [
      f('Run ID', 'Identifies the run whose active inference-ready attempt the backend will use. Verify displays readiness and the selected attempt; this form does not pick an attempt itself.', 'Paste a completed run ID and press Verify before entering the inference file.'),
    ],
    execute: [
      f('Server-readable CSV path', 'Absolute or server-relative path that the ML backend can read. A file on this browser machine is not uploaded. The backend applies the saved mapping and history policy from the selected attempt.', 'Enter a path mounted on the ML server, then confirm it in Request review.'),
      f('Inference days', 'Positive whole-day forward span requested for the incoming file. It must agree with the actual chronological data; increasing it does not create missing observations or bypass saved gap limits.', 'For two consecutive daily files, submit one day at a time in order; for a combined two-day file, request 2.'),
    ],
  },
  'runs-and-reports': {
    browse: [
      f('Search employee, run name or run ID', 'Filters the already loaded run list in this browser by these identifiers. Clearing it restores the full loaded list; it does not alter stored runs.', 'Enter part of an employee name to find that employee\'s visible runs.'),
      f('Status', 'Limits the visible runs to one lifecycle status. All statuses removes this filter; it does not change a run\'s persisted status.', 'Choose completed to review finished runs.', 'All statuses'),
      f('Inference readiness', 'Shows all runs, only runs ready for inference, or only runs that are not ready. Readiness reflects the backend state after training and bootstrap.', 'Choose Ready before opening a run for inference.', 'All'),
      f('Rows per page', 'Changes how many already loaded runs appear on each browser page. It does not change the backend response or delete other runs.', 'Choose 25 to inspect more run cards at once.', '10'),
    ],
  },
};
