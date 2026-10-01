import type { StageView } from './runTypes';
import type { StandaloneStageResponse } from './workflowTypes';

export type GuidedStage = 'part_a' | 'part_b' | 'part_c' | 'part_d';
export const guidedPath = (stage: GuidedStage, runId: string, attemptId: string) => `/training/guided/${stage.replace('_', '-')}?run_id=${encodeURIComponent(runId)}&attempt_id=${encodeURIComponent(attemptId)}`;
export const completedStage = (stages: StageView[] | undefined, stage: GuidedStage) => stages?.some(item => item.stage === stage && item.status === 'completed') ?? false;
export const completedResponse = (result: StandaloneStageResponse | undefined, stage: GuidedStage) => Boolean(result?.status === 'completed' && result.requested_stage === stage && result.run_id && result.attempt_id && result.executions.some(item => item.stage === stage && item.status === 'completed'));
