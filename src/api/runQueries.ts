import { useQuery } from '@tanstack/react-query';
import { getAttempt, getRun, listRuns } from './runsApi';
export const runKeys = { all: ['runs'] as const, detail: (runId: string) => ['runs', runId] as const, attempt: (runId: string, attemptId: string) => ['runs', runId, 'attempts', attemptId] as const };
export const useRuns = () => useQuery({ queryKey: runKeys.all, queryFn: listRuns, staleTime: 30_000, refetchInterval: false });
export const useRun = (runId: string) => useQuery({ queryKey: runKeys.detail(runId), queryFn: () => getRun(runId), enabled: Boolean(runId) });
export const useAttempt = (runId: string, attemptId: string) => useQuery({ queryKey: runKeys.attempt(runId, attemptId), queryFn: () => getAttempt(runId, attemptId), enabled: Boolean(runId && attemptId) });
