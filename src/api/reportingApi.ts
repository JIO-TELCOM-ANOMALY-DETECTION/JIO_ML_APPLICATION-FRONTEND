import { reportingClient } from './reportingClient';
import { REPORT_STAGES, type AttemptReportSummary, type InferenceInvocationList, type ReportEnvelope, type ReportStage, type RunReportSummary } from './reportTypes';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
export const isValidReportId = (value: string): boolean => /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
export const isReportStage = (value: string): value is ReportStage => REPORT_STAGES.some(stage => stage === value);
function requireRecord(value: unknown, description: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`The reporting service returned an unexpected ${description} response.`);
  return value;
}
export function parseRunReport(value: unknown): RunReportSummary {
  const record = requireRecord(value, 'run summary');
  if (typeof record.run_id !== 'string' || !Array.isArray(record.attempts) || typeof record.inference_invocation_count !== 'number') throw new Error('The reporting service returned an unexpected run summary response.');
  return value as RunReportSummary;
}
export function parseAttemptReport(value: unknown): AttemptReportSummary {
  const record = requireRecord(value, 'attempt summary');
  if (typeof record.run_id !== 'string' || typeof record.attempt_id !== 'string' || !isRecord(record.stages)) throw new Error('The reporting service returned an unexpected attempt summary response.');
  return value as AttemptReportSummary;
}
export function parseReportEnvelope(value: unknown): ReportEnvelope {
  const record = requireRecord(value, 'report');
  if (typeof record.run_id !== 'string' || typeof record.stage !== 'string' || typeof record.status !== 'string' || typeof record.generated_at !== 'string' || !isRecord(record.summary) || !Array.isArray(record.artifacts) || !Array.isArray(record.warnings) || !isRecord(record.details)) throw new Error('The reporting service returned an unexpected report response.');
  for (const item of record.artifacts) if (!isRecord(item) || typeof item.name !== 'string' || typeof item.kind !== 'string' || typeof item.format !== 'string' || typeof item.relative_path !== 'string' || typeof item.size_bytes !== 'number') throw new Error('The reporting service returned an unexpected artifact response.');
  return value as ReportEnvelope;
}
export function parseInferenceList(value: unknown): InferenceInvocationList {
  const record = requireRecord(value, 'inference list');
  if (typeof record.run_id !== 'string' || !Array.isArray(record.invocations) || record.invocations.some(item => !isRecord(item) || typeof item.invocation_id !== 'string')) throw new Error('The reporting service returned an unexpected inference list response.');
  return value as InferenceInvocationList;
}
const runPath = (runId: string) => `/api/v1/reports/runs/${encodeURIComponent(runId)}`;
export async function getRunReport(runId: string): Promise<RunReportSummary> { return parseRunReport(await reportingClient.get<unknown>(runPath(runId))); }
export async function getAttemptReport(runId: string, attemptId: string): Promise<AttemptReportSummary> { return parseAttemptReport(await reportingClient.get<unknown>(`${runPath(runId)}/attempts/${encodeURIComponent(attemptId)}`)); }
export async function getStageReport(runId: string, attemptId: string, stage: string): Promise<ReportEnvelope> {
  if (!isReportStage(stage)) throw new Error('Unsupported reporting stage.');
  return parseReportEnvelope(await reportingClient.get<unknown>(`${runPath(runId)}/attempts/${encodeURIComponent(attemptId)}/stages/${encodeURIComponent(stage)}`));
}
export async function listInferenceReports(runId: string): Promise<InferenceInvocationList> { return parseInferenceList(await reportingClient.get<unknown>(`${runPath(runId)}/inference`)); }
export async function getInferenceReport(runId: string, invocationId: string): Promise<ReportEnvelope> { return parseReportEnvelope(await reportingClient.get<unknown>(`${runPath(runId)}/inference/${encodeURIComponent(invocationId)}`)); }
