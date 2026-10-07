import { Alert, Box, Breadcrumbs, Button, Card, CardContent, Link, Stack, Typography } from '@mui/material';
import Refresh from '@mui/icons-material/Refresh';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { ApiError } from '../api/httpClient';
import { reportErrorMessage } from '../api/reportErrorDisplay';
import { isReportStage, isValidReportId } from '../api/reportingApi';
import { useInferenceReport, useStageReport } from '../api/reportQueries';
import type { ReportEnvelope, ReportKpiDetail, StructuredValue } from '../api/reportTypes';
import { ArtifactList, ReportSection, StructuredData } from '../components/reporting/ReportData';
import { InferenceResults } from '../components/reporting/InferenceResults';
import { KeyValueTable, RawJsonDisclosure, SummaryCard } from '../components/common/ReportWidgets';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { LifecycleStatus } from '../components/common/LifecycleStatus';
import { LoadingState } from '../components/common/LoadingState';
import { PageContainer } from '../components/common/PageContainer';
import { PageHeader } from '../components/common/PageHeader';
import { display, formatDate } from './runsHelpers';

const stageName = (stage: string) => ({ part_a: 'Part A — EDA and prepared dataset', part_b: 'Part B — preprocessing', part_c: 'Part C — feature engineering', part_d: 'Part D — model training' }[stage] ?? stage);
function ReportError({ error, retry }: { error: Error; retry: () => void }) {
  const apiError = error instanceof ApiError ? error : undefined;
  const isNotFound = apiError?.status === 404;
  const isStageUnavailable = apiError?.status === 409 || apiError?.code === 'STAGE_NOT_COMPLETED' || apiError?.code === 'NO_SUCCESSFUL_EXECUTION';
  return <Stack spacing={1}><ErrorAlert message={`${isNotFound ? 'Report not found' : isStageUnavailable ? 'Stage report unavailable' : 'Reporting service error'}: ${reportErrorMessage(error.message)}${apiError?.code ? ` (${apiError.code})` : ''}`}/><Button variant="outlined" onClick={retry} sx={{ alignSelf: 'flex-start' }}>Retry report request</Button></Stack>;
}
function InvalidReportRoute({ message }: { message: string }) { return <PageContainer><PageHeader title="Invalid report URL" description={message}/><EmptyState title="Report not requested" description="Check the run, attempt, invocation or stage value in the URL."/><Button component={RouterLink} to="/runs" variant="outlined">Return to Runs & Models</Button></PageContainer>; }

export function StageReportPage() {
  const { runId = '', attemptId = '', stage = '' } = useParams();
  const validIds = isValidReportId(runId) && isValidReportId(attemptId); const validStage = isReportStage(stage);
  const query = useStageReport(runId, attemptId, stage);
  if (!validIds) return <InvalidReportRoute message="The run or attempt ID does not match the supported identifier format."/>;
  if (!validStage) return <InvalidReportRoute message="Only Part A, Part B, Part C and Part D reports are supported."/>;
  return <PageContainer><Breadcrumbs sx={{ mb: 2 }}><Link component={RouterLink} to="/runs">Runs & Models</Link><Link component={RouterLink} to={`/runs/${encodeURIComponent(runId)}`}>Run {runId}</Link><Link component={RouterLink} to={`/runs/${encodeURIComponent(runId)}/attempts/${encodeURIComponent(attemptId)}`}>Attempt {attemptId}</Link><Typography color="text.primary">{stageName(stage)}</Typography></Breadcrumbs><PageHeader title={`${stageName(stage)} report`} description={`Persisted report for attempt ${attemptId}.`}/>{query.isPending ? <LoadingState label="Loading stage report"/> : query.isError ? <ReportError error={query.error} retry={() => void query.refetch()}/> : query.data && <ReportDocument report={query.data} kind="stage"/>}{query.isFetching && query.data && <Typography role="status">Refreshing stage report…</Typography>}{query.data && <Button startIcon={<Refresh/>} onClick={() => void query.refetch()} disabled={query.isFetching}>Refresh report</Button>}</PageContainer>;
}
export function InferenceReportPage() {
  const { runId = '', invocationId = '' } = useParams(); const validIds = isValidReportId(runId) && isValidReportId(invocationId); const query = useInferenceReport(runId, invocationId);
  if (!validIds) return <InvalidReportRoute message="The run or invocation ID does not match the supported identifier format."/>;
  return <PageContainer><Breadcrumbs sx={{ mb: 2 }}><Link component={RouterLink} to="/runs">Runs & Models</Link><Link component={RouterLink} to={`/runs/${encodeURIComponent(runId)}`}>Run {runId}</Link><Typography color="text.primary">Inference {invocationId}</Typography></Breadcrumbs><PageHeader title="Inference report" description={`Persisted inference invocation ${invocationId}.`}/>{query.isPending ? <LoadingState label="Loading inference report"/> : query.isError ? <ReportError error={query.error} retry={() => void query.refetch()}/> : query.data && <ReportDocument report={query.data} kind="inference"/>}{query.isFetching && query.data && <Typography role="status">Refreshing inference report…</Typography>}{query.data && <Button startIcon={<Refresh/>} onClick={() => void query.refetch()} disabled={query.isFetching}>Refresh report</Button>}</PageContainer>;
}

