import { useQuery } from '@tanstack/react-query';
import { getAttemptReport, getInferenceReport, getRunReport, getStageReport, isReportStage, isValidReportId, listInferenceReports } from './reportingApi';
export const reportKeys = {
  all: ['reports'] as const,
  run: (runId: string) => ['reports', 'runs', runId] as const,
  attempt: (runId: string, attemptId: string) => ['reports', 'runs', runId, 'attempts', attemptId] as const,
  stage: (runId: string, attemptId: string, stage: string) => ['reports', 'runs', runId, 'attempts', attemptId, 'stages', stage] as const,
  inferences: (runId: string) => ['reports', 'runs', runId, 'inference'] as const,
  inference: (runId: string, invocationId: string) => ['reports', 'runs', runId, 'inference', invocationId] as const,
};
export const useRunReport = (runId: string) => useQuery({ queryKey: reportKeys.run(runId), queryFn: () => getRunReport(runId), enabled: isValidReportId(runId), refetchInterval: false });
export const useAttemptReport = (runId: string, attemptId: string) => useQuery({ queryKey: reportKeys.attempt(runId, attemptId), queryFn: () => getAttemptReport(runId, attemptId), enabled: isValidReportId(runId) && isValidReportId(attemptId), refetchInterval: false });
export const useStageReport = (runId: string, attemptId: string, stage: string) => useQuery({ queryKey: reportKeys.stage(runId, attemptId, stage), queryFn: () => getStageReport(runId, attemptId, stage), enabled: isValidReportId(runId) && isValidReportId(attemptId) && isReportStage(stage), refetchInterval: false });
export const useInferenceReports = (runId: string) => useQuery({ queryKey: reportKeys.inferences(runId), queryFn: () => listInferenceReports(runId), enabled: isValidReportId(runId), refetchInterval: false });
export const useInferenceReport = (runId: string, invocationId: string) => useQuery({ queryKey: reportKeys.inference(runId, invocationId), queryFn: () => getInferenceReport(runId, invocationId), enabled: isValidReportId(runId) && isValidReportId(invocationId), refetchInterval: false });
