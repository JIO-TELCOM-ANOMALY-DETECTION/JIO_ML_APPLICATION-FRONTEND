export type TimelineMode = 'global_min_max' | 'date_range' | 'num_days';
export type WorkflowErrorDetail = { error_type: string; message: string; error_code: string | null; details: Record<string, unknown> };
export type StageExecutionSummary = { stage: 'part_a' | 'part_b' | 'part_c' | 'part_d' | 'inference_bootstrap'; execution_id: string; status: 'completed' | 'failed' | 'cancelled'; summary: Record<string, unknown>; error: WorkflowErrorDetail | null };
export type StandaloneStageResponse = { status: 'completed' | 'failed' | 'partially_completed'; run_id: string; attempt_id: string; requested_stage: StageExecutionSummary['stage']; executions: StageExecutionSummary[]; message: string; next_stage: StageExecutionSummary['stage'] | 'inference' | null; inference_ready: boolean; summary: Record<string, unknown>; error: WorkflowErrorDetail | null };
export type EDAStageRequest = {
  run_id?: string;
  attempt_id?: string;
  run_metadata: { employee_code?: string; employee_name?: string; run_name?: string };
  dataset: {
    input_file: string;
    columns: { circle_column: string; cluster_column: string; site_name_column: string; timestamp_column: string; value_column: string; kpi_name_column: string; server_type_column: string; consequent_value_column: string; bucket_type_column: string; bucket_size_column: string };
    bucket?: { bucket_type: string; bucket_size: number };
    single_kpi_name?: string;
    expected_timeline: { timeline_mode: TimelineMode; expected_start?: string; expected_end?: string; num_days?: number };
  };
};
