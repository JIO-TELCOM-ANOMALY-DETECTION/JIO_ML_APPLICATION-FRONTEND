import { config } from '../config/env';
import { mlClient } from './mlClient';
import type { StandaloneStageResponse } from './workflowTypes';
import type { CustomFeatureConfig, DefaultFeatureSettings } from './featureBuilder';
import { validateFeatures } from './featureBuilder';

export type Range = { minimum_points: number; maximum_points: number | null };
export type PreprocessingConfig = {
  timeline_correction: { duplicate_timestamp_strategy: 'keep_first'; off_grid_timestamp_strategy: 'reject' };
  valid_values: { lower_bound: number; upper_bound: number; boundary_tolerance: number; clip_values_within_tolerance: boolean; clip_generated_values: boolean };
  series_usability: { maximum_missing_percentage: number };
  outlier: { method: 'global_iqr'|'one_day_centered_iqr'|'user_bounds'; direction: 'lower_only'|'upper_only'|'both'; iqr_multiplier?: number; user_lower_bound?: number; user_upper_bound?: number; centered_window_minutes?: number; centered_min_valid_minutes?: number };
  gap_profile?: { phase_1: Range; phase_2: Range; phase_3: Range; phase_4_pass_1: Range; phase_4_pass_2: Range };
  phase_1: { maximum_anchor_search_minutes: number; maximum_two_sided_distance_minutes: number; maximum_anchor_distance_ratio: number };
  phase_2: { recent_same_type_lookback_days: number; last_week_lookback_days: number; recent_weight: number; last_week_weight: number; neighbor_offset_minutes: number|null };
  phase_3: { maximum_same_type_days: number; maximum_lookback_days: number; level_1_window_minutes: number; level_2_window_minutes: number; level_1_min_clean_values: number|null; level_2_min_clean_values: number; level_4_min_clean_values: number };
  phase_4: { enabled: boolean; allow_full_series_fallback: boolean; minimum_history_days: number; minimum_history_points: number|null; changepoint_prior_scale: number; seasonality_prior_scale: number; seasonality_mode: 'additive'|'multiplicative'; daily_seasonality: boolean; weekly_seasonality: boolean; yearly_seasonality: boolean; interval_width: number; noise_scale: number; random_seed: number };
  save_intermediate_outputs: boolean;
};
export type PartBRequest = { run_id: string; attempt_id: string; preprocessing: PreprocessingConfig };
export const backendPreprocessingDefaults: PreprocessingConfig = {
  timeline_correction:{duplicate_timestamp_strategy:'keep_first',off_grid_timestamp_strategy:'reject'},
  valid_values:{lower_bound:0,upper_bound:100,boundary_tolerance:0.001,clip_values_within_tolerance:true,clip_generated_values:true},
  series_usability:{maximum_missing_percentage:20},
  outlier:{method:'global_iqr',direction:'lower_only',iqr_multiplier:1.5},
  phase_1:{maximum_anchor_search_minutes:60,maximum_two_sided_distance_minutes:30,maximum_anchor_distance_ratio:2},
  phase_2:{recent_same_type_lookback_days:14,last_week_lookback_days:7,recent_weight:0.8,last_week_weight:0.2,neighbor_offset_minutes:null},
  phase_3:{maximum_same_type_days:4,maximum_lookback_days:30,level_1_window_minutes:15,level_2_window_minutes:30,level_1_min_clean_values:null,level_2_min_clean_values:2,level_4_min_clean_values:2},
  phase_4:{enabled:true,allow_full_series_fallback:true,minimum_history_days:14,minimum_history_points:null,changepoint_prior_scale:0.3,seasonality_prior_scale:20,seasonality_mode:'additive',daily_seasonality:true,weekly_seasonality:true,yearly_seasonality:false,interval_width:0.95,noise_scale:1,random_seed:42},
  save_intermediate_outputs:false,
};
export type FormErrors = Record<string,string>;
export function validatePartB(c: PreprocessingConfig, customGap: boolean): FormErrors {
  const e:FormErrors={}; const err=(k:string,m:string)=>{e[k]=m;};
  const finite = (item: unknown, path: string): void => { if (typeof item === 'number' && !Number.isFinite(item)) err(path, 'Enter a finite number.'); else if (item && typeof item === 'object') for (const [key, value] of Object.entries(item)) finite(value, path ? `${path}.${key}` : key); };
  const {outlier: activeOutlier, gap_profile: gapProfile, ...common} = c;
  finite(common, '');
  finite({method:activeOutlier.method,direction:activeOutlier.direction,...(activeOutlier.method==='user_bounds'?{user_lower_bound:activeOutlier.direction==='upper_only'?undefined:activeOutlier.user_lower_bound,user_upper_bound:activeOutlier.direction==='lower_only'?undefined:activeOutlier.user_upper_bound}:{iqr_multiplier:activeOutlier.iqr_multiplier,...(activeOutlier.method==='one_day_centered_iqr'?{centered_window_minutes:activeOutlier.centered_window_minutes,centered_min_valid_minutes:activeOutlier.centered_min_valid_minutes}:{})})}, 'outlier');
  if(customGap)finite(gapProfile,'gap_profile');
  if(c.valid_values.upper_bound<=c.valid_values.lower_bound)err('valid_values.upper_bound','Must be greater than lower bound.');
  for(const [key,value] of Object.entries(c.valid_values))if(typeof value==='number'&&!Number.isFinite(value))err(`valid_values.${key}`,'Enter a finite number.');
  if(c.valid_values.boundary_tolerance<0 || 2*c.valid_values.boundary_tolerance>=c.valid_values.upper_bound-c.valid_values.lower_bound)err('valid_values.boundary_tolerance','Twice the tolerance must remain below the value range.');
  if(c.series_usability.maximum_missing_percentage<0||c.series_usability.maximum_missing_percentage>100)err('series_usability.maximum_missing_percentage','Use a percentage from 0 to 100.');
  const o=c.outlier;
  if(o.method==='user_bounds') { if(o.direction!=='upper_only'&&o.user_lower_bound===undefined)err('outlier.user_lower_bound','Lower bound is required.'); if(o.direction!=='lower_only'&&o.user_upper_bound===undefined)err('outlier.user_upper_bound','Upper bound is required.'); if(o.direction==='both'&&o.user_lower_bound!==undefined&&o.user_upper_bound!==undefined&&o.user_lower_bound>=o.user_upper_bound)err('outlier.user_upper_bound','Upper bound must exceed lower bound.'); }
  if(o.method!=='user_bounds'&&!(o.iqr_multiplier!>0))err('outlier.iqr_multiplier','Enter a positive IQR multiplier.');
  if(o.method==='one_day_centered_iqr'&&(!(o.centered_window_minutes!>0)||!(o.centered_min_valid_minutes!>0)||o.centered_min_valid_minutes!>o.centered_window_minutes!))err('outlier.centered_min_valid_minutes','Use positive durations; minimum valid duration cannot exceed the window.');
  if(Math.abs(c.phase_2.recent_weight+c.phase_2.last_week_weight-1)>1e-9)err('phase_2.recent_weight','Phase 2 weights must sum to 1.');
  if(c.phase_1.maximum_two_sided_distance_minutes>c.phase_1.maximum_anchor_search_minutes)err('phase_1.maximum_two_sided_distance_minutes','Cannot exceed anchor search.');
  if(c.phase_1.maximum_anchor_distance_ratio<1)err('phase_1.maximum_anchor_distance_ratio','Must be at least 1.');
  if(c.phase_2.recent_same_type_lookback_days<=0||c.phase_2.last_week_lookback_days<=0)err('phase_2.recent_same_type_lookback_days','Lookback values must be positive.');
  if(c.phase_2.recent_weight<0||c.phase_2.recent_weight>1||c.phase_2.last_week_weight<0||c.phase_2.last_week_weight>1)err('phase_2.recent_weight','Weights must be between 0 and 1.');
  if(c.phase_2.neighbor_offset_minutes!==null&&c.phase_2.neighbor_offset_minutes<=0)err('phase_2.neighbor_offset_minutes','Use a positive offset or omit it.');
  if(c.phase_3.level_2_window_minutes<c.phase_3.level_1_window_minutes||c.phase_3.maximum_lookback_days<c.phase_3.maximum_same_type_days)err('phase_3.level_2_window_minutes','Phase 3 windows/lookback settings are inconsistent.');
  if(Object.entries(c.phase_3).some(([k,v])=>k!=='level_1_min_clean_values'&&(!Number.isInteger(v)||Number(v)<=0))||c.phase_3.level_1_min_clean_values!==null&&c.phase_3.level_1_min_clean_values<=0)err('phase_3.maximum_same_type_days','Phase 3 counts and windows must be positive.');
  const p4=c.phase_4;if(p4.minimum_history_days<=0||p4.minimum_history_points!==null&&p4.minimum_history_points<=0||p4.changepoint_prior_scale<=0||p4.seasonality_prior_scale<=0||p4.interval_width<=0||p4.interval_width>=1||p4.noise_scale<0||p4.random_seed<0)err('phase_4','Check Prophet ranges: positive history/prior scales, interval (0,1), noise >= 0, seed >= 0.');
  if(customGap && !c.gap_profile)err('gap_profile','Complete all five custom gap ranges.');
  if(customGap && c.gap_profile){ const a=Object.values(c.gap_profile); if(a.some(x=>!Number.isInteger(x.minimum_points)||x.minimum_points<1))err('gap_profile','Minimum points must be positive integers.');if(a.some(x=>x.maximum_points!==null&&(!Number.isInteger(x.maximum_points)||x.maximum_points<1||x.maximum_points<x.minimum_points)))err('gap_profile','Maximum points must be a positive integer at least its minimum.');if(a[0].minimum_points!==1||a[4].maximum_points!==null)err('gap_profile','Custom ranges must begin at 1 and end open-ended.'); for(let i=0;i<4;i++){const maximum=a[i].maximum_points;if(maximum===null||a[i+1].minimum_points!==maximum+1)err('gap_profile','Ranges must be contiguous and non-overlapping.');} }
  return e;
}
export function buildPartBRequest(runId:string,attemptId:string,c:PreprocessingConfig,customGap:boolean):PartBRequest {
  const errors=validatePartB(c,customGap); if(!runId.trim()||!attemptId.trim())throw new Error('Run ID and attempt ID are required.'); if(Object.keys(errors).length)throw new Error('Correct Part B configuration errors before submitting.');
  const out={...c,outlier:{...c.outlier}};
  if(!customGap) delete (out as Partial<PreprocessingConfig>).gap_profile;
  if(out.outlier.method==='user_bounds'){delete out.outlier.iqr_multiplier;delete out.outlier.centered_window_minutes;delete out.outlier.centered_min_valid_minutes;if(out.outlier.direction==='lower_only')delete out.outlier.user_upper_bound;if(out.outlier.direction==='upper_only')delete out.outlier.user_lower_bound;}
  else {delete out.outlier.user_lower_bound;delete out.outlier.user_upper_bound;if(out.outlier.method==='global_iqr'){delete out.outlier.centered_window_minutes;delete out.outlier.centered_min_valid_minutes;}}
  return {run_id:runId.trim(),attempt_id:attemptId.trim(),preprocessing:out};
}
export async function runPartB(request:PartBRequest):Promise<StandaloneStageResponse>{const r=await mlClient.post<unknown>('/api/v1/preprocessing/run',request,config.mlWorkflowTimeoutMs);return assertStage(r,'part_b');}
export type FeatureEngineeringConfig = CustomFeatureConfig;
export type ProfileFeatureEngineeringConfig={default_profile:'xgboost'|'isolation_forest';default_features:DefaultFeatureSettings;corrected_history:CustomFeatureConfig['corrected_history'];retain_original_columns:boolean;save_intermediate_outputs:boolean};
export type PartCRequest={run_id:string;attempt_id:string;feature_engineering?:FeatureEngineeringConfig|ProfileFeatureEngineeringConfig;model_type_hint?:'xgboost'|'isolation_forest'};
export function defaultPartCRequest(runId:string,attemptId:string,profile:'xgboost'|'isolation_forest'):PartCRequest{return {run_id:runId,attempt_id:attemptId,model_type_hint:profile};}
export function buildCustomPartCRequest(runId:string,attemptId:string,config:CustomFeatureConfig):PartCRequest{if(!runId.trim()||!attemptId.trim())throw new Error('Run ID and attempt ID are required.');const errors=validateFeatures(config.features,config.corrected_history);if(Object.keys(errors).length)throw new Error('Correct the highlighted Part C fields before submitting.');return {run_id:runId.trim(),attempt_id:attemptId.trim(),feature_engineering:config};}
export function buildProfilePartCRequest(runId:string,attemptId:string,profile:'xgboost'|'isolation_forest',settings:DefaultFeatureSettings,corrected_history:CustomFeatureConfig['corrected_history'],retain_original_columns:boolean,save_intermediate_outputs:boolean):PartCRequest{return {run_id:runId.trim(),attempt_id:attemptId.trim(),feature_engineering:{default_profile:profile,default_features:settings,corrected_history,retain_original_columns,save_intermediate_outputs}};}
export async function runPartC(request:PartCRequest):Promise<StandaloneStageResponse>{const r=await mlClient.post<unknown>('/api/v1/feature-engineering/run',request,config.mlWorkflowTimeoutMs);return assertStage(r,'part_c');}
function assertStage(value:unknown,stage:'part_b'|'part_c'):StandaloneStageResponse{if(!value||typeof value!=='object')throw new Error(`Unexpected Part ${stage==='part_b'?'B':'C'} response.`);const v=value as StandaloneStageResponse;if(!['completed','failed','partially_completed'].includes(v.status)||v.requested_stage!==stage||!Array.isArray(v.executions)||typeof v.run_id!=='string'||typeof v.attempt_id!=='string')throw new Error(`Unexpected Part ${stage==='part_b'?'B':'C'} response.`);return v;}
