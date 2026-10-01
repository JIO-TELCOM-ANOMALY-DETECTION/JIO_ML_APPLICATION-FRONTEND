import { describe, expect, it } from 'vitest';
import { newFeature, defaultCleaning, defaultCorrectedHistory, parseNumericList, validateFeatures, type Feature } from './featureBuilder';
import { buildCustomPartCRequest } from './stageBC';

const kinds:Feature['type'][]=['current_value','lag','rolling','time_bucket','time_cyclic','calendar','difference','percentage_change','seasonal_difference','rolling_zscore','ewma','rolling_slope','baseline','residual'];
describe('custom Part C feature contract',()=>{
 it('constructs a valid typed request for every backend feature discriminator',()=>{for(const type of kinds){const feature=newFeature(type);expect(feature.type).toBe(type);expect(validateFeatures([feature],defaultCorrectedHistory)).toEqual({});const request=buildCustomPartCRequest('run','attempt',{features:[feature],corrected_history:defaultCorrectedHistory,retain_original_columns:true,save_intermediate_outputs:false});expect(request.feature_engineering).toMatchObject({features:[{type}]});}});
 it('parses list values strictly',()=>{expect(parseNumericList('1, 2').values).toEqual([1,2]);expect(parseNumericList('1,,2').error).toBeDefined();expect(parseNumericList('1,1').error).toMatch(/Duplicate/);expect(parseNumericList('0').error).toMatch(/positive/);});
 it('rejects empty custom feature lists and corrected-history cleaning conflict',()=>{expect(validateFeatures([],defaultCorrectedHistory)).toHaveProperty('features');const feature=newFeature('lag');if(feature.type==='lag'){feature.source='corrected_history';feature.point_cleaning={...defaultCleaning,enabled:true};}expect(validateFeatures([feature],defaultCorrectedHistory)).toHaveProperty('features.0.point_cleaning.enabled');});
 it('validates baseline source restrictions and weights',()=>{const feature=newFeature('baseline');if(feature.type==='baseline'){feature.baseline.source='corrected_history';feature.baseline.anchor_window_each_side_points=1;}expect(validateFeatures([feature],defaultCorrectedHistory)['features.0.baseline.anchor_window_each_side_points']).toMatch(/zero/);});
});
