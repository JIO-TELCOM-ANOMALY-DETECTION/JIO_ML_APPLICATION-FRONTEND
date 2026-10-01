import { config } from '../config/env';
import { mlClient } from './mlClient';

export type InferenceRequest = { run_id: string; input_file: string; inference_days: number };
export type InferenceResponse = {
  status: 'completed' | 'failed' | 'cancelled';
  run_id: string;
  training_attempt_id: string;
  invocation_id: string;
  stage: 'inference';
  message: string;
  summary: Record<string, unknown>;
  error: { error_type: string; error_code: string | null; message: string; details: Record<string, unknown> } | null;
};

export const validInferenceRunId = (value: string) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(value);
export function validateInferenceInput(inputFile: string, days: string): { input_file?: string; inference_days?: string } {
  return {
    ...(inputFile.trim() ? {} : { input_file: 'Enter a server-readable CSV path.' }),
    ...(/^[1-9]\d*$/.test(days.trim()) && Number.isSafeInteger(Number(days.trim())) ? {} : { inference_days: 'Enter a whole number of days, at least 1.' }),
  };
}
export async function runInference(request: InferenceRequest): Promise<InferenceResponse> {
  const value: unknown = await mlClient.post('/api/v1/inference/run', request, config.mlWorkflowTimeoutMs);
  if (!value || typeof value !== 'object') throw new Error('The ML service returned an unexpected inference response.');
  const result = value as Record<string, unknown>;
  if (!['completed', 'failed', 'cancelled'].includes(String(result.status)) || typeof result.run_id !== 'string' || typeof result.training_attempt_id !== 'string' || typeof result.invocation_id !== 'string' || result.stage !== 'inference' || typeof result.message !== 'string' || !result.summary || typeof result.summary !== 'object') throw new Error('The ML service returned an unexpected inference response.');
  return value as InferenceResponse;
}
