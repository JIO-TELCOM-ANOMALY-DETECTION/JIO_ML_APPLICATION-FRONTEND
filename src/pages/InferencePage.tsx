import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/httpClient';
import { runInference, validInferenceRunId, validateInferenceInput, type InferenceRequest, type InferenceResponse } from '../api/inference';
import { reportKeys, useInferenceReports } from '../api/reportQueries';
import { reportErrorMessage } from '../api/reportErrorDisplay';
import { getRun } from '../api/runsApi';
import { runKeys } from '../api/runQueries';
import type { RunSummaryResponse } from '../api/runTypes';
import { safeWorkflowMessage, safeWorkflowValue } from '../api/workflowErrorDisplay';
import { LifecycleStatus } from '../components/common/LifecycleStatus';
import { Identifier } from '../components/common/Identifier';
import { PageContainer } from '../components/common/PageContainer';
import { PageHeader } from '../components/common/PageHeader';
import { GuideButton } from './HelpPages';
import { formGuideTargets } from './guideContent';
import { SectionCard } from '../components/common/SectionCard';
import { formatDate } from './runsHelpers';

function errorDetails(error: unknown, context: 'verification' | 'execution'): { title: string; detail: unknown } {
  if (!(error instanceof ApiError)) return { title: `${context === 'verification' ? 'Run verification' : 'Inference'} failed`, detail: safeWorkflowMessage(error instanceof Error ? error.message : 'Unknown error') };
  const body = error.body && typeof error.body === 'object' ? error.body as Record<string, unknown> : {};
  const structured = body.error && typeof body.error === 'object' ? body.error as Record<string, unknown> : {};
  const code = String(error.code ?? structured.error_code ?? structured.code ?? '').toUpperCase();
  const title = error.kind === 'timeout' ? 'Request timed out' : error.kind === 'network' ? 'Network failure' : code.includes('RUN_NOT_FOUND') ? 'Unknown run' : code.includes('NOT_INFERENCE_READY') ? 'Run not inference-ready' : code.startsWith('API_INPUT_') || code.includes('FILE_NOT_FOUND') || code.includes('FILE_UNREADABLE') ? 'Server input file missing or unreadable' : code.includes('HISTORY') || code.includes('GAP') ? 'Inference history validation failed' : code.includes('LATE_DATA') || code.includes('RECONSTRUCTION') ? 'Late-data reconstruction failed' : error.status === 422 ? 'Invalid request' : error.status === 404 ? context === 'verification' ? 'Unknown run' : 'Run or server file not found' : error.status === 409 ? 'Lifecycle conflict or run not inference-ready' : error.status === 400 ? 'Input validation failed' : 'Request failed';
  const validation = Array.isArray(body.detail) ? body.detail.map(item => {
    if (!item || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    return { field: Array.isArray(record.loc) ? record.loc.join('.') : undefined, message: typeof record.msg === 'string' ? record.msg : undefined };
  }).filter(Boolean) : undefined;
  return { title, detail: safeWorkflowValue({ code: error.code ?? structured.error_code ?? structured.code, message: typeof structured.message === 'string' ? structured.message : error.message, details: structured.details, validation }) };
}
function ErrorView({ error, context }: { error: unknown; context: 'verification' | 'execution' }) {
  const { title, detail } = errorDetails(error, context);
  return <Alert severity="error"><strong>{title}</strong><Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', mb: 0 }}>{JSON.stringify(detail, null, 2)}</Box></Alert>;
}
function CopyId({ label, value }: { label: string; value: string }) { return <Identifier label={label} value={value}/>; }
function Result({ result, another }: { result: InferenceResponse; another: () => void }) {
  const runPath = `/runs/${encodeURIComponent(result.run_id)}`;
  const attemptPath = `${runPath}/attempts/${encodeURIComponent(result.training_attempt_id)}`;
  const reportPath = `${runPath}/inference/${encodeURIComponent(result.invocation_id)}`;
  return <SectionCard title="Inference result"><Stack spacing={1.5}><Alert severity={result.status === 'completed' ? 'success' : result.status === 'cancelled' ? 'warning' : 'error'}><strong>{result.status === 'completed' ? 'Completed' : result.status === 'cancelled' ? 'Cancelled' : 'Failed'}</strong>: {safeWorkflowMessage(result.message)}</Alert><CopyId label="Run ID" value={result.run_id}/><CopyId label="Training attempt ID" value={result.training_attempt_id}/><CopyId label="Invocation ID" value={result.invocation_id}/>{Object.keys(result.summary).length > 0 && <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(safeWorkflowValue(result.summary), null, 2)}</Box>}{result.error && <Alert severity="error">{result.error.error_code && `${safeWorkflowMessage(result.error.error_code)}: `}{safeWorkflowMessage(result.error.message)}{result.error.details && Object.keys(result.error.details).length > 0 && <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(safeWorkflowValue(result.error.details), null, 2)}</Box>}</Alert>}<Stack direction="row" gap={1} flexWrap="wrap"><Button component={RouterLink} to={runPath}>Run details</Button><Button component={RouterLink} to={attemptPath}>Training attempt details</Button><Button component={RouterLink} to={reportPath}>Inference report</Button></Stack><Button variant="outlined" onClick={another} sx={{ alignSelf: 'flex-start' }}>{result.status === 'completed' ? 'Run another inference' : 'Prepare another inference'}</Button></Stack></SectionCard>;
}

