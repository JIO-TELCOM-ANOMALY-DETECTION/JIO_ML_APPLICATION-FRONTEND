import type { RunSummaryResponse } from '../api/runTypes';
export const formatDate = (value: string | null | undefined): string => { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date); };
export const display = (value: unknown): string => value === null || value === undefined || value === '' ? '—' : typeof value === 'string' ? value : JSON.stringify(value);
export function filterRuns(runs: RunSummaryResponse[], query: string, status: string, readiness: 'all' | 'ready' | 'not-ready'): RunSummaryResponse[] {
  const needle = query.trim().toLocaleLowerCase();
  return runs.filter(run => {
    const latest = run.run_metadata;
    const matchesText = !needle || [run.run_id, latest.run_name, latest.employee_code, latest.employee_name].some(value => value?.toLocaleLowerCase().includes(needle));
    return matchesText && (status === 'all' || run.status === status) && (readiness === 'all' || run.inference_ready === (readiness === 'ready'));
  });
}
