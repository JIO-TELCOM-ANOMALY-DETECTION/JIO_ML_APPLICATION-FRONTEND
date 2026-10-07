import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuickTrainingPage } from './QuickTrainingPage';

const Location = () => <div data-testid="location">{useLocation().search}</div>;
const mount = (path = '/') => { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Location/><Routes><Route path="/" element={<QuickTrainingPage/>}/><Route path="/runs/:runId" element={<div>Run destination</div>}/></Routes></MemoryRouter></QueryClientProvider>); return client; };
const reply = (body: unknown) => ({ ok: true, headers: { get: () => 'application/json' }, json: async () => body });
const response = (status: 'completed' | 'partially_completed') => ({ status, run_id: 'run-1', attempt_id: 'attempt-1', stages: [{ stage: 'part_a', execution_id: 'a-1', status: 'completed', summary: { rows: 10 }, error: null }, { stage: 'part_b', execution_id: 'b-1', status: status === 'completed' ? 'completed' : 'failed', summary: {}, error: status === 'completed' ? null : { error_type: 'StageError', error_code: 'BAD_DATA', message: 'Failed at C:\\private\\dataset.csv', details: {} } }], message: status === 'completed' ? 'Pipeline completed' : 'Part B failed', failed_stage: status === 'completed' ? null : 'part_b', next_stage: status === 'completed' ? 'inference' : 'part_b', inference_ready: status === 'completed', summary: {}, error: null });
const existingRun = { run_id: 'run-1', status: 'created', run_metadata: {}, attempts: [], inference_ready: false };
const chooseExisting = async () => {
  fireEvent.mouseDown(screen.getByLabelText('Run mode'));
  fireEvent.click(screen.getByRole('option', { name: 'Create new attempt under existing run' }));
  fireEvent.change(screen.getByLabelText('Existing run ID'), { target: { value: 'run-1' } });
  await screen.findByText(/Run verified/);
};
const review = () => {
  fireEvent.click(screen.getByRole('button', { name: /2\. Part A/ }));
  fireEvent.change(screen.getByLabelText('Server-readable CSV path'), { target: { value: 'server.csv' } });
  fireEvent.click(screen.getByRole('button', { name: /7\. Review and Run/ }));
};
beforeEach(() => { vi.restoreAllMocks(); });
describe('Quick Training workspace', () => {
  it('offers safe new-tab help for every exact step anchor',()=>{mount();for(const [step,anchor] of [[1,'run-setup'],[2,'part-a'],[3,'part-b'],[4,'part-c'],[5,'part-d'],[6,'bootstrap'],[7,'review']] as const){fireEvent.click(screen.getByRole('button',{name:new RegExp(`^${step}\\.`)}));const guide=screen.getByRole('link',{name:'Open settings guide'});expect(guide).toHaveAttribute('href',`/help/training/quick#${anchor}`);expect(guide).toHaveAttribute('target','_blank');expect(guide).toHaveAttribute('rel','noopener noreferrer');}});
  it('preserves edits across steps and shows a readable review', () => { mount(); fireEvent.click(screen.getByRole('button', { name: /2\. Part A/ })); fireEvent.change(screen.getByLabelText('Server-readable CSV path'), { target: { value: 'server.csv' } }); fireEvent.click(screen.getByRole('button', { name: /7\. Review and Run/ })); expect(screen.getByText('Input: server.csv')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: /2\. Part A/ })); expect(screen.getByLabelText('Server-readable CSV path')).toHaveValue('server.csv'); });
  it('verifies an existing run directly without fetching the runs list', async () => { const fetcher = vi.fn().mockResolvedValue(reply({ run_id: 'run-1', status: 'created', run_metadata: {}, attempts: [], inference_ready: false })); vi.stubGlobal('fetch', fetcher); mount(); fireEvent.mouseDown(screen.getByLabelText('Run mode')); fireEvent.click(screen.getByRole('option', { name: 'Create new attempt under existing run' })); fireEvent.change(screen.getByLabelText('Existing run ID'), { target: { value: 'run-1' } }); await screen.findByText(/Run verified/); expect(fetcher).toHaveBeenCalledTimes(1); expect(String(fetcher.mock.calls[0][0])).toContain('/api/v1/runs/run-1'); });
  it('blocks invalid submission and identifies the section', () => { mount(); fireEvent.click(screen.getByRole('button', { name: /7\. Review and Run/ })); expect(screen.getByText(/Resolve configuration errors in: dataset/)).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Run complete training pipeline' })).toBeDisabled(); });
  it('keeps decimal drafts while typing and moving between sections', () => { mount(); fireEvent.click(screen.getByRole('button', { name: /6\. Inference Bootstrap/ })); fireEvent.mouseDown(screen.getByLabelText('Bootstrap settings')); fireEvent.click(screen.getByRole('option', { name: 'Customize' })); const ratio = screen.getByLabelText('Maximum gap ratio'); fireEvent.change(ratio, { target: { value: '0.' } }); expect(ratio).toHaveValue('0.'); fireEvent.change(ratio, { target: { value: '0.25' } }); expect(ratio).toHaveValue('0.25'); fireEvent.click(screen.getByRole('button', { name: /5\. Part D/ })); fireEvent.click(screen.getByRole('button', { name: /6\. Inference Bootstrap/ })); expect(screen.getByLabelText('Maximum gap ratio')).toHaveValue('0.25'); });
  it('exposes the same outlier selection and compatible controls in advanced settings', () => { mount(); fireEvent.click(screen.getByRole('button', { name: /3\. Part B/ })); expect(screen.getByRole('combobox', { name: 'Outlier method' })).toHaveTextContent('Global IQR'); fireEvent.click(screen.getByRole('button', { name: 'Show advanced settings' })); fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Advanced Outlier method' })); fireEvent.click(screen.getByRole('option', { name: 'One day centered IQR' })); expect(screen.getByRole('combobox', { name: 'Outlier method' })).toHaveTextContent('One day centered IQR'); expect(screen.getByLabelText('Advanced centered window minutes')).toHaveValue('1440'); fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Advanced Outlier method' })); fireEvent.click(screen.getByRole('option', { name: 'User bounds' })); expect(screen.getByLabelText('Advanced user lower bound')).toBeInTheDocument(); expect(screen.queryByLabelText('Advanced iqr multiplier')).not.toBeInTheDocument(); });
  it('disables duplicate requests while pending and displays completed stages and links', async () => { let finish!: (value: unknown) => void; const fetcher = vi.fn().mockImplementation((url: string) => url.includes('/pipeline/') ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(reply(existingRun))); vi.stubGlobal('fetch', fetcher); mount(); await chooseExisting(); fireEvent.click(screen.getByRole('button', { name: /2\. Part A/ })); fireEvent.change(screen.getByLabelText('Server-readable CSV path'), { target: { value: 'server.csv' } }); fireEvent.click(screen.getByRole('button', { name: /7\. Review and Run/ })); fireEvent.click(screen.getByRole('button', { name: 'Run complete training pipeline' })); await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2)); expect(String(fetcher.mock.calls[1][0])).toContain('/api/v1/pipeline/run'); expect(JSON.parse(fetcher.mock.calls[1][1].body).preprocessing.outlier).toEqual({ method: 'global_iqr', direction: 'lower_only', iqr_multiplier: 1.5 }); expect(screen.getByRole('button', { name: 'Pipeline running…' })).toBeDisabled(); finish(reply(response('completed'))); await screen.findByText('Pipeline result: Completed'); expect(screen.getByText('Inference ready: Yes')).toBeInTheDocument(); expect(screen.getByText('part a — completed')).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Attempt details' })).toHaveAttribute('href', '/runs/run-1/attempts/attempt-1'); expect(screen.getByRole('link', { name: 'Inference' })).toHaveAttribute('href', '/inference?run_id=run-1'); });
  it('shows partial completion, sanitized stage errors, and Guided continuation', async () => { vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(reply(url.includes('/pipeline/') ? response('partially_completed') : existingRun)))); mount(); await chooseExisting(); fireEvent.click(screen.getByRole('button', { name: /2\. Part A/ })); fireEvent.change(screen.getByLabelText('Server-readable CSV path'), { target: { value: 'server.csv' } }); fireEvent.click(screen.getByRole('button', { name: /7\. Review and Run/ })); fireEvent.click(screen.getByRole('button', { name: 'Run complete training pipeline' })); await screen.findByText('Pipeline result: Partially completed'); expect(screen.getByText(/Failed stage: part b/)).toBeInTheDocument(); expect(screen.getByText(/\[internal path\]/)).toBeInTheDocument(); expect(screen.queryByText(/private/)).not.toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Continue in Guided Training' })).toHaveAttribute('href', '/training/guided/part-b?run_id=run-1&attempt_id=attempt-1'); });
  it('invalidates run, attempt, reporting, and stage queries after a response', async () => { vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(reply(url.includes('/pipeline/') ? response('completed') : existingRun)))); const client = mount(); await chooseExisting(); const invalidate = vi.spyOn(client, 'invalidateQueries'); fireEvent.click(screen.getByRole('button', { name: /2\. Part A/ })); fireEvent.change(screen.getByLabelText('Server-readable CSV path'), { target: { value: 'server.csv' } }); fireEvent.click(screen.getByRole('button', { name: /7\. Review and Run/ })); fireEvent.click(screen.getByRole('button', { name: 'Run complete training pipeline' })); await screen.findByText('Pipeline result: Completed'); await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reports', 'runs', 'run-1', 'attempts', 'attempt-1', 'stages', 'part_a'] })); expect(invalidate).toHaveBeenCalledWith({ queryKey: ['runs'] }); expect(invalidate).toHaveBeenCalledWith({ queryKey: ['runs', 'run-1', 'attempts', 'attempt-1'] }); expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reports', 'runs', 'run-1', 'inference'] }); });
});

