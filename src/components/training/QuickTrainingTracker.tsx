import { useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAttempt, useRun } from '../../api/runQueries';

export function QuickTrainingTracker({ runId }: { runId: string }) {
  const run = useRun(runId, true);
  const attemptId = run.data?.latest_attempt_id || run.data?.attempts.at(-1)?.attempt_id || '';
  const detail = useAttempt(runId, attemptId, !!run.data && !run.data.inference_ready && !['failed', 'partially_completed'].includes(run.data.status));
  const attempt = detail.data?.attempt ?? run.data?.attempts.find(item => item.attempt_id === attemptId);
  const [copyMessage, setCopyMessage] = useState('');
  const failed = ['failed', 'partially_completed'].includes(run.data?.status ?? '') || ['failed', 'partially_completed'].includes(attempt?.status ?? '') || attempt?.stages.some(stage => stage.status === 'failed');
  const ready = run.data?.inference_ready;
  const progress = failed ? 'Training failed. Review run and attempt details.' : ready ? 'Training completed. Inference-ready.' : !attemptId ? 'Waiting for attempt creation.' : attempt?.status === 'completed' ? 'Training completed. Waiting for inference readiness.' : attempt?.stages.some(stage => stage.status === 'running') ? 'Stages running.' : 'Attempt created. Waiting for stages.';
  async function copy() {
    try { await navigator.clipboard.writeText(runId); setCopyMessage('Run ID copied.'); }
    catch { setCopyMessage('Copy unavailable. Select and copy the displayed Run ID.'); }
  }
  return <Stack spacing={1}>
    <Alert severity={failed ? 'error' : 'success'}>Quick Training accepted. Run ID: {runId}. {progress}</Alert>
    <Typography sx={{ overflowWrap: 'anywhere' }}>Run ID: {runId}</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap">
      <Button onClick={() => void copy()}>Copy run ID</Button>
      <Button component={RouterLink} to={`/runs/${encodeURIComponent(runId)}?quick_training=1`}>Track run</Button>
      {attemptId && <Button component={RouterLink} to={`/runs/${encodeURIComponent(runId)}/attempts/${encodeURIComponent(attemptId)}`}>Review attempt</Button>}
      {ready && <Button component={RouterLink} to={`/inference?run_id=${encodeURIComponent(runId)}`}>Run inference</Button>}
    </Stack>
    {copyMessage && <Typography role="status">{copyMessage}</Typography>}
    {run.isError || detail.isError ? <Alert severity="warning">Tracking could not refresh. Your submission will not be resubmitted. Check Runs &amp; Models with Run ID: {runId}.</Alert> : null}
    {attempt?.stages.map(stage => <Typography key={stage.stage}>{stage.stage.replaceAll('_', ' ')}: {stage.status}</Typography>)}
  </Stack>;
}
