import { describe, expect, it, vi } from 'vitest';
import { runInference, validInferenceRunId, validateInferenceInput } from './inference';

describe('inference API contract', () => {
  it('uses the ML inference route with exactly the three runtime fields', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'completed', run_id: 'run-1', training_attempt_id: 'attempt-1', invocation_id: 'inv-1', stage: 'inference', message: 'Done', summary: {}, error: null }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetcher);
    await runInference({ run_id: 'run-1', input_file: 'data.csv', inference_days: 1 });
    expect(String(fetcher.mock.calls[0][0])).toContain('/api/v1/inference/run');
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ run_id: 'run-1', input_file: 'data.csv', inference_days: 1 });
  });
  it('accepts an HTTP-success failed workflow without treating it as completed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'failed', run_id: 'run-1', training_attempt_id: 'attempt-1', invocation_id: 'inv-1', stage: 'inference', message: 'Failed', summary: {}, error: null }), { status: 200, headers: { 'content-type': 'application/json' } })));
    await expect(runInference({ run_id: 'run-1', input_file: 'data.csv', inference_days: 1 })).resolves.toMatchObject({ status: 'failed' });
  });
  it('follows the backend identifier and integer-day rules', () => {
    expect(validInferenceRunId('run-1')).toBe(true);
    expect(validInferenceRunId('_invalid')).toBe(false);
    expect(validInferenceRunId('a'.repeat(97))).toBe(false);
    for (const days of ['', '0', '1.5', '-1', '1e2']) expect(validateInferenceInput(' data.csv ', days).inference_days).toBeDefined();
    expect(validateInferenceInput(' data.csv ', '1')).toEqual({});
    expect(validateInferenceInput('   ', '1').input_file).toBeDefined();
  });
});
