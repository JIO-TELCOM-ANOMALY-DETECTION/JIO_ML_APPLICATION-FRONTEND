import { useQuery } from '@tanstack/react-query';
import { getAttempt, getRun, listRuns } from './runsApi';
export const runKeys = { all: ['runs'] as const, detail: (runId: string) => ['runs', runId] as const, attempt: (runId: string, attemptId: string) => ['runs', runId, 'attempts', attemptId] as const };
export const useRuns = (enabled = true) => useQuery({ queryKey: runKeys.all, queryFn: listRuns, enabled, staleTime: 30_000, refetchInterval: false });
export const useRun = (runId: string, track = false) => useQuery({ queryKey: runKeys.detail(runId), queryFn: () => getRun(runId), enabled: Boolean(runId), refetchInterval: track ? query => query.state.data?.inference_ready || ['failed', 'partially_completed'].includes(query.state.data?.status ?? '') ? false : 2000 : false });
export const useAttempt = (runId: string, attemptId: string, track = false) => useQuery({ queryKey: runKeys.attempt(runId, attemptId), queryFn: () => getAttempt(runId, attemptId), enabled: Boolean(runId && attemptId), refetchInterval: track ? query => query.state.data?.inference_ready || ['failed', 'partially_completed'].includes(query.state.data?.attempt.status ?? '') ? false : 2000 : false });
