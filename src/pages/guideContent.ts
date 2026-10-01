import { helpFields, type HelpField } from './helpFieldContent';

export type HelpSection = { id: string; title: string; body: string[]; fields?: HelpField[]; related?: string[] };
export type HelpGuide = { title: string; purpose: string; sections: HelpSection[] };
const section = (id: string, title: string, body: string[], related?: string[]): HelpSection => ({ id, title, body, related });

export const guides: Record<string, HelpGuide> = {
  'training/part-a': {
    title: 'Part A - Dataset',
    purpose: 'Create an attempt, describe the CSV, and identify the expected timestamp grid.',
    sections: [
      section('run-selection', 'Run and attempt selection', [
        'Choose where this training attempt belongs before submitting the dataset. Record the returned run ID and attempt ID; the later Guided stages need both.',
      ]),
      section('dataset', 'CSV, KPI, and bucket', [
        'The CSV path is read by the ML service. This form does not upload a browser file. A bucket of 15 Minutes means one expected observation every 15 minutes; the bucket also converts later minute-based preprocessing and feature windows into point counts.',
      ]),
      section('timeline', 'Expected timeline', [
        'The timeline mode decides where the expected grid starts and ends. At 15-minute resolution, an explicit interval from 2026-01-01T00:00 through 2026-01-01T01:00 expects 00:00, 00:15, 00:30, 00:45, and 01:00. If 00:30 is absent, it is identified as a missing timestamp and inserted during downstream timeline correction with status -2.',
        'Use the same clock basis for the CSV and date-time controls. The browser sends local ISO date-time values without timezone conversion.',
      ]),
      section('column-mappings', 'Column mappings', [
        'These are physical CSV header names. Change a mapping when the source header differs from the displayed default. Required names must exist in the CSV, and all mappings must be unique; optional source columns may be absent.',
      ]),
      section('result', 'Read the result', [
        'Inspect the Part A report for timestamp integrity, missingness, KPI splits, and validation messages. A completed Part A leads to Part B. Create another attempt to train with a changed dataset.',
      ], ['training/part-b']),
    ],
  },
  'training/part-b': {
    title: 'Part B - Preprocessing',
    purpose: 'Correct the timeline, label outliers, and fill missing values in ordered phases.',
    sections: [
      section('outliers', 'Outliers and series eligibility', [
        'For IQR methods, the lower boundary is Q1 - multiplier * IQR and the upper boundary is Q3 + multiplier * IQR. The global method calculates these once per site. The centered method calculates row-aligned boundaries from a centered rolling window of original-valid values, where enough valid observations exist. The selected direction decides which final boundary is active. Equality to a boundary is not an outlier.',
        'A larger multiplier moves both IQR boundaries outward and generally flags fewer points. A smaller one flags more. User bounds replace the IQR calculation with explicit site-independent limits.',
      ]),
      section('valid-values', 'Physical validity and timeline correction', [
        'Physical validity is separate from statistical outlier detection. A value outside the allowed physical range can become missing before the filling phases. A duplicate site-timestamp retains its first physical row; a timestamp off the resolved bucket grid is rejected. These two timeline strategies are fixed, not editable.',
      ]),
      section('gaps', 'Gap profile', [
        'Gap ranges count missing points, not minutes. At 15-minute resolution two points span two expected samples; at 5-minute resolution the same two points cover a shorter interval. Custom ranges must begin at 1, be contiguous and non-overlapping, and end with an open-ended phase_4_pass_2. For example: 1-2, 3-4, 5-6, 7-8, 9+.',
      ]),
      section('phase-1', 'Phase 1: nearby anchors', [
        'An anchor is a trusted nearby observed value used to estimate a missing point. Phase 1 first seeks local evidence on both sides. More search distance can find more candidates, but those candidates may describe less-local behavior. A highly unbalanced pair has one anchor much farther away than the other; the distance ratio limits that imbalance.',
      ]),
      section('phase-2', 'Phase 2: recent and last-week evidence', [
        'Phase 2 combines a recent timestamp with the same weekday/weekend type and an exact last-week reference. The weights are fractions of one combined estimate, so they must sum to 1. Optional neighbor offset chooses how far to search around a seasonal timestamp.',
      ]),
      section('phase-3', 'Phase 3: multi-day seasonal medians', [
        'Phase 3 searches earlier matching day types and uses clean values around the target clock time. Later levels widen the half-window or relax the day match. Increasing lookback can find more reference values but can also use older behavior.',
      ]),
      section('prophet', 'Phase 4: Prophet', [
        'Phase 4 runs two ordered long-gap passes when enabled. The past-only model is preferred; optional full-series fallback can fill when the past-only model is unavailable or fails, and those fallback fills carry risk status 4. Review these fills before using the data for features.',
      ]),
      section('statuses', 'Status values and Part C', [
        '-2 = inserted timestamp; -1 = invalid value converted to missing/NaN; 0 = missing value; 1 = valid original value; 2 = detected outlier; 3 = safely filled value; 4 = risk-filled value. In status-list inputs, 2, 4 means two separate status codes. Part C uses these codes to select cleaned history, point-cleaning targets, and baseline anchors.',
      ], ['training/part-c']),
    ],
  },
  'training/part-c': {
    title: 'Part C - Feature engineering',
    purpose: 'Choose a profile or build the ordered feature columns used by training and inference.',
    sections: [
      section('modes', 'Choose a feature mode', [
        'The backend default profile is tied to a model hint. Editable profile mode starts from that model profile and sends its changed settings. Custom mode sends your explicit feature list. Match the selected profile to the Part D model.',
        'In custom mode, choose New feature type, click Add feature, configure the card, then use Move up, Move down, or Remove. Changing Feature type resets that card. Feature order can change collision-resolved output names, so review the Part C report after reordering.',
      ]),
      section('feature-types', 'Custom feature types', [
        'The builder offers 14 feature types. Lags and rolling windows count points; minute-based controls are resolved using the Part A bucket. Longer lookbacks reduce available early training rows and raise the history required at inference.',
      ]),
      section('history', 'Value sources and point cleaning', [
        'raw_value uses source observations. corrected_history uses the cleaned history assembled from Part B statuses and the settings below. Local median point cleaning is available for raw_value lag-style features only. Choose accepted statuses that should supply replacement evidence and bad statuses that should be treated as suspect.',
      ]),
      section('baseline', 'Weighted seasonal baseline', [
        'A baseline estimates the expected value from recent and weekly seasonal references; a residual compares the observed value with that baseline. Larger lookbacks can help when close references are missing, but require more history.',
      ]),
      section('profile-controls', 'Editable default profiles', [
        'The profile controls expand or remove generated feature columns. Turning on a longer lag or rolling window raises required history; changing source or cleaning changes which values enter those features.',
      ], ['training/part-d']),
    ],
  },
  'training/part-d': {
    title: 'Part D - Model training',
    purpose: 'Fit and validate a model, then prepare a completed attempt for inference.',
    sections: [
      section('model', 'Model and strategy', [
        'Direct configuration fits one parameter set. Fixed candidate tuning compares several complete sets. Optuna samples a bounded search space for a configured number of trials. Search takes longer than one direct fit and needs validation rows.',
      ]),
      section('parameters', 'Model hyperparameters', [
        'These controls change model capacity, sampling, and regularization. Higher capacity can fit more detail but can overfit; tighter regularization and smaller samples can reduce sensitivity. Review validation and test metrics before selecting a trained attempt.',
      ]),
      section('validation', 'Splits, tuning, and calibration', [
        'Split controls are percentages totaling 100, not decimal fractions. Feature history removes early rows before splitting. The form reports minimum usable rows: train 1,000; validation 400 when tuning; test 400; and XGBoost calibration 400.',
      ]),
      section('bootstrap', 'Inference bootstrap', [
        'After Part D succeeds, bootstrap prepares saved history and cache for later inference. This does not score new data. The backend marks an attempt inference-ready only after bootstrap succeeds.',
      ], ['training/inference-bootstrap', 'inference']),
    ],
  },
  'training/inference-bootstrap': {
    title: 'Inference bootstrap', purpose: 'Set the saved history and continuity policy for future inference.',
    sections: [section('bootstrap', 'Bootstrap controls', [
      'The selected trained attempt stores gap limits and late-data policy during bootstrap. Both gap limits must pass when a future inference file starts after saved history. Raising a limit permits a larger bridge but cannot create missing observations.',
    ], ['training/part-d', 'inference'])],
  },
  'training/quick': {
    title: 'Quick Training', purpose: 'Send Parts A-D and bootstrap in one synchronous request.',
    sections: [
      section('run-setup', 'Run setup', ['New run creates a run and attempt. New attempt supplies an existing run ID and creates a fresh attempt. Quick Training does not send attempt_id because this request cannot target an existing attempt. Record both returned IDs.'], ['training/part-a']),
      section('part-a', 'Part A settings', ['The dataset and timeline values are passed to Part A. Use the linked Part A guide for every identical field.'], ['training/part-a']),
      section('part-b', 'Part B settings', ['The outlier, validity, gap-profile, and phase values are passed to Part B. Use the linked Part B guide for field-level behavior.'], ['training/part-b']),
      section('part-c', 'Part C settings', ['Default mode sends a model hint; edited profile or custom mode sends a complete feature configuration. The profile must match the Part D model.'], ['training/part-c']),
      section('part-d', 'Part D settings', ['The model, strategy, parameters, splits, and calibration are passed to Part D.'], ['training/part-d']),
      section('bootstrap', 'Inference bootstrap', ['Bootstrap prepares history for future inference; it does not run inference now.'], ['training/inference-bootstrap']),
      section('review', 'Review and recover', ['Keep the page open during the synchronous request. If an intermediate stage fails, earlier stages may already be persisted. Copy run_id and attempt_id from Pipeline result, open Attempt details, and continue in Guided Training where the lifecycle permits.'], ['runs-and-reports']),
    ],
  },
  inference: {
    title: 'Inference', purpose: 'Score new data with the active inference-ready attempt.',
    sections: [
      section('select-run', 'Select and verify a run', ['Enter or follow a link with a run ID, then Verify. The backend selects that run\'s active inference-ready attempt; the inference request does not choose an attempt. Confirm the displayed readiness and active attempt.']),
      section('execute', 'File, span, and result', ['The CSV path must be readable by the ML server. Inference days requests a positive whole-day forward window. Each execution returns an invocation ID, which links to persisted results.']),
      section('chronology', 'History cache and chronological gaps', [
        'Process day 1, then day 2, then day 3 files in order. If day 2 is skipped, day 3 may fail the saved gap-day or gap-ratio limits. Setting Inference days = 2 on a day 3-only file does not manufacture day 2 data. A combined forward file containing day 2 and day 3 can be used with a matching two-day request.',
        'Successful inference updates maintained history. Supported genuine late values within the processed cache can trigger reconstruction when enabled. Existing accepted originals remain authoritative; rows older than the processed cache are ignored for the current call.',
      ], ['training/inference-bootstrap', 'runs-and-reports']),
    ],
  },
  'runs-and-reports': {
    title: 'Runs and reports', purpose: 'Browse persisted attempts, stages, and inference invocations.',
    sections: [section('browse', 'Find and review records', ['A run contains attempts, which contain stages and executions. Browser-side search and filters change only the visible list. Open an attempt to inspect stages or continue Guided Training. Every inference request creates a separate invocation and report.'])],
  },
};

for (const [topic, guide] of Object.entries(guides)) {
  for (const item of guide.sections) item.fields = helpFields[topic]?.[item.id] ?? [];
}

export type GuideKey = keyof typeof guides;
export const helpHref = (guide: GuideKey, section?: string) => `/help/${guide}${section ? `#${section}` : ''}`;
export const formGuideTargets = {
  guided: { part_a: ['training/part-a', 'run-selection'], part_b: ['training/part-b', 'outliers'], part_c: ['training/part-c', 'modes'], part_d: ['training/part-d', 'model'] },
  quick: ['run-setup', 'part-a', 'part-b', 'part-c', 'part-d', 'bootstrap', 'review'].map(id => ['training/quick', id] as const),
  inference: ['inference', 'select-run'] as const,
} as const;
