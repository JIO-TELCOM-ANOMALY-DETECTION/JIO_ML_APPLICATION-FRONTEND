import { mlClient } from './mlClient';
import type { AttemptDetailResponse, RunSummaryResponse } from './runTypes';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
function assertRun(value: unknown): asserts value is RunSummaryResponse {
  if (!isRecord(value) || typeof value.run_id !== 'string' || typeof value.status !== 'string' || !isRecord(value.run_metadata) || !Array.isArray(value.attempts) || typeof value.inference_ready !== 'boolean') throw new Error('The runs service returned an unexpected response.');
}
function assertRunList(value: unknown): asserts value is RunSummaryResponse[] {
  if (!Array.isArray(value)) throw new Error('The runs service returned an unexpected response.');
  value.forEach(assertRun);
}
export async function listRuns(): Promise<RunSummaryResponse[]> { const value: unknown = await mlClient.get('/api/v1/runs'); assertRunList(value); return value; }
export async function getRun(runId: string): Promise<RunSummaryResponse> { const value: unknown = await mlClient.get(`/api/v1/runs/${encodeURIComponent(runId)}`); assertRun(value); return value; }
export async function getAttempt(runId: string, attemptId: string): Promise<AttemptDetailResponse> {
  const value: unknown = await mlClient.get(`/api/v1/runs/${encodeURIComponent(runId)}/attempts/${encodeURIComponent(attemptId)}`);
  if (!isRecord(value) || typeof value.run_id !== 'string' || !isRecord(value.attempt) || typeof value.attempt.attempt_id !== 'string' || !Array.isArray(value.attempt.stages)) throw new Error('The attempt service returned an unexpected response.');
  return value as unknown as AttemptDetailResponse;
}
