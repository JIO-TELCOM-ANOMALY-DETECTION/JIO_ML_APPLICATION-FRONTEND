export const REPORT_STAGES = ['part_a', 'part_b', 'part_c', 'part_d'] as const;
export type ReportStage = typeof REPORT_STAGES[number];
export type StructuredValue = string | number | boolean | null | StructuredValue[] | { [key: string]: StructuredValue };
export type ReportArtifact = {
  name: string;
  kind: string;
  format: string;
  relative_path: string;
  size_bytes: number;
  preview: Array<Record<string, string>> | null;
};
export type ReportKpiDetail = {
  kpi_name?: string;
  site_analysis?: Record<string, StructuredValue>;
  server_validation?: Record<string, StructuredValue>;
  integrity?: Record<string, StructuredValue>;
  prophet_enabled?: boolean;
  feature_columns?: string[];
  total_rows?: number;
  total_sites?: number;
  processed_sites?: number;
  skipped_invalid_sites?: number;
  insufficient_history_sites?: number;
  populated_feature_cells?: number;
  missing_feature_cells?: number;
  resolved_config?: Record<string, StructuredValue>;
  status?: string;
  model_type?: string;
  minimum_history_points?: number;
  total_series?: number;
  valid_series?: number;
  trained_series?: number;
  skipped_invalid_series?: number;
  model_feature_columns?: string[];
  target_column?: string;
  [key: string]: StructuredValue | undefined;
};
export type InferenceSeriesDetail = {
  kpi_name?: string;
  series_key?: string;
  identity?: StructuredValue[];
  total_window_rows?: number;
  scorable_rows?: number;
  unscorable_rows?: number;
  anomaly_count?: number;
  anomaly_rate?: number;
  model_anomaly_count?: number;
  lower_anomaly_count?: number;
  upper_anomaly_count?: number;
  [key: string]: StructuredValue | undefined;
};
export type ReportDetails = {
  kpis?: ReportKpiDetail[];
  training_records?: ReportKpiDetail[];
  series?: InferenceSeriesDetail[];
  skipped_series?: StructuredValue[];
  [key: string]: StructuredValue | ReportKpiDetail[] | InferenceSeriesDetail[] | undefined;
};
export type ReportEnvelope = {
  run_id: string;
  attempt_id: string | null;
  stage: string;
  status: string;
  execution_id: string | null;
  invocation_id: string | null;
  training_attempt_id: string | null;
  generated_at: string;
  summary: Record<string, StructuredValue>;
  artifacts: ReportArtifact[];
  warnings: string[];
  details: ReportDetails;
};
export type RunReportSummary = {
  run_id: string;
  status: string | null;
  latest_attempt_id: string | null;
  active_inference_attempt_id: string | null;
  inference_ready: boolean | null;
  attempts: string[];
  inference_invocation_count: number;
};
export type ReportStageSummary = { status: string | null; successful_execution_id: string | null };
export type AttemptReportSummary = {
  run_id: string;
  attempt_id: string;
  status: string | null;
  stages: Record<string, ReportStageSummary>;
};
export type InferenceInvocationSummary = {
  invocation_id: string;
  training_attempt_id?: string;
  status?: string;
  started_at_utc?: string | null;
  completed_at_utc?: string | null;
  metrics?: Record<string, StructuredValue>;
};
export type InferenceInvocationList = { run_id: string; invocations: InferenceInvocationSummary[] };

