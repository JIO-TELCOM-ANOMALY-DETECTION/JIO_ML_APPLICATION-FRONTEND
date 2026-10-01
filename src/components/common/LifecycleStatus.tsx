import { Chip } from '@mui/material';
export function LifecycleStatus({ status }: { status: string }) {
  const color = status === 'completed' ? 'success' : status === 'failed' || status === 'cancelled' ? 'error' : status === 'running' ? 'info' : 'default';
  return <Chip size="small" label={status.replaceAll('_', ' ')} color={color} variant="outlined" aria-label={`Status: ${status.replaceAll('_', ' ')}`} />;
}
