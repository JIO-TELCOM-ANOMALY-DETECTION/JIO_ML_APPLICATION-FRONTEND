import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAttempt, getRun } from '../../api/runsApi';
import type { AttemptView, RunSummaryResponse } from '../../api/runTypes';
import { QuickTrainingTracker } from './QuickTrainingTracker';

vi.mock('../../api/runsApi', () => ({ getRun: vi.fn(), getAttempt: vi.fn() }));
const clients: QueryClient[] = [];
const run = (patch: Partial<RunSummaryResponse> = {}) => ({ run_id: 'r', status: 'created', attempts: [], latest_attempt_id: null, inference_ready: false, ...patch } as RunSummaryResponse);
const attempt = (status: string, stageStatus: string) => ({ attempt_id: 'discovered-42', status, stages: [{ stage: 'part_a', status: stageStatus }], errors: [] } as unknown as AttemptView);
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  render(<QueryClientProvider client={client}><MemoryRouter><QuickTrainingTracker runId="r"/></MemoryRouter></QueryClientProvider>);
  return client;
}
beforeEach(() => vi.resetAllMocks());
afterEach(() => clients.splice(0).forEach(client => client.clear()));
describe('Acknowledged run tracking', () => {
  it('polls a run with no attempt and discovers its actual attempt ID later', async () => {
    vi.mocked(getRun).mockResolvedValueOnce(run()).mockResolvedValue(run({ latest_attempt_id: 'discovered-42', attempts: [attempt('running', 'running')] }));
    vi.mocked(getAttempt).mockResolvedValue({ run_id: 'r', attempt: attempt('running', 'running'), inference_ready: false, active_inference_attempt_id: null });
    mount();
    await screen.findByText(/Waiting for attempt creation/);
    expect(getAttempt).not.toHaveBeenCalled();
    await screen.findByText(/Stages running/, {}, { timeout: 4000 });
    expect(getAttempt).toHaveBeenCalledWith('r', 'discovered-42');
    expect(screen.getByRole('link', { name: 'Review attempt' })).toHaveAttribute('href', '/runs/r/attempts/discovered-42');
    expect(screen.getByText('part a: running')).toBeInTheDocument();
  });
  it('shows completion before readiness, then inference-ready', async () => {
    vi.mocked(getRun).mockResolvedValue(run({ status: 'completed', latest_attempt_id: 'discovered-42', attempts: [attempt('completed', 'completed')] }));
    vi.mocked(getAttempt).mockResolvedValue({ run_id: 'r', attempt: attempt('completed', 'completed'), inference_ready: false, active_inference_attempt_id: null });
    const client = mount();
    await screen.findByText(/Training completed. Waiting for inference readiness/);
    vi.mocked(getRun).mockResolvedValue(run({ status: 'completed', latest_attempt_id: 'discovered-42', attempts: [attempt('completed', 'completed')], inference_ready: true }));
    await act(async () => { await client.invalidateQueries({ queryKey: ['runs', 'r'] }); });
    await screen.findByText(/Inference-ready/);
    expect(screen.getByRole('link', { name: 'Run inference' })).toHaveAttribute('href', '/inference?run_id=r');
  });
  it('shows failure and a review action', async () => {
    vi.mocked(getRun).mockResolvedValue(run({ status: 'failed', latest_attempt_id: 'discovered-42', attempts: [attempt('failed', 'failed')] }));
    vi.mocked(getAttempt).mockResolvedValue({ run_id: 'r', attempt: attempt('failed', 'failed'), inference_ready: false, active_inference_attempt_id: null });
    mount();
    await screen.findByText(/Training failed/);
    expect(screen.getByRole('link', { name: 'Review attempt' })).toBeInTheDocument();
  });
  it('copies the run ID', async () => {
    vi.mocked(getRun).mockResolvedValue(run());
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Copy run ID' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('r'));
    expect(await screen.findByText('Run ID copied.')).toBeInTheDocument();
  });
});