function ReportDocument({ report, kind }: { report: ReportEnvelope; kind: 'stage' | 'inference' }) {
  return <><Card variant="outlined"><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}><Typography variant="h6">Report details</Typography><LifecycleStatus status={report.status}/></Stack><Box component="dl" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(120px, 1fr) minmax(0, 2fr)', sm: '180px minmax(0, 3fr)' }, gap: 1, overflowWrap: 'anywhere' }}><Definition label="Run ID" value={report.run_id}/><Definition label="Attempt ID" value={report.attempt_id}/><Definition label="Stage" value={report.stage}/><Definition label="Execution ID" value={report.execution_id}/><Definition label="Invocation ID" value={report.invocation_id}/><Definition label="Training attempt ID" value={report.training_attempt_id}/><Definition label="Generated" value={formatDate(report.generated_at)}/></Box></CardContent></Card>
    {report.warnings.length > 0 && <ReportSection title="Warnings"><Stack spacing={1}>{report.warnings.map((warning, index) => <Alert severity="warning" key={index}>{warning}</Alert>)}</Stack></ReportSection>}
    <ReportSection title="Summary">{kind === 'inference' ? <><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1 }}>{[['Run ID', report.run_id], ['Attempt ID', report.training_attempt_id], ['Invocation ID', report.invocation_id], ['Processed rows', report.summary.total_processed_rows], ['Anomalies', report.summary.total_anomalies], ['Normal rows', report.summary.normal_row_count], ['Anomaly percentage', report.summary.anomaly_percentage === undefined ? undefined : `${report.summary.anomaly_percentage}%`], ['Input start', report.summary.inference_start], ['Input end', report.summary.inference_end_exclusive]].map(([label, value]) => <SummaryCard key={String(label)} label={String(label)} value={value}/>)}</Box><KeyValueTable values={report.summary}/><RawJsonDisclosure value={report.summary}/></> : <><StructuredData title="Returned summary" value={report.summary}/><RawJsonDisclosure value={report.summary}/></>}</ReportSection>
    {kind === 'stage' ? <StageSpecific report={report}/> : <InferenceSpecific report={report}/>}
    <ReportSection title="Artifacts"><ArtifactList artifacts={report.artifacts}/></ReportSection>
  </>;
}
function Definition({ label, value }: { label: string; value: string | null }) { return <><Typography component="dt" variant="body2" color="text.secondary">{label}</Typography><Typography component="dd" variant="body2" sx={{ m: 0 }}>{display(value)}</Typography></>; }
function StageSpecific({ report }: { report: ReportEnvelope }) {
  const kpis = report.stage === 'part_d' ? report.details.training_records : report.details.kpis;
  const title = report.stage === 'part_d' ? 'KPI training records' : 'Per-KPI results';
  return <ReportSection title={title}>{kpis?.length ? <Stack spacing={1.5}>{kpis.map((record, index) => <KpiCard key={`${record.kpi_name ?? 'kpi'}-${index}`} record={record}/>)}</Stack> : <StructuredData title="Stage details" value={report.details as unknown as StructuredValue}/>}</ReportSection>;
}
function KpiCard({ record }: { record: ReportKpiDetail }) {
  const value: Record<string, StructuredValue> = {};
  for (const [key, item] of Object.entries(record)) if (item !== undefined) value[key] = item as StructuredValue;
  const title = typeof record.kpi_name === 'string' ? record.kpi_name : typeof record.model_type === 'string' ? `${record.model_type} training` : 'KPI report';
  return <Card variant="outlined"><CardContent><Typography variant="subtitle1" sx={{ overflowWrap: 'anywhere' }}>{title}</Typography><StructuredData title="Reported fields" value={value}/></CardContent></Card>;
}
function InferenceSpecific({ report }: { report: ReportEnvelope }) {
  const series = report.details.series ?? []; const skipped = report.details.skipped_series ?? [];
  return <><InferenceResults runId={report.run_id} invocationId={report.invocation_id ?? ''}/><ReportSection title="Per-series results">{series.length ? <Stack spacing={1.5}>{series.map((item, index) => <Card variant="outlined" key={`${item.series_key ?? item.kpi_name ?? 'series'}-${index}`}><CardContent><Typography variant="subtitle1">{item.kpi_name ?? 'Series'}{item.series_key ? ` · ${item.series_key}` : ''}</Typography><StructuredData title="Series metrics and identity" value={item as StructuredValue}/></CardContent></Card>)}</Stack> : <EmptyState title="No series results" description="No per-series records were included in this report."/>}</ReportSection><ReportSection title="Skipped series">{skipped.length ? <StructuredData title="Skipped-series information" value={skipped}/> : <Typography color="text.secondary">No skipped-series entries were returned.</Typography>}</ReportSection></>;
}
