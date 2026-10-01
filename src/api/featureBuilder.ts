export type Source='raw_value'|'corrected_history';
export const STATUS_LABELS: Record<number, string> = { [-2]: 'inserted timestamp', [-1]: 'invalid value converted to NaN', 0: 'missing value', 1: 'valid original value', 2: 'detected outlier', 3: 'safely filled value', 4: 'risk-filled value' };
export function parseStatusList(input: string): { values: number[]; error?: string } {
  if (!input.trim()) return { values: [] };
  const tokens = input.split(',').map(token => token.trim());
  if (tokens.some(token => !/^-?\d+$/.test(token))) return { values: [], error: 'Use comma-separated whole numbers, for example 2, 4.' };
  const values = [...new Set(tokens.map(Number))];
  if (values.some(value => !(value in STATUS_LABELS))) return { values: [], error: 'Supported statuses are -2, -1, 0, 1, 2, 3, and 4.' };
  return { values };
}
export type Cleaning={enabled:boolean;method:'local_median';bad_statuses:number[];accepted_statuses:number[];half_window_minutes:number|null;half_window_points:number|null;minimum_valid_points:number;unavailable_strategy:'nan'|'keep_source'};
export type Baseline={method:'weighted_seasonal';source:Source;anchor_statuses:number[];recent_fallback_days:number;weekly_fallback_weeks:number;recent_weight:number;weekly_weight:number;anchor_window_each_side_points:number;slot_fallback_points:number;slot_tolerance_minutes:number|null;minimum_history_days:number};
type CleaningFields={point_cleaning?:Cleaning};
export type Feature =
 | {type:'current_value'}
 | ({type:'lag';lags:number[];source:Source}&CleaningFields)
 | {type:'rolling';statistics:Array<'mean'|'median'|'mad'|'std'|'min'|'max'|'range'|'iqr'>;windows:number[];source:Source;minimum_periods:number|null;std_ddof:0|1}
 | {type:'time_bucket';bucket_minutes:number[]}
 | {type:'time_cyclic';features:Array<'sin_tod'|'cos_tod'>}
 | {type:'calendar';features:Array<'is_weekend'|'day_of_week'|'day_sin'|'day_cos'>}
 | ({type:'difference';lags:number[];source:Source}&CleaningFields)
 | ({type:'percentage_change';lags:number[];source:Source;zero_denominator_strategy:'nan'}&CleaningFields)
 | ({type:'seasonal_difference';lags:number[];source:Source}&CleaningFields)
 | {type:'rolling_zscore';windows:number[];source:Source;minimum_periods:number|null;std_ddof:0|1;zero_std_strategy:'nan'}
 | {type:'ewma';spans:number[];source:Source;adjust:false}
 | {type:'rolling_slope';windows:number[];source:Source;minimum_periods:number|null}
 | {type:'baseline';baseline:Baseline}
 | {type:'residual';source:Source;baseline:Baseline;include_baseline_column:true};
