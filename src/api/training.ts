import { config } from '../config/env';
import { mlClient } from './mlClient';
import type { StandaloneStageResponse } from './workflowTypes';

export type ModelType = 'xgboost' | 'isolation_forest';
export type Strategy = 'direct' | 'fixed' | 'optuna';
export type Direction = 'lower_only' | 'upper_only' | 'both';
export type Scalar = string | number | boolean;
export type NumericDraft = string | number;
export type ParameterSet = Record<string, Scalar>;
export type SearchParameter = { type?: 'int' | 'float' | 'categorical'; low?: NumericDraft; high?: NumericDraft; log?: boolean; choices?: Scalar[] | string };
export type TrainingForm = {
  model: ModelType; direction: Direction; strategy: Strategy;
  direct?: ParameterSet; candidates?: ParameterSet[]; search?: Record<string, SearchParameter>;
  split?: Record<string, NumericDraft>; tuning?: Record<string, Scalar>; calibration?: { residual_quantile: NumericDraft };
  optuna?: { n_trials?: NumericDraft; sampler_seed?: NumericDraft };
};
export const xgboostFields = ['learning_rate','max_depth','min_child_weight','subsample','colsample_bytree','reg_alpha','reg_lambda','gamma'] as const;
export const isolationFields = ['n_estimators','max_samples','contamination','max_features','bootstrap'] as const;
export const defaultParameters: Record<ModelType, ParameterSet> = {
  xgboost: {learning_rate:.05,max_depth:3,min_child_weight:5,subsample:.8,colsample_bytree:.8,reg_alpha:0,reg_lambda:1,gamma:0},
  isolation_forest: {n_estimators:300,max_samples:'auto',contamination:.01,max_features:1,bootstrap:false},
};
export const defaultSearch: Record<ModelType, Record<string, SearchParameter>> = {
  xgboost: {learning_rate:{low:.01,high:.2,log:true},max_depth:{low:2,high:10},min_child_weight:{low:1,high:20},subsample:{low:.5,high:1},colsample_bytree:{low:.5,high:1},reg_alpha:{low:0,high:5},reg_lambda:{low:0,high:10},gamma:{low:0,high:5}},
  isolation_forest: {n_estimators:{type:'int',low:100,high:500},max_samples:{type:'categorical',choices:['auto',.7,.8,.9,1]},contamination:{type:'categorical',choices:[.01]},max_features:{type:'float',low:.5,high:1},bootstrap:{type:'categorical',choices:[false,true]}},
};
export const defaultSplits: Record<ModelType, Record<Strategy, Record<string, number>>> = {
  xgboost: {direct:{train_percentage:70,calibration_percentage:15,test_percentage:15},fixed:{train_percentage:60,validation_percentage:10,calibration_percentage:15,test_percentage:15},optuna:{train_percentage:60,validation_percentage:10,calibration_percentage:15,test_percentage:15}},
  isolation_forest: {direct:{train_percentage:85,test_percentage:15},fixed:{train_percentage:70,validation_percentage:15,test_percentage:15},optuna:{train_percentage:70,validation_percentage:15,test_percentage:15}},
};
export const freshTrainingForm = (model: ModelType = 'xgboost', strategy: Strategy = 'direct'): TrainingForm => ({model,direction:'lower_only',strategy});
const decimalPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const integerPattern = /^[+-]?\d+$/;
export function parseDecimal(value: unknown): number | undefined {
  if(typeof value==='number')return Number.isFinite(value)?value:undefined;
  if(typeof value!=='string'||!decimalPattern.test(value))return undefined;
  const parsed=Number(value);return Number.isFinite(parsed)?parsed:undefined;
}
export function parseInteger(value: unknown): number | undefined {
  if(typeof value==='number')return Number.isSafeInteger(value)?value:undefined;
  if(typeof value!=='string'||!integerPattern.test(value))return undefined;
  const parsed=Number(value);return Number.isSafeInteger(parsed)?parsed:undefined;
}
function parseParameter(model:ModelType,key:string,value:Scalar):Scalar|undefined {
  if(model==='isolation_forest'&&key==='bootstrap')return typeof value==='boolean'?value:undefined;
  if(model==='isolation_forest'&&(key==='max_samples'||key==='contamination')&&value==='auto')return 'auto';
  if(key==='max_depth'||key==='n_estimators')return parseInteger(value);
  if(model==='isolation_forest'&&(key==='max_samples'||key==='max_features')){
    const integer=parseInteger(value);
    if(integer!==undefined)return integer;
    return parseDecimal(value);
  }
  return parseDecimal(value);
}
function validParameter(model: ModelType, key: string, value: Scalar): boolean {
  const parsed=parseParameter(model,key,value);
  if(parsed===undefined)return false;
  if(model==='xgboost') {
    if(typeof parsed!=='number')return false;
    if(key==='max_depth') return parsed>=0;
    if(key==='learning_rate') return parsed>0;
    if(key==='subsample'||key==='colsample_bytree') return parsed>0&&parsed<=1;
    return parsed>=0;
  }
  if(key==='bootstrap') return typeof parsed==='boolean';
  if(key==='n_estimators') return typeof parsed==='number'&&parsed>0;
  if(key==='max_samples') return parsed==='auto'||typeof parsed==='number'&&parsed>0&&(parseInteger(value)!==undefined||parsed<=1);
  if(key==='contamination') return parsed==='auto'||typeof parsed==='number'&&parsed>0&&parsed<=.5;
  return typeof parsed==='number'&&parsed>0&&(parseInteger(value)!==undefined||parsed<=1);
}
function parseChoices(model:ModelType,key:string,value:Scalar[]|string|undefined):Scalar[]|undefined {
  if(value===undefined)return undefined;
  const entries=typeof value==='string'?value.split(',').map(item=>item.trim()):value;
  if(!entries.length)return undefined;
  const parsed=entries.map(item=>key==='bootstrap'&&typeof item==='string'?(item==='true'?true:item==='false'?false:undefined):parseParameter(model,key,item));
  return parsed.some(item=>item===undefined)?undefined:parsed as Scalar[];
}
function numericRecord(value:Record<string,NumericDraft>):Record<string,number>{return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,parseDecimal(item)!]));}
function parameterRecord(model:ModelType,value:ParameterSet):ParameterSet{return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,parseParameter(model,key,item)!]));}
export function validateTraining(form: TrainingForm): Record<string,string> {
  const errors: Record<string,string>={}; const keys=form.model==='xgboost'?xgboostFields:isolationFields;
  const check=(set:ParameterSet,prefix:string)=>{for(const key of keys) if(!(key in set)||!validParameter(form.model,key,set[key]))errors[`${prefix}.${key}`]='Enter a valid value for this model.';for(const key of Object.keys(set))if(!keys.includes(key as never))errors[`${prefix}.${key}`]='Unsupported parameter.';};
  if(form.strategy==='direct'&&form.direct)check(form.direct,'direct');
  if(form.strategy==='fixed'&&form.candidates){if(!form.candidates.length)errors.candidates='Add a candidate or use backend defaults.';form.candidates.forEach((set,i)=>check(set,`candidates.${i}`));}
  if(form.strategy==='optuna'&&form.search){
    for(const key of keys) {
      const spec=form.search[key];const prefix=`search.${key}`;
      if(!spec){errors[prefix]='Provide every search parameter.';continue;}
      if(Object.keys(spec).some(field=>!['type','low','high','log','choices'].includes(field)))errors[prefix]='Unsupported search setting.';
      if(form.model==='isolation_forest'&&['max_samples','contamination','bootstrap'].includes(key)){
        const choices=parseChoices(form.model,key,spec.choices);
        if(spec.type!=='categorical'||!choices?.length||choices.some(v=>!validParameter(form.model,key,v))||spec.low!==undefined||spec.high!==undefined||spec.log)errors[prefix]='Provide valid nonempty categorical choices.';
      } else {
        if(form.model==='isolation_forest'&&(spec.type!==(key==='n_estimators'?'int':'float')||spec.choices!==undefined)||form.model==='xgboost'&&(spec.type!==undefined||spec.choices!==undefined))errors[prefix]='Choose the backend range type.';
        const low=key==='max_depth'||key==='n_estimators'?parseInteger(spec.low):parseDecimal(spec.low);
        const high=key==='max_depth'||key==='n_estimators'?parseInteger(spec.high):parseDecimal(spec.high);
        if(low===undefined||high===undefined||low>=high||spec.log&&low<=0||!validParameter(form.model,key,spec.low as Scalar)||!validParameter(form.model,key,spec.high as Scalar))errors[prefix]='Use valid increasing bounds; logarithmic lows must be positive.';
      }
    }
    if(Object.keys(form.search).some(key=>!keys.includes(key as never)))errors.search='Unsupported search parameter.';
  }
  if(form.split){const required=Object.keys(defaultSplits[form.model][form.strategy]);const values=Object.entries(form.split);if(values.length!==required.length||values.some(([key,value])=>!required.includes(key)||parseDecimal(value)===undefined||parseDecimal(value)!<=0)||Math.abs(values.reduce((sum,[,value])=>sum+(parseDecimal(value)??0),0)-100)>1e-9)errors.split='Provide all required positive percentages totaling 100.';}
  if(form.model==='xgboost'){
    const t=form.strategy!=='direct'?form.tuning:undefined;if(t){if(!['mae','rmse'].includes(String(t.primary_selection_metric))||!['mae','rmse'].includes(String(t.secondary_selection_metric))||t.primary_selection_metric===t.secondary_selection_metric)errors.tuning_metrics='Choose distinct MAE and RMSE metrics.';if(parseInteger(t.max_estimators)===undefined||parseInteger(t.max_estimators)!<=0||parseInteger(t.early_stopping_rounds)===undefined||parseInteger(t.early_stopping_rounds)!<=0)errors.tuning_counts='Use positive whole counts.';}
    if(form.calibration){const quantile=parseDecimal(form.calibration.residual_quantile);if(quantile===undefined||quantile<=.5||quantile>=1)errors.residual_quantile='Use a decimal fraction greater than 0.5 and less than 1.';}
  }
  if(form.strategy==='optuna'&&form.optuna&&(form.optuna.n_trials!==undefined&&(parseInteger(form.optuna.n_trials)===undefined||parseInteger(form.optuna.n_trials)!<=0)||form.optuna.sampler_seed!==undefined&&parseInteger(form.optuna.sampler_seed)===undefined))errors.optuna='Use a positive trial count and a whole-number seed.';
  return errors;
}
export function buildTrainingRequest(runId:string,attemptId:string,form:TrainingForm){
  if(!runId.trim()||!attemptId.trim())throw new Error('Both run_id and attempt_id are required.');
  if(Object.keys(validateTraining(form)).length)throw new Error('Correct the highlighted training settings.');
  const enabled=form.strategy!=='direct';
  const training:Record<string,unknown>={model_type:form.model,threshold_direction:form.direction,hyperparameter_tuning_enabled:enabled,hyperparameter_tuning_method:enabled?form.strategy:'fixed'};
  if(form.split)training.split=numericRecord(form.split);
  if(form.strategy==='direct'&&form.direct)training.hyperparameters=parameterRecord(form.model,form.direct);
  if(form.strategy==='fixed'&&form.candidates)training.hyperparameter_candidates=form.candidates.map(item=>parameterRecord(form.model,item));
  if(form.strategy==='optuna') {
    if(form.search)training.optuna_search_space=Object.fromEntries(Object.entries(form.search).map(([key,spec])=>[key,spec.type==='categorical'?{type:'categorical',choices:parseChoices(form.model,key,spec.choices)}:{...(spec.type?{type:spec.type}:{}),low:parseDecimal(spec.low)!,high:parseDecimal(spec.high)!,log:Boolean(spec.log)}]));
    if(form.optuna)training.optuna={...(form.optuna.n_trials===undefined?{}:{n_trials:parseInteger(form.optuna.n_trials)}),...(form.optuna.sampler_seed===undefined?{}:{sampler_seed:parseInteger(form.optuna.sampler_seed)})};
  }
  if(enabled&&form.model==='xgboost'&&form.tuning)training.tuning={primary_selection_metric:form.tuning.primary_selection_metric,secondary_selection_metric:form.tuning.secondary_selection_metric,max_estimators:parseInteger(form.tuning.max_estimators),early_stopping_rounds:parseInteger(form.tuning.early_stopping_rounds)};
  if(form.model==='xgboost'&&form.calibration)training.calibration={residual_quantile:parseDecimal(form.calibration.residual_quantile)};
  return {run_id:runId.trim(),attempt_id:attemptId.trim(),training};
}
export async function runTraining(request:ReturnType<typeof buildTrainingRequest>):Promise<StandaloneStageResponse>{
  const value=await mlClient.post<unknown>('/api/v1/training/run',request,config.mlWorkflowTimeoutMs);
  if(!value||typeof value!=='object')throw new Error('Unexpected Part D response.');
  const result=value as StandaloneStageResponse;
  if(result.requested_stage!=='part_d'||!Array.isArray(result.executions)||typeof result.run_id!=='string'||typeof result.attempt_id!=='string'||typeof result.inference_ready!=='boolean'||!['completed','failed','partially_completed'].includes(result.status))throw new Error('Unexpected Part D response.');
  return result;
}
