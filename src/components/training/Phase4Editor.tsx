import { Box, MenuItem, TextField, Typography } from '@mui/material';
import type { PreprocessingConfig } from '../../api/stageBC';

type Phase4 = PreprocessingConfig['phase_4'];
export function Phase4Editor({ value, onChange, error }: { value: Phase4; onChange: (value: Phase4) => void; error?: string }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2,minmax(0,1fr))' }, gap: 2 }}>
    <Typography variant="subtitle1" sx={{ gridColumn: '1 / -1' }}>Phase 4 / Prophet details</Typography>
    {Object.entries(value).map(([key, item]) => {
      const choice = typeof item === 'boolean' || key === 'seasonality_mode';
      return <TextField key={key} fullWidth label={key.replaceAll('_', ' ')} select={choice} type={choice ? undefined : 'number'} value={choice ? String(item ?? '') : item ?? ''} error={Boolean(error) && key === 'minimum_history_days'} helperText={key === 'minimum_history_days' ? error : undefined}
        onChange={event => onChange({ ...value, [key]: typeof item === 'boolean' ? event.target.value === 'true' : key === 'seasonality_mode' ? event.target.value : event.target.value === '' ? null : Number(event.target.value) })}>
        {typeof item === 'boolean' ? [<MenuItem key="true" value="true">Yes</MenuItem>, <MenuItem key="false" value="false">No</MenuItem>] : key === 'seasonality_mode' ? [<MenuItem key="additive" value="additive">Additive</MenuItem>, <MenuItem key="multiplicative" value="multiplicative">Multiplicative</MenuItem>] : undefined}
      </TextField>;
    })}
  </Box>;
}
