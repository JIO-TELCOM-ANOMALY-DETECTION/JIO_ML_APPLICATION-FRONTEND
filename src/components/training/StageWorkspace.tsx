import { Alert, Box, Breadcrumbs, Button, Card, CardContent, Chip, Link, Stack, Step, StepLabel, Stepper, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { StandaloneStageResponse } from '../../api/workflowTypes';
import type { StageView } from '../../api/runTypes';
import { completedResponse, completedStage, guidedPath, type GuidedStage } from '../../api/guidedNavigation';
import { safeWorkflowMessage, safeWorkflowValue } from '../../api/workflowErrorDisplay';
import { LifecycleStatus } from '../common/LifecycleStatus';
import { Identifier } from '../common/Identifier';
import { InfoTooltip, KeyValueTable, RawJsonDisclosure } from '../common/ReportWidgets';
import { GuideButton } from '../../pages/HelpPages';
import { formGuideTargets } from '../../pages/guideContent';

const stages = ['Part A - EDA', 'Part B - Preprocessing', 'Part C - Features', 'Part D - Training'];
export function StageWorkspace({ title, description, stage = 'part_a', runId, attemptId, attemptStages, pending, result, error, children }: { title: string; description: string; stage?: GuidedStage; runId?: string; attemptId?: string; attemptStages?: StageView[]; pending?: boolean; result?: StandaloneStageResponse; error?: string; children: ReactNode }) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const navigationRunId = runId || result?.run_id;
  const navigationAttemptId = attemptId || result?.attempt_id;
  const ids = Boolean(navigationRunId && navigationAttemptId);
  const aDone = result?.requested_stage === 'part_a' ? completedResponse(result, 'part_a') : completedStage(attemptStages, 'part_a');
  const bDone = result?.requested_stage === 'part_b' ? completedResponse(result, 'part_b') : completedStage(attemptStages, 'part_b');
  const cDone = completedStage(attemptStages, 'part_c') || completedResponse(result, 'part_c');
  const bStatus = attemptStages?.find(item => item.stage === 'part_b')?.status;
  const cStatus = attemptStages?.find(item => item.stage === 'part_c')?.status;
  const responseAllowsContinue = !result || completedResponse(result, stage);
  const dDone = completedStage(attemptStages, 'part_d') || completedResponse(result, 'part_d');
  const dStatus = attemptStages?.find(item => item.stage === 'part_d')?.status;
  const names: GuidedStage[] = ['part_a', 'part_b', 'part_c', 'part_d'];
  const done = [aDone, bDone, cDone, dDone];
  const currentLabel = `Part ${stage.split('_')[1].toUpperCase()}`;
  return <Box><Breadcrumbs sx={{ mb: 2 }}><Link component={RouterLink} to="/training/guided">Guided training</Link><Typography color="text.primary">{currentLabel}</Typography></Breadcrumbs><Typography component="h1" variant="h4">{title}</Typography><Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>{description}</Typography><Box sx={{mb:2}}><GuideButton guide={formGuideTargets.guided[stage][0]} section={formGuideTargets.guided[stage][1]}/></Box>
    <Stepper activeStep={names.indexOf(stage)} orientation={compact ? 'vertical' : 'horizontal'} alternativeLabel={!compact} sx={{ mb: 3 }}>{stages.map((label, index) => { const available = index === 0 || index === 1 && ids && aDone && bStatus !== 'running' || index === 2 && ids && bDone && cStatus !== 'running' || index === 3 && ids && cDone && dStatus !== 'running'; const note = index > 0 && !available ? `Complete Part ${String.fromCharCode(64+index)} first` : names[index] === stage ? 'Current' : done[index] ? 'Completed' : undefined; return <Step key={label} completed={done[index]} disabled={!available}><StepLabel optional={note ? <Typography variant="caption">{note}</Typography> : undefined}>{available && names[index] !== stage ? <Link component={RouterLink} to={ids ? guidedPath(names[index], navigationRunId!, navigationAttemptId!) : '/training/guided/part-a'} underline="hover">{label}</Link> : label}</StepLabel></Step>; })}</Stepper>
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start"><Box sx={{ width: { xs: '100%', lg: 'auto' }, flex: { lg: '1 1 0%' }, minWidth: 0 }}>{children}</Box><Card variant="outlined" sx={{ width: { xs: '100%', lg: 280 }, flexShrink: 0 }}><CardContent><Typography component="h2" variant="h6">Workspace context <InfoTooltip label="Run and attempt selection" description="A run contains training attempts. Each attempt contains stages, and each stage can have executions. Reuse these IDs to continue the same attempt." href="/help/runs-and-reports#browse"/></Typography><Stack spacing={1} sx={{ mt: 1 }}>{runId?<Identifier label="Run ID" value={runId}/>:<Typography>Run ID: Not assigned</Typography>}{attemptId?<Identifier label="Attempt ID" value={attemptId}/>:<Typography>Attempt ID: Not assigned</Typography>}<Chip size="small" label={pending ? `${currentLabel} running` : result?.status ?? `${currentLabel} ready`} color={pending ? 'info' : result?.status === 'completed' ? 'success' : result?.status === 'failed' ? 'error' : 'default'} sx={{ alignSelf: 'flex-start' }}/></Stack></CardContent></Card></Stack>
    {pending && <Alert severity="info" role="status" sx={{ mt: 2 }}>{currentLabel} is running synchronously. Keep this page open and do not refresh it. There is no reliable client-side cancellation or background continuation guarantee.</Alert>}
    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    {ids && responseAllowsContinue && stage === 'part_a' && aDone && !bDone && bStatus !== 'running' && <Button component={RouterLink} to={guidedPath('part_b', navigationRunId!, navigationAttemptId!)} variant="contained" sx={{ mt: 2 }}>Continue to Part B</Button>}
    {ids && responseAllowsContinue && (stage === 'part_a' || stage === 'part_b') && bDone && !cDone && cStatus !== 'running' && <Button component={RouterLink} to={guidedPath('part_c', navigationRunId!, navigationAttemptId!)} variant="contained" sx={{ mt: 2 }}>Continue to Part C</Button>}
    {ids && responseAllowsContinue && cDone && !dDone && dStatus !== 'running' && stage !== 'part_d' && <Button component={RouterLink} to={guidedPath('part_d', navigationRunId!, navigationAttemptId!)} variant="contained" sx={{ mt: 2 }}>Continue to Part D</Button>}
    {result && <WorkflowResult result={result}/>}
  </Box>;
}
function WorkflowResult({ result }: { result: StandaloneStageResponse }) {
  return <Card variant="outlined" sx={{ mt: 2 }}><CardContent><Stack direction="row" spacing={1} alignItems="center"><Typography component="h2" variant="h6">Part {result.requested_stage.split('_')[1].toUpperCase()} response</Typography><LifecycleStatus status={result.status}/></Stack><Typography sx={{ mt: 1 }}>{safeWorkflowMessage(result.message)}</Typography><Typography sx={{ mt: 1 }}>Run ID: <strong>{result.run_id}</strong></Typography><Typography>Attempt ID: <strong>{result.attempt_id}</strong></Typography><Typography>Next stage: {result.next_stage ?? 'None'}</Typography><Data title="Summary" value={result.summary}/>{result.error && <Alert severity="error" sx={{ mt: 1 }}>{result.error.error_code ? `${result.error.error_code}: ` : ''}{safeWorkflowMessage(result.error.message)}</Alert>}<Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} sx={{ mt: 2 }}><Button component={RouterLink} to={`/runs/${encodeURIComponent(result.run_id)}`} variant="outlined">Open run details</Button><Button component={RouterLink} to={`/runs/${encodeURIComponent(result.run_id)}/attempts/${encodeURIComponent(result.attempt_id)}`} variant="outlined">Open attempt details</Button>{result.executions.filter(item => item.stage === result.requested_stage && item.status === 'completed').map(item => <Button key={item.execution_id} component={RouterLink} to={`/runs/${encodeURIComponent(result.run_id)}/attempts/${encodeURIComponent(result.attempt_id)}/reports/${result.requested_stage}`} variant="outlined">Open Part {result.requested_stage.split('_')[1].toUpperCase()} report</Button>)}</Stack><Typography component="h3" variant="subtitle1" sx={{ mt: 2 }}>Executions</Typography>{result.executions.map(execution => <Box key={execution.execution_id} sx={{ borderLeft: 2, borderColor: 'divider', pl: 1.5, mt: 1 }}><Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={600}>{execution.stage}</Typography><LifecycleStatus status={execution.status}/></Stack><Typography variant="body2">Execution ID: {execution.execution_id}</Typography><Data title="Execution summary" value={execution.summary}/>{execution.error && <Alert severity="error">{execution.error.error_code ? `${execution.error.error_code}: ` : ''}{safeWorkflowMessage(execution.error.message)}</Alert>}</Box>)}</CardContent></Card>;
}
function Data({ title, value }: { title: string; value: Record<string, unknown> }) { if (!Object.keys(value).length) return null; return <Box sx={{ mt: 1 }}><Typography variant="subtitle2">{title}</Typography><KeyValueTable values={safeWorkflowValue(value) as Record<string, unknown>}/><RawJsonDisclosure value={safeWorkflowValue(value)}/></Box>; }
