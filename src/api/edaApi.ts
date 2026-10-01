import { config } from '../config/env';
import { mlClient } from './mlClient';
import type { EDAStageRequest, StandaloneStageResponse, TimelineMode } from './workflowTypes';

export type EDAFormValues = {
  executionMode: 'new_run' | 'new_attempt' | 'retry_attempt'; runId: string; attemptId: string;
  employeeCode: string; employeeName: string; runName: string; inputFile: string;
  columns: EDAStageRequest['dataset']['columns'];
  bucketSource: 'csv' | 'request'; bucketType: string; bucketSize: string;
  kpiSource: 'csv' | 'single'; singleKpiName: string;
  timelineMode: TimelineMode; expectedStart: string; expectedEnd: string; numDays: string;
};
export const defaultEDAFormValues: EDAFormValues = {
  executionMode: 'new_run', runId: '', attemptId: '', employeeCode: '', employeeName: '', runName: '', inputFile: '',
  columns: { circle_column: 'Jio_Circles', cluster_column: 'Jio_Cluster', site_name_column: 'AMF_Site_Name', timestamp_column: 'time', value_column: 'computedValue', kpi_name_column: 'kpiName', server_type_column: 'JIO_AMF_Server_Type', consequent_value_column: 'consequentValue', bucket_type_column: 'bucketType', bucket_size_column: 'bucketSize' },
  bucketSource: 'csv', bucketType: '', bucketSize: '', kpiSource: 'csv', singleKpiName: '', timelineMode: 'global_min_max', expectedStart: '', expectedEnd: '', numDays: '',
};
export type ValidationErrors = Partial<Record<keyof EDAFormValues | keyof EDAFormValues['columns'] | 'attemptId', string>>;
const trim = (value: string) => value.trim();
const positiveInteger = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
export function validateEDAForm(values: EDAFormValues): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!trim(values.inputFile)) errors.inputFile = 'Enter a server-readable CSV path.';
  if (values.executionMode !== 'new_run' && !trim(values.runId)) errors.runId = 'Run ID is required for this mode.';
  if (values.executionMode === 'retry_attempt' && !trim(values.attemptId)) errors.attemptId = 'Attempt ID is required to target an existing attempt.';
  for (const [key, value] of Object.entries(values.columns)) if (!trim(value)) errors[key as keyof EDAFormValues['columns']] = 'Column mapping must not be empty.';
  const seen = new Map<string, string>();
  for (const [key, value] of Object.entries(values.columns)) { const name = trim(value); const prior = seen.get(name); if (prior) { errors[key as keyof EDAFormValues['columns']] = `Duplicates ${prior.replaceAll('_', ' ')}; physical column names must be unique.`; errors[prior as keyof EDAFormValues['columns']] = `Duplicates ${key.replaceAll('_', ' ')}; physical column names must be unique.`; } else seen.set(name, key); }
  for (const [field, value, max] of [['employeeCode', values.employeeCode, 128], ['employeeName', values.employeeName, 256], ['runName', values.runName, 256]] as const) if (trim(value) && trim(value).length > max) errors[field] = `Maximum length is ${max} characters.`;
  if (values.bucketSource === 'request') { if (!trim(values.bucketType)) errors.bucketType = 'Enter a bucket type.'; if (!positiveInteger(values.bucketSize)) errors.bucketSize = 'Enter a positive whole number.'; }
  if (values.kpiSource === 'single' && !trim(values.singleKpiName)) errors.singleKpiName = 'Enter the KPI name for this single-KPI file.';
  if (values.timelineMode === 'date_range') {
    if (!values.expectedStart) errors.expectedStart = 'Enter the expected start.';
    if (!values.expectedEnd) errors.expectedEnd = 'Enter the expected end.';
    if (values.expectedStart && values.expectedEnd && values.expectedEnd <= values.expectedStart) errors.expectedEnd = 'Expected end must be later than expected start.';
  }
  if (values.timelineMode === 'num_days' && !positiveInteger(values.numDays)) errors.numDays = 'Enter a positive whole number of days.';
  return errors;
}
export function buildEDARequest(values: EDAFormValues): EDAStageRequest {
  const errors = validateEDAForm(values);
  if (Object.keys(errors).length) throw new Error('Correct the highlighted Part A fields before submitting.');
  const metadata = { employee_code: trim(values.employeeCode), employee_name: trim(values.employeeName), run_name: trim(values.runName) };
  const timeline: EDAStageRequest['dataset']['expected_timeline'] = { timeline_mode: values.timelineMode };
  if (values.timelineMode === 'date_range') { timeline.expected_start = `${values.expectedStart}:00`; timeline.expected_end = `${values.expectedEnd}:00`; }
  if (values.timelineMode === 'num_days') timeline.num_days = Number(values.numDays);
  const dataset: EDAStageRequest['dataset'] = { input_file: trim(values.inputFile), columns: Object.fromEntries(Object.entries(values.columns).map(([key, value]) => [key, trim(value)])) as EDAStageRequest['dataset']['columns'], expected_timeline: timeline };
  if (values.bucketSource === 'request') dataset.bucket = { bucket_type: trim(values.bucketType), bucket_size: Number(values.bucketSize) };
  if (values.kpiSource === 'single') dataset.single_kpi_name = trim(values.singleKpiName);
  const request: EDAStageRequest = { run_metadata: Object.fromEntries(Object.entries(metadata).filter(([, value]) => value)) as EDAStageRequest['run_metadata'], dataset };
  if (values.executionMode !== 'new_run') request.run_id = trim(values.runId);
  if (values.executionMode === 'retry_attempt') request.attempt_id = trim(values.attemptId);
  return request;
}
export async function runEDA(request: EDAStageRequest): Promise<StandaloneStageResponse> {
  const value: unknown = await mlClient.post<unknown>('/api/v1/eda/run', request, config.mlWorkflowTimeoutMs);
  if (!isStandaloneStageResponse(value)) throw new Error('The ML workflow returned an unexpected Part A response.');
  return value;
}
function isStandaloneStageResponse(value: unknown): value is StandaloneStageResponse {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  const stages = ['part_a', 'part_b', 'part_c', 'part_d', 'inference_bootstrap', 'inference'];
  const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
  const validError = (value: unknown) => value === null || (isRecord(value) && typeof value.error_type === 'string' && typeof value.message === 'string' && isRecord(value.details));
  const executions = item.executions;
  return ['completed', 'failed', 'partially_completed'].includes(String(item.status)) && typeof item.run_id === 'string' && typeof item.attempt_id === 'string' && item.requested_stage === 'part_a' && Array.isArray(executions) && executions.every(value => isRecord(value) && stages.includes(String(value.stage)) && typeof value.execution_id === 'string' && ['completed', 'failed', 'cancelled'].includes(String(value.status)) && isRecord(value.summary) && validError(value.error)) && typeof item.message === 'string' && (item.next_stage === null || item.next_stage === undefined || stages.includes(String(item.next_stage))) && typeof item.inference_ready === 'boolean' && isRecord(item.summary) && validError(item.error);
}