export function InferencePage() {
  const [params] = useSearchParams();
  const queryRunId = params.get('run_id') ?? '';
  const [runId, setRunId] = useState(queryRunId);
  const [verified, setVerified] = useState<RunSummaryResponse>();
  const [verifyError, setVerifyError] = useState<unknown>();
  const [verifying, setVerifying] = useState(false);
  const verificationSeq = useRef(0);
  const [inputFile, setInputFile] = useState('');
  const [days, setDays] = useState('1');
  const [formError, setFormError] = useState(false);
  const [result, setResult] = useState<InferenceResponse>();
  const [historyLimit,setHistoryLimit]=useState(10);
  const lock = useRef(false);
  const qc = useQueryClient();
  const history = useInferenceReports(verified?.run_id ?? '');
  useEffect(() => { verificationSeq.current++; setRunId(queryRunId); setVerified(undefined); setVerifyError(undefined); setVerifying(false); setResult(undefined); setInputFile(''); setDays('1'); }, [queryRunId]);
  const changeRun = (value: string) => { verificationSeq.current++; setRunId(value); setVerified(undefined); setVerifyError(undefined); setVerifying(false); setResult(undefined); setInputFile(''); setDays('1'); setFormError(false); setHistoryLimit(10); };
  const verify = async () => {
    const trimmed = runId.trim(); changeRun(trimmed);
    if (!validInferenceRunId(trimmed)) { setVerifyError(new Error('Run ID must be 1–96 characters and contain only letters, numbers, dots, underscores, or hyphens; it must start with a letter or number.')); return; }
    const seq = verificationSeq.current; setVerifying(true);
    try { const run = await getRun(trimmed); if (seq === verificationSeq.current) setVerified(run); }
    catch (error) { if (seq === verificationSeq.current) setVerifyError(error); }
    finally { if (seq === verificationSeq.current) setVerifying(false); }
  };
  const mutation = useMutation({ mutationFn: runInference, onSuccess: response => { setResult(response); const run = response.run_id; void qc.invalidateQueries({ queryKey: runKeys.all }); void qc.invalidateQueries({ queryKey: runKeys.detail(run) }); if (response.training_attempt_id) void qc.invalidateQueries({ queryKey: runKeys.attempt(run, response.training_attempt_id) }); void qc.invalidateQueries({ queryKey: reportKeys.run(run) }); void qc.invalidateQueries({ queryKey: reportKeys.inferences(run) }); if (response.invocation_id) void qc.invalidateQueries({ queryKey: reportKeys.inference(run, response.invocation_id) }); }, onSettled: () => { lock.current = false; } });
  useEffect(() => { const handler = (event: BeforeUnloadEvent) => { if (mutation.isPending) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [mutation.isPending]);
  const valid = validateInferenceInput(inputFile, days);
  const ready = verified?.run_id === runId.trim() && verified.inference_ready === true;
  const submit = (event: React.FormEvent) => { event.preventDefault(); setFormError(true); if (!ready || mutation.isPending || lock.current || Object.keys(valid).length) return; lock.current = true; setResult(undefined); const request: InferenceRequest = { run_id: verified.run_id, input_file: inputFile.trim(), inference_days: Number(days.trim()) }; mutation.mutate(request); };
  return <PageContainer><PageHeader title="Inference" description="Execute inference against a verified, inference-ready training run."/><Box sx={{mb:2}}><GuideButton guide={formGuideTargets.inference[0]} section={formGuideTargets.inference[1]}/></Box><Stack spacing={2}>
    <SectionCard title="Select run"><Stack spacing={1.5}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><TextField label="Run ID" value={runId} onChange={event => changeRun(event.target.value)} disabled={mutation.isPending} fullWidth/><Button variant="contained" onClick={() => void verify()} disabled={verifying || mutation.isPending}>Verify</Button></Stack>{verifying && <Typography role="status">Verifying run…</Typography>}{verifyError != null && <ErrorView error={verifyError} context="verification"/>}{verified && <Stack spacing={.5}><Typography><strong>Run ID:</strong> {verified.run_id}</Typography><Typography><strong>Run status:</strong> {verified.status}</Typography><Typography><strong>inference_ready:</strong> {String(verified.inference_ready)}</Typography><Typography><strong>Active inference attempt ID:</strong> {verified.active_inference_attempt_id ?? 'Unavailable'}</Typography><Typography><strong>Created:</strong> {formatDate(verified.created_at_utc)}</Typography><Typography><strong>Updated:</strong> {formatDate(verified.updated_at_utc)}</Typography><Typography><strong>Completed:</strong> {formatDate(verified.completed_at_utc)}</Typography><Stack direction="row" gap={1}><Button component={RouterLink} to={`/runs/${encodeURIComponent(verified.run_id)}`}>Run details</Button>{verified.active_inference_attempt_id && <Button component={RouterLink} to={`/runs/${encodeURIComponent(verified.run_id)}/attempts/${encodeURIComponent(verified.active_inference_attempt_id)}`}>Active attempt details</Button>}</Stack>{!verified.inference_ready && <Alert severity="warning">Training and inference bootstrap must complete before this run can be used for inference.</Alert>}</Stack>}</Stack></SectionCard>
    {ready && <SectionCard title="Execute inference"><form onSubmit={submit}><Stack spacing={1.5}><Alert severity="info">Enter a CSV path readable on the ML backend machine. Selecting a file on your computer does not upload it. Inference is synchronous; keep this page open until it finishes.</Alert><TextField label="Server-readable CSV path" value={inputFile} onChange={event => setInputFile(event.target.value)} error={formError && Boolean(valid.input_file)} helperText={formError && valid.input_file} fullWidth/><TextField label="Inference days" value={days} onChange={event => setDays(event.target.value)} inputProps={{ inputMode: 'numeric' }} error={formError && Boolean(valid.inference_days)} helperText={formError && valid.inference_days}/><Card variant="outlined"><CardContent><Typography variant="subtitle2">Request review</Typography><Typography>Run ID: {verified.run_id}</Typography><Typography>Backend-selected training attempt: {verified.active_inference_attempt_id ?? 'Resolved by backend'}</Typography><Typography>Input path: {inputFile.trim() || '—'}</Typography><Typography>Inference days: {days.trim() || '—'}</Typography></CardContent></Card><Button type="submit" variant="contained" disabled={mutation.isPending || Object.keys(valid).length > 0}>{mutation.isPending ? 'Running inference…' : 'Execute Inference'}</Button>{mutation.isPending && <Typography role="status">Inference is running. Keep this page open.</Typography>}</Stack></form></SectionCard>}
    {mutation.error && <ErrorView error={mutation.error} context="execution"/>}{result && <Result result={result} another={() => { setResult(undefined); setInputFile(''); setDays('1'); setFormError(false); mutation.reset(); }}/>} 
    {verified && <SectionCard title="Inference history">{history.isPending ? <Typography>Loading invocation history…</Typography> : history.isError ? <Alert severity="warning">Reporting history could not load: {reportErrorMessage(history.error.message)} <Button onClick={() => void history.refetch()}>Retry history</Button></Alert> : history.data?.invocations.length ? <Stack spacing={1}>{history.data.invocations.slice(0,historyLimit).map(item => <Card variant="outlined" key={item.invocation_id}><CardContent><Stack spacing={.5}><Typography><strong>Invocation ID:</strong> {item.invocation_id}</Typography><Typography>Training attempt ID: {item.training_attempt_id ?? '—'}</Typography><LifecycleStatus status={item.status ?? 'unknown'}/><Typography>Started: {formatDate(item.started_at_utc)}</Typography><Typography>Completed: {formatDate(item.completed_at_utc)}</Typography>{item.metrics && <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(safeWorkflowValue(item.metrics), null, 2)}</Box>}<Button component={RouterLink} to={`/runs/${encodeURIComponent(verified.run_id)}/inference/${encodeURIComponent(item.invocation_id)}`} sx={{ alignSelf: 'flex-start' }}>Details / report</Button></Stack></CardContent></Card>)}</Stack> : <Typography>No inference invocations exist for this run.</Typography>}{history.data && history.data.invocations.length>historyLimit && <Button onClick={()=>setHistoryLimit(limit=>limit+10)}>Show more invocations</Button>}<Button onClick={() => void history.refetch()} disabled={history.isFetching}>Refresh history</Button></SectionCard>}
    <SectionCard title="Saved training and late data"><Typography variant="body2">The server uses the run’s saved dataset mappings, bucket, preprocessing, features, model, and history settings. You do not re-enter training settings. New forward data extends inference history. Supported late data within the maintained window may trigger reconstruction when the saved bootstrap policy allows it; older data may be ignored. Inference never retrains the model.</Typography></SectionCard>
  </Stack></PageContainer>;
}