export type CorrectedHistory={bad_statuses:number[];replace_missing_values:boolean;replacement_method:'trailing_median';replacement_window_minutes:number|null;replacement_window_points:number|null;minimum_periods:number;forward_fill_remaining:boolean};
export type CustomFeatureConfig={features:Feature[];corrected_history:CorrectedHistory;retain_original_columns:boolean;save_intermediate_outputs:boolean};
export type XGBoostDefaultSettings={time_bucket_minutes:number[];calendar_features:Array<'is_weekend'|'day_of_week'|'day_sin'|'day_cos'>;lag_source:Source;lag_point_cleaning_enabled:boolean;include_previous_point_lag:boolean;include_daily_lag:boolean;include_weekly_lag:boolean;rolling_source:Source;rolling_statistics:Array<'mean'|'median'|'mad'|'std'|'min'|'max'|'range'|'iqr'>;rolling_window_minutes:number[]};
export type IsolationForestDefaultSettings={time_bucket_minutes:number[];calendar_features:Array<'is_weekend'|'day_of_week'|'day_sin'|'day_cos'>;lag_source:Source;lag_point_cleaning_enabled:boolean;include_daily_lag:boolean;rolling_source:Source;rolling_statistics:Array<'mean'|'median'|'mad'|'std'|'min'|'max'|'range'|'iqr'>;rolling_window_minutes:number[];residual_source:Source;baseline_source:Source;baseline_anchor_statuses:number[];baseline_anchor_window_each_side_points:number;time_cyclic_features:Array<'sin_tod'|'cos_tod'>};
export type DefaultFeatureSettings={xgboost:XGBoostDefaultSettings;isolation_forest:IsolationForestDefaultSettings};
export const defaultFeatureSettings:DefaultFeatureSettings={xgboost:{time_bucket_minutes:[30],calendar_features:['is_weekend'],lag_source:'corrected_history',lag_point_cleaning_enabled:false,include_previous_point_lag:true,include_daily_lag:true,include_weekly_lag:true,rolling_source:'corrected_history',rolling_statistics:['median','mad'],rolling_window_minutes:[60]},isolation_forest:{time_bucket_minutes:[30],calendar_features:['is_weekend'],lag_source:'corrected_history',lag_point_cleaning_enabled:false,include_daily_lag:true,rolling_source:'corrected_history',rolling_statistics:['median'],rolling_window_minutes:[60],residual_source:'raw_value',baseline_source:'raw_value',baseline_anchor_statuses:[1,3],baseline_anchor_window_each_side_points:1,time_cyclic_features:['sin_tod','cos_tod']}};
export function validateDefaultSettings(profile:'xgboost'|'isolation_forest',settings:DefaultFeatureSettings):Record<string,string>{const x=profile==='xgboost'?settings.xgboost:settings.isolation_forest;const e:Record<string,string>={};if(!x.time_bucket_minutes.length||x.time_bucket_minutes.some(v=>!Number.isInteger(v)||v<=0||1440%v!==0)||new Set(x.time_bucket_minutes).size!==x.time_bucket_minutes.length)e.time_bucket_minutes='Use unique positive values that divide 1440.';if(!x.calendar_features.length||new Set(x.calendar_features).size!==x.calendar_features.length)e.calendar_features='Select unique calendar features.';if(!x.rolling_statistics.length||new Set(x.rolling_statistics).size!==x.rolling_statistics.length)e.rolling_statistics='Select unique rolling statistics.';if(!x.rolling_window_minutes.length||x.rolling_window_minutes.some(v=>!Number.isInteger(v)||v<=0)||new Set(x.rolling_window_minutes).size!==x.rolling_window_minutes.length)e.rolling_window_minutes='Use unique positive whole minutes.';if(x.lag_source==='corrected_history'&&x.lag_point_cleaning_enabled)e.lag_point_cleaning_enabled='Local cleaning requires raw_value.';if(profile==='isolation_forest'){const f=settings.isolation_forest;if(!f.baseline_anchor_statuses.length||f.baseline_anchor_statuses.some(v=>!(v in STATUS_LABELS))||new Set(f.baseline_anchor_statuses).size!==f.baseline_anchor_statuses.length)e.baseline_anchor_statuses='Enter unique anchor statuses.';if(f.baseline_anchor_window_each_side_points<0||!Number.isInteger(f.baseline_anchor_window_each_side_points))e.baseline_anchor_window_each_side_points='Use a non-negative whole point count.';if(f.baseline_source==='corrected_history'&&f.baseline_anchor_window_each_side_points!==0)e.baseline_anchor_window_each_side_points='Must be zero for corrected_history.';if(!f.time_cyclic_features.length||new Set(f.time_cyclic_features).size!==f.time_cyclic_features.length)e.time_cyclic_features='Select unique cyclic features.';}return e;}
export const defaultCleaning:Cleaning={enabled:false,method:'local_median',bad_statuses:[2],accepted_statuses:[1,3,4],half_window_minutes:720,half_window_points:null,minimum_valid_points:1,unavailable_strategy:'nan'};
export const defaultBaseline:Baseline={method:'weighted_seasonal',source:'raw_value',anchor_statuses:[1,3],recent_fallback_days:14,weekly_fallback_weeks:3,recent_weight:.8,weekly_weight:.2,anchor_window_each_side_points:1,slot_fallback_points:10,slot_tolerance_minutes:null,minimum_history_days:7};
export const defaultCorrectedHistory:CorrectedHistory={bad_statuses:[2],replace_missing_values:true,replacement_method:'trailing_median',replacement_window_minutes:60,replacement_window_points:null,minimum_periods:1,forward_fill_remaining:true};
export function newFeature(type:Feature['type']):Feature {
 switch(type){case'current_value':return{type};case'lag':return{type,lags:[1],source:'corrected_history'};case'rolling':return{type,statistics:['median'],windows:[12],source:'corrected_history',minimum_periods:null,std_ddof:1};case'time_bucket':return{type,bucket_minutes:[30]};case'time_cyclic':return{type,features:['sin_tod','cos_tod']};case'calendar':return{type,features:['is_weekend']};case'difference':return{type,lags:[1],source:'corrected_history'};case'percentage_change':return{type,lags:[1],source:'corrected_history',zero_denominator_strategy:'nan'};case'seasonal_difference':return{type,lags:[288],source:'corrected_history'};case'rolling_zscore':return{type,windows:[12],source:'corrected_history',minimum_periods:null,std_ddof:1,zero_std_strategy:'nan'};case'ewma':return{type,spans:[12],source:'corrected_history',adjust:false};case'rolling_slope':return{type,windows:[12],source:'corrected_history',minimum_periods:null};case'baseline':return{type,baseline:{...defaultBaseline,anchor_statuses:[...defaultBaseline.anchor_statuses]}};case'residual':return{type,source:'raw_value',baseline:{...defaultBaseline,anchor_statuses:[...defaultBaseline.anchor_statuses]},include_baseline_column:true};}
}
export function validateFeatures(features: Feature[], history: CorrectedHistory): Record<string, string> {
  const errors: Record<string, string> = {};
  const positive = (values: number[], field: string) => {
    if (!values.length || values.some(value => !Number.isInteger(value) || value <= 0) || new Set(values).size !== values.length) errors[field] = 'Use unique positive whole numbers.';
  };
  const statuses = (values: number[], field: string) => {
    if (values.some(value => !(value in STATUS_LABELS)) || new Set(values).size !== values.length) errors[field] = 'Use supported statuses from -2 through 4, without duplicates.';
  };
  const cleaning = (value: Cleaning, prefix: string) => {
    statuses(value.bad_statuses, `${prefix}.bad_statuses`);
    statuses(value.accepted_statuses, `${prefix}.accepted_statuses`);
    if (!value.enabled) return;
    if (!value.bad_statuses.length || !value.accepted_statuses.length) errors[`${prefix}.bad_statuses`] = 'Enabled cleaning requires non-empty bad and accepted statuses.';
    if (value.bad_statuses.some(status => value.accepted_statuses.includes(status))) errors[`${prefix}.accepted_statuses`] = 'Bad and accepted status sets must be disjoint.';
    if ((value.half_window_minutes === null) === (value.half_window_points === null)) errors[`${prefix}.half_window_minutes`] = 'Set exactly one window representation.';
    if ((value.half_window_minutes ?? value.half_window_points ?? 0) <= 0) errors[`${prefix}.half_window_minutes`] = 'Window must be positive.';
    if (value.minimum_valid_points <= 0) errors[`${prefix}.minimum_valid_points`] = 'Minimum valid points must be positive.';
    if (value.half_window_points !== null && value.minimum_valid_points > 2 * value.half_window_points + 1) errors[`${prefix}.minimum_valid_points`] = 'Minimum valid points exceeds the configured window.';
  };

  if (!features.length) errors.features = 'Add at least one feature.';
  features.forEach((feature, index) => {
    const prefix = `features.${index}`;
    if ('point_cleaning' in feature && feature.point_cleaning) {
      if (feature.source === 'corrected_history' && feature.point_cleaning.enabled) errors[`${prefix}.point_cleaning.enabled`] = 'Local cleaning requires raw_value source.';
      cleaning(feature.point_cleaning, `${prefix}.point_cleaning`);
    }
    if ('lags' in feature) positive(feature.lags, `${prefix}.lags`);
    if ('windows' in feature) {
      positive(feature.windows, `${prefix}.windows`);
      if ('minimum_periods' in feature && feature.minimum_periods !== null && (feature.minimum_periods <= 0 || feature.minimum_periods > Math.min(...feature.windows))) errors[`${prefix}.minimum_periods`] = 'Must be positive and no greater than the smallest window.';
      if (feature.type === 'rolling_slope' && feature.windows.some(value => value < 2)) errors[`${prefix}.windows`] = 'Slope windows must be at least 2.';
    }
    if (feature.type === 'ewma') positive(feature.spans, `${prefix}.spans`);
    if (feature.type === 'rolling' && (!feature.statistics.length || new Set(feature.statistics).size !== feature.statistics.length)) errors[`${prefix}.statistics`] = 'Choose unique statistics.';
    if (feature.type === 'time_bucket') {
      positive(feature.bucket_minutes, `${prefix}.bucket_minutes`);
      if (feature.bucket_minutes.some(value => 1440 % value !== 0)) errors[`${prefix}.bucket_minutes`] = 'Every bucket must divide 1440 minutes exactly.';
    }
    if ((feature.type === 'time_cyclic' || feature.type === 'calendar') && (!feature.features.length || new Set(feature.features).size !== feature.features.length)) errors[`${prefix}.features`] = 'Choose unique values.';
    if ('baseline' in feature) {
      const baseline = feature.baseline;
      statuses(baseline.anchor_statuses, `${prefix}.baseline.anchor_statuses`);
      if (!baseline.anchor_statuses.length) errors[`${prefix}.baseline.anchor_statuses`] = 'Select at least one anchor status.';
      if (baseline.recent_fallback_days <= 0) errors[`${prefix}.baseline.recent_fallback_days`] = 'Must be positive.';
      if (baseline.weekly_fallback_weeks <= 0) errors[`${prefix}.baseline.weekly_fallback_weeks`] = 'Must be positive.';
      if (baseline.slot_fallback_points <= 0) errors[`${prefix}.baseline.slot_fallback_points`] = 'Must be positive.';
      if (baseline.minimum_history_days <= 0) errors[`${prefix}.baseline.minimum_history_days`] = 'Must be positive.';
      if (baseline.anchor_window_each_side_points < 0) errors[`${prefix}.baseline.anchor_window_each_side_points`] = 'Cannot be negative.';
      if (baseline.slot_tolerance_minutes !== null && baseline.slot_tolerance_minutes <= 0) errors[`${prefix}.baseline.slot_tolerance_minutes`] = 'Must be positive or omitted.';
      if (baseline.recent_weight < 0 || baseline.recent_weight > 1) errors[`${prefix}.baseline.recent_weight`] = 'Weight must be between 0 and 1.';
      if (baseline.weekly_weight < 0 || baseline.weekly_weight > 1) errors[`${prefix}.baseline.weekly_weight`] = 'Weight must be between 0 and 1.';
      if (Math.abs(baseline.recent_weight + baseline.weekly_weight - 1) > 1e-9) errors[`${prefix}.baseline.weekly_weight`] = 'Weights must sum to 1.';
      if (baseline.source === 'corrected_history' && baseline.anchor_window_each_side_points !== 0) errors[`${prefix}.baseline.anchor_window_each_side_points`] = 'Must be zero for corrected_history.';
    }
  });

  statuses(history.bad_statuses, 'corrected_history.bad_statuses');
  if (!history.bad_statuses.length && !history.replace_missing_values) errors.corrected_history_bad_statuses = 'Clean a status or replace missing values.';
  if ((history.replacement_window_minutes === null) === (history.replacement_window_points === null)) errors.corrected_history_window = 'Set exactly one replacement window.';
  if ((history.replacement_window_minutes ?? history.replacement_window_points ?? 0) <= 0) errors.corrected_history_window = 'Window must be positive.';
  if (history.minimum_periods <= 0) errors.corrected_history_minimum_periods = 'Must be positive.';
  if (history.replacement_window_points !== null && history.minimum_periods > history.replacement_window_points) errors.corrected_history_minimum_periods = 'Cannot exceed the point window.';
  return errors;
}
export function parseNumericList(value:string):{values:number[];error?:string}{const tokens=value.split(',');if(tokens.some(x=>!x.trim()))return{values:[],error:'Remove blank list entries.'};const values=tokens.map(x=>Number(x.trim()));if(values.some(x=>!Number.isFinite(x)||!Number.isInteger(x)))return{values,error:'Use whole numbers only.'};if(new Set(values).size!==values.length)return{values,error:'Duplicate values are not allowed.'};if(values.some(x=>x<=0))return{values,error:'Values must be positive.'};return{values};}

