import { config } from '../config/env';
import { mlClient } from './mlClient';
import { buildEDARequest, validateEDAForm, type EDAFormValues } from './edaApi';
import { backendPreprocessingDefaults, buildPartBRequest, buildCustomPartCRequest, buildProfilePartCRequest, validatePartB, type PreprocessingConfig } from './stageBC';
import { validateDefaultSettings, validateFeatures, type CorrectedHistory, type CustomFeatureConfig, type DefaultFeatureSettings } from './featureBuilder';
import { buildTrainingRequest, parseDecimal, parseInteger, validateTraining, type TrainingForm } from './training';
import type { EDAStageRequest, StageExecutionSummary, WorkflowErrorDetail } from './workflowTypes';

export type QuickFeature =
  | { mode: 'default' }
  | { mode: 'profile'; profile: 'xgboost' | 'isolation_forest'; settings: DefaultFeatureSettings; history: CorrectedHistory; retain: boolean; save: boolean }
  | { mode: 'custom'; config: CustomFeatureConfig };
export type QuickDraft = {
  dataset: EDAFormValues;
  preprocessing: PreprocessingConfig;
  customGap: boolean;
  feature: QuickFeature;
  training: TrainingForm;
  bootstrap: { customized: boolean; maxGapDays: string; maxGapRatio: string; lateDataReconstructionEnabled: boolean };
};
export type TrainingPipelineRequest = {
  run_id?: string;
  run_metadata?: EDAStageRequest['run_metadata'];
  dataset: EDAStageRequest['dataset'];
  preprocessing: Pick<PreprocessingConfig, 'outlier'> & Partial<Omit<PreprocessingConfig, 'outlier'>>;
  feature_engineering?: ReturnType<typeof buildCustomPartCRequest>['feature_engineering'] | ReturnType<typeof buildProfilePartCRequest>['feature_engineering'];
  training: ReturnType<typeof buildTrainingRequest>['training'];
  inference_bootstrap?: { max_gap_days: number; max_gap_ratio: number; late_data_reconstruction_enabled: boolean };
};
export type TrainingPipelineResponse = {
  status: 'completed' | 'failed' | 'partially_completed'; run_id: string; attempt_id: string;
  stages: StageExecutionSummary[]; message: string; failed_stage: StageExecutionSummary['stage'] | null;
  next_stage: StageExecutionSummary['stage'] | 'inference' | null; inference_ready: boolean;
  summary: Record<string, unknown>; error: WorkflowErrorDetail | null;
};
function nonFinitePaths(value: unknown, path = ''): string[] {
  if (typeof value === 'number') return Number.isFinite(value) ? [] : [path];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, item]) => nonFinitePaths(item, path ? `${path}.${key}` : key));
}
export function validateQuickDraft(draft: QuickDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const add = (section: string, values: Record<string, string | undefined>) => { for (const [key, value] of Object.entries(values)) if (value) errors[`${section}.${key}`] = value; };
  add('dataset', validateEDAForm(draft.dataset.executionMode === 'new_run' ? draft.dataset : { ...draft.dataset, employeeCode: '', employeeName: '', runName: '', attemptId: '' }));
  if (draft.dataset.executionMode === 'retry_attempt') errors['dataset.executionMode'] = 'Quick Training only creates new attempts.';
  add('preprocessing', validatePartB(draft.preprocessing, draft.customGap));
  if (draft.feature.mode === 'custom') add('feature', validateFeatures(draft.feature.config.features, draft.feature.config.corrected_history));
  if (draft.feature.mode === 'profile') {
    if (draft.feature.profile !== draft.training.model) errors['feature.profile'] = 'The Part C profile must match the Part D model.';
    add('feature', validateDefaultSettings(draft.feature.profile, draft.feature.settings));
    add('feature', validateFeatures([{ type: 'current_value' }], draft.feature.history));
  }
  if (draft.feature.mode !== 'default') for (const path of nonFinitePaths(draft.feature.mode === 'custom' ? draft.feature.config : {settings:draft.feature.settings,history:draft.feature.history})) errors[`feature.${path}`] = 'Enter a finite number.';
  add('training', validateTraining(draft.training));
  if (draft.bootstrap.customized) {
    const days = parseInteger(draft.bootstrap.maxGapDays); const ratio = parseDecimal(draft.bootstrap.maxGapRatio);
    if (days === undefined || days < 0) errors['bootstrap.maxGapDays'] = 'Enter a whole number of days of at least zero.';
    if (ratio === undefined || ratio < 0 || ratio > 1) errors['bootstrap.maxGapRatio'] = 'Enter a decimal fraction from 0 to 1.';
  }
  return errors;
}
export function buildQuickTrainingRequest(draft: QuickDraft): TrainingPipelineRequest {
  const errors = validateQuickDraft(draft);
  if (Object.keys(errors).length) throw new Error(`Correct ${[...new Set(Object.keys(errors).map(key => key.split('.')[0]))].join(', ')} before running the pipeline.`);
  const eda = buildEDARequest(draft.dataset.executionMode === 'new_run' ? draft.dataset : { ...draft.dataset, employeeCode: '', employeeName: '', runName: '', attemptId: '' });
  const guidedPreprocessing = buildPartBRequest('placeholder', 'placeholder', draft.preprocessing, draft.customGap).preprocessing;
  const preprocessing = JSON.stringify(draft.preprocessing) === JSON.stringify(backendPreprocessingDefaults) && !draft.customGap
    ? { outlier: guidedPreprocessing.outlier }
    : guidedPreprocessing;
  const training = buildTrainingRequest('placeholder', 'placeholder', draft.training).training;
  const request: TrainingPipelineRequest = { dataset: eda.dataset, preprocessing, training };
  if (draft.dataset.executionMode === 'new_run') {
    if (Object.keys(eda.run_metadata).length) request.run_metadata = eda.run_metadata;
  } else request.run_id = draft.dataset.runId.trim();
  if (draft.feature.mode === 'custom') request.feature_engineering = buildCustomPartCRequest('placeholder', 'placeholder', draft.feature.config).feature_engineering;
  if (draft.feature.mode === 'profile') request.feature_engineering = buildProfilePartCRequest('placeholder', 'placeholder', draft.feature.profile, draft.feature.settings, draft.feature.history, draft.feature.retain, draft.feature.save).feature_engineering;
  if (draft.bootstrap.customized) request.inference_bootstrap = { max_gap_days: parseInteger(draft.bootstrap.maxGapDays)!, max_gap_ratio: parseDecimal(draft.bootstrap.maxGapRatio)!, late_data_reconstruction_enabled: draft.bootstrap.lateDataReconstructionEnabled };
  if (nonFinitePaths(request).length) throw new Error('Correct nonfinite numeric configuration values before running the pipeline.');
  return request;
}
export async function runQuickTraining(request: TrainingPipelineRequest): Promise<TrainingPipelineResponse> {
  const value: unknown = await mlClient.post('/api/v1/pipeline/run', request, config.mlWorkflowTimeoutMs);
  if (!value || typeof value !== 'object') throw new Error('Unexpected pipeline response.');
  const result = value as TrainingPipelineResponse;
  if (!['completed', 'failed', 'partially_completed'].includes(result.status) || typeof result.run_id !== 'string' || typeof result.attempt_id !== 'string' || !Array.isArray(result.stages) || typeof result.inference_ready !== 'boolean' || typeof result.message !== 'string') throw new Error('Unexpected pipeline response.');
  return result;
}
