import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { backendPreprocessingDefaults, validatePartB, type PreprocessingConfig } from '../../api/stageBC';
import { Phase4Editor } from './Phase4Editor';
import { InfoTooltip } from '../common/ReportWidgets';

type Props = { value: PreprocessingConfig; onChange: (value: PreprocessingConfig) => void; customGap: boolean; onCustomGapChange: (value: boolean) => void; drafts: Record<string, string>; onDraftsChange: (value: Record<string, string>) => void };
const names = (key: string) => key.replaceAll('_', ' ');
export function QuickPartBEditor({ value, onChange, customGap, onCustomGapChange, drafts, onDraftsChange }: Props) {
  const [advanced, setAdvanced] = useState(false);
  const errors = validatePartB(value, customGap);
  const update = (section: keyof PreprocessingConfig, key: string, next: unknown) => onChange({ ...value, [section]: { ...(value[section] as object), [key]: next } });
  const numeric = (section: keyof PreprocessingConfig, key: string, optional = false, fieldLabel = names(key)) => {
    const path = `${section}.${key}`; const current = (value[section] as unknown as Record<string, unknown>)[key];
    return <TextField key={`${path}.${fieldLabel}`} fullWidth label={fieldLabel} type="text" inputProps={{ inputMode: 'decimal' }} value={drafts[path] ?? (current ?? '')} error={Boolean(errors[path]) || (typeof current === 'number' && !Number.isFinite(current))} helperText={errors[path]} onChange={e => {
      const raw = e.target.value; onDraftsChange({ ...drafts, [path]: raw });
      update(section, key, optional && raw === '' ? null : raw.trim() === '' ? Number.NaN : Number(raw));
    }} />;
  };
  const boolean = (section: keyof PreprocessingConfig, key: string) => <TextField key={`${section}.${key}`} select fullWidth label={names(key)} value={String((value[section] as unknown as Record<string, unknown>)[key])} onChange={e => update(section, key, e.target.value === 'true')}><MenuItem value="true">Yes</MenuItem><MenuItem value="false">No</MenuItem></TextField>;
  const gap = (name: keyof NonNullable<PreprocessingConfig['gap_profile']>, bound: 'minimum_points' | 'maximum_points') => {
    const path = `gap_profile.${name}.${bound}`; const current = value.gap_profile?.[name][bound];
    return <TextField key={path} label={`${names(name)} ${names(bound)}`} type="text" inputProps={{ inputMode: 'numeric' }} value={drafts[path] ?? (current ?? '')} onChange={e => {
      const raw = e.target.value; onDraftsChange({ ...drafts, [path]: raw });
      onChange({ ...value, gap_profile: { ...value.gap_profile!, [name]: { ...value.gap_profile![name], [bound]: raw === '' ? Number.NaN : Number(raw) } } });
    }} />;
  };
  const outlierControls = (advancedView = false) => {
    const prefix = advancedView ? 'Advanced ' : '';
    return <>
      <TextField select label={`${prefix}Outlier method`} value={value.outlier.method} onChange={e => {
        onDraftsChange(Object.fromEntries(Object.entries(drafts).filter(([key]) => !key.startsWith('outlier.'))));
        onChange({ ...value, outlier: { method: e.target.value as PreprocessingConfig['outlier']['method'], direction: value.outlier.direction, ...(e.target.value === 'user_bounds' ? {} : { iqr_multiplier: 1.5 }), ...(e.target.value === 'one_day_centered_iqr' ? { centered_window_minutes: 1440, centered_min_valid_minutes: 720 } : {}) } });
      }}><MenuItem value="global_iqr">Global IQR</MenuItem><MenuItem value="one_day_centered_iqr">One day centered IQR</MenuItem><MenuItem value="user_bounds">User bounds</MenuItem></TextField>
      <TextField select label={`${prefix}Outlier direction`} value={value.outlier.direction} onChange={e => update('outlier', 'direction', e.target.value)}><MenuItem value="lower_only">Lower only</MenuItem><MenuItem value="upper_only">Upper only</MenuItem><MenuItem value="both">Both</MenuItem></TextField>
      <InfoTooltip label="Outlier direction" description="Determines which side of the final IQR bounds is checked. Both flags values below the lower bound and above the upper bound. Default: both." href="/help/training/part-b#outliers"/>
      {value.outlier.method === 'user_bounds' ? <>{value.outlier.direction !== 'upper_only' && numeric('outlier', 'user_lower_bound', false, `${prefix}user lower bound`)}{value.outlier.direction !== 'lower_only' && numeric('outlier', 'user_upper_bound', false, `${prefix}user upper bound`)}</> : numeric('outlier', 'iqr_multiplier', false, `${prefix}iqr multiplier`)}
      {value.outlier.method === 'one_day_centered_iqr' && <>{numeric('outlier', 'centered_window_minutes', false, `${prefix}centered window minutes`)}{numeric('outlier', 'centered_min_valid_minutes', false, `${prefix}centered min valid minutes`)}</>}
    </>;
  };
  return <Stack spacing={2}>
    <Card variant="outlined"><CardContent><Typography variant="h6">Basic preprocessing settings</Typography><Stack spacing={2} sx={{ mt: 2 }}>
      {outlierControls()}
      {numeric('series_usability', 'maximum_missing_percentage')}{<TextField select label="Save intermediate outputs" value={String(value.save_intermediate_outputs)} onChange={e => onChange({ ...value, save_intermediate_outputs: e.target.value === 'true' })}><MenuItem value="false">No</MenuItem><MenuItem value="true">Yes</MenuItem></TextField>}
      <Button onClick={() => { onChange(structuredClone(backendPreprocessingDefaults)); onCustomGapChange(false); onDraftsChange({}); }}>Use backend defaults</Button>
    </Stack></CardContent></Card>
    <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} aria-expanded={advanced} onClick={() => setAdvanced(x => !x)}>{advanced ? 'Hide advanced settings' : 'Show advanced settings'}</Button>
    {advanced && <Card variant="outlined"><CardContent><Stack spacing={2}><Typography variant="h6">Advanced preprocessing settings</Typography><Typography variant="subtitle1">Outlier settings</Typography>{outlierControls(true)}<Typography variant="body2">Timeline correction uses the backend's fixed keep first and reject strategies.</Typography>
      {(['lower_bound', 'upper_bound', 'boundary_tolerance'] as const).map(key => numeric('valid_values', key))}{boolean('valid_values', 'clip_values_within_tolerance')}{boolean('valid_values', 'clip_generated_values')}
      <TextField select label="Gap profile" value={customGap ? 'custom' : 'builtin'} onChange={e => { const custom = e.target.value === 'custom'; onCustomGapChange(custom); if (custom && !value.gap_profile) onChange({ ...value, gap_profile: { phase_1: { minimum_points: 1, maximum_points: 2 }, phase_2: { minimum_points: 3, maximum_points: 4 }, phase_3: { minimum_points: 5, maximum_points: 6 }, phase_4_pass_1: { minimum_points: 7, maximum_points: 8 }, phase_4_pass_2: { minimum_points: 9, maximum_points: null } } }); }}><MenuItem value="builtin">Backend built in</MenuItem><MenuItem value="custom">Custom ranges</MenuItem></TextField>
      {customGap && value.gap_profile && <><Typography variant="subtitle1">Custom gap ranges</Typography>{(Object.keys(value.gap_profile) as Array<keyof NonNullable<PreprocessingConfig['gap_profile']>>).map(name => <Box key={name} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>{gap(name, 'minimum_points')}{name === 'phase_4_pass_2' ? <Typography>Open ended</Typography> : gap(name, 'maximum_points')}</Box>)}{errors.gap_profile && <Alert severity="error">{errors.gap_profile}</Alert>}</>}
      <Typography variant="subtitle1">Phase 1</Typography>{Object.keys(value.phase_1).map(key => numeric('phase_1', key))}
      <Typography variant="subtitle1">Phase 2</Typography>{Object.keys(value.phase_2).map(key => numeric('phase_2', key, key === 'neighbor_offset_minutes'))}
      <Typography variant="subtitle1">Phase 3</Typography>{Object.keys(value.phase_3).map(key => numeric('phase_3', key, key === 'level_1_min_clean_values'))}
      <Phase4Editor value={value.phase_4} onChange={phase_4 => onChange({ ...value, phase_4 })} error={errors.phase_4}/>
    </Stack></CardContent></Card>}
    {Object.keys(errors).length > 0 && <Alert severity="error">Correct the highlighted Part B fields.</Alert>}
  </Stack>;
}