describe('Quick Training acknowledgement', () => {
  it('accepts null attempt ID, blocks duplicates, persists tracking and navigates', async () => {
    let finish!: (value: unknown) => void;
    const fetcher = vi.fn().mockImplementation((url: string) => url.includes('/pipeline/') ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(reply(existingRun)));
    vi.stubGlobal('fetch', fetcher); mount(); review();
    const submit = screen.getByRole('button', { name: 'Run complete training pipeline' });
    fireEvent.click(submit); fireEvent.click(submit);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect(String(fetcher.mock.calls[0][0])).toContain('/api/v1/pipeline/master-pipeline-request-acknowledgement-return');
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).not.toHaveProperty('run_id');
    expect(screen.getByRole('button', { name: 'Submitting Quick Training...' })).toBeDisabled();
    finish(reply({ run_id: 'run-1', status: 'created', attempt_id: null, message: 'Accepted' }));
    await screen.findByText(/Quick Training accepted.*Waiting for attempt creation/);
    expect(screen.getByTestId('location')).toHaveTextContent('?run_id=run-1');
    expect(screen.getByRole('button', { name: 'Copy run ID' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Track run' }));
    expect(await screen.findByText('Run destination')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('?quick_training=1');
  });
  it('restores no-attempt tracking from the URL without submitting', async () => {
    const fetcher = vi.fn().mockResolvedValue(reply(existingRun)); vi.stubGlobal('fetch', fetcher);
    mount('/?run_id=run-1');
    await screen.findByText(/Waiting for attempt creation/);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher.mock.calls.every(call => call[1].method === 'GET')).toBe(true);
    expect(screen.queryByRole('link', { name: 'Review attempt' })).not.toBeInTheDocument();
  });
  it('shows failed acknowledgement and never retries the POST', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ...reply({ detail: 'Invalid dataset' }), ok: false, status: 422 });
    vi.stubGlobal('fetch', fetcher); mount(); review();
    fireEvent.click(screen.getByRole('button', { name: 'Run complete training pipeline' }));
    await screen.findByText(/Pipeline request failed.*Invalid dataset/);
    expect(screen.getByText(/No automatic resubmission/)).toBeInTheDocument();
    expect(screen.queryByText(/Quick Training accepted/)).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('explains uncertain network failure without resubmitting', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetcher); mount(); review();
    fireEvent.click(screen.getByRole('button', { name: 'Run complete training pipeline' }));
    await screen.findByText(/server may have created a run/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
