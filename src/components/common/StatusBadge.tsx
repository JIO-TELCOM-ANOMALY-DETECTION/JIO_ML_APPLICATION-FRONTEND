import {Chip} from '@mui/material';import type {HealthState} from '../../types';
export function StatusBadge({state}:{state:HealthState}){return <Chip size="small" label={state} color={state==='healthy'?'success':state==='unavailable'?'error':'default'}/>;}
