import { Alert, Box, Button, Card, CardContent, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useInferenceFilterOptions, useInferenceResults } from '../../api/reportQueries';
import type { InferenceResultFilters, InferenceResultParams } from '../../api/reportTypes';
import { DataTable, FilterBar, PaginationControls, RawJsonDisclosure } from '../common/ReportWidgets';

const filterKeys = ['composite_id', 'circle', 'cluster', 'site_name', 'kpi', 'status', 'start_time', 'end_time'] as const;
const labels: Record<typeof filterKeys[number], string> = { composite_id: 'Composite ID', circle: 'Circle', cluster: 'Cluster', site_name: 'Site name', kpi: 'KPI', status: 'Status or anomaly type', start_time: 'Start time (UTC)', end_time: 'End time (UTC)' };
const preferred = ['timestamp', 'series_key', 'circle', 'cluster', 'site_name', 'kpi_name', 'actual', 'prediction', 'residual', 'anomaly_score', 'is_anomaly', 'anomaly_type', 'status'];

export function InferenceResults({ runId, invocationId }: { runId: string; invocationId: string }) {
  const [mode, setMode] = useState<'anomalies' | 'all'>('anomalies');
  const [draft, setDraft] = useState<InferenceResultFilters>({});
  const [applied, setApplied] = useState<InferenceResultFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(50);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const params: InferenceResultParams = { mode, page, page_size: pageSize, sort_by: sortBy, sort_order: sortOrder, ...applied };
  const query = useInferenceResults(runId, invocationId, params);
  const options = useInferenceFilterOptions(runId, invocationId);
  const rows = query.data?.items ?? [];
  const found = new Set(rows.flatMap(row => Object.keys(row))); const columns = [...preferred.filter(key => found.has(key)), ...[...found].filter(key => !preferred.includes(key))];
  const apply = () => { setApplied(Object.fromEntries(Object.entries(draft).filter(([, value]) => value)) as InferenceResultFilters); setPage(1); };
  const clear = () => { setDraft({}); setApplied({}); setPage(1); };
  return <Card variant="outlined" sx={{ mt: 2 }}><CardContent><Stack spacing={2}>
    <Typography variant="h6">Where anomalies occurred</Typography>
    <FormControl size="small" sx={{ width: 190 }}><InputLabel id="result-mode-label">Result mode</InputLabel><Select labelId="result-mode-label" label="Result mode" value={mode} onChange={event => { setMode(event.target.value as 'anomalies' | 'all'); setPage(1); }}><MenuItem value="anomalies">Anomalies only</MenuItem><MenuItem value="all">All results</MenuItem></Select></FormControl>
    <FilterBar onApply={apply} onClear={clear} active={applied as Record<string, string>}>{filterKeys.map(key => key.endsWith('_time') ? <TextField key={key} size="small" label={labels[key]} type="datetime-local" value={draft[key] ?? ''} onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 190 }}/> : <Box key={key}><TextField size="small" label={labels[key]} value={draft[key] ?? ''} onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} sx={{ minWidth: 170 }} slotProps={(options.data as Record<string, string[]> | undefined)?.[key] ? { htmlInput: { list: `options-${key}` } } : undefined}/>{(options.data as Record<string, string[]> | undefined)?.[key] && <datalist id={`options-${key}`}>{(options.data as Record<string, string[]>)[key].map((value: string) => <option key={value} value={value}/>)}</datalist>}</Box>)}</FilterBar>
    <Stack direction="row" spacing={1}><FormControl size="small" sx={{ minWidth: 170 }}><InputLabel id="sort-column-label">Sort by</InputLabel><Select labelId="sort-column-label" label="Sort by" value={sortBy} onChange={event => { setSortBy(event.target.value); setPage(1); }}>{['timestamp', 'series_key', 'circle', 'cluster', 'site_name', 'kpi_name', 'actual', 'is_anomaly', 'status'].map(value => <MenuItem key={value} value={value}>{value.replaceAll('_', ' ')}</MenuItem>)}</Select></FormControl><FormControl size="small" sx={{ minWidth: 130 }}><InputLabel id="sort-order-label">Order</InputLabel><Select labelId="sort-order-label" label="Order" value={sortOrder} onChange={event => { setSortOrder(event.target.value as 'asc' | 'desc'); setPage(1); }}><MenuItem value="asc">Ascending</MenuItem><MenuItem value="desc">Descending</MenuItem></Select></FormControl></Stack>
    {query.isPending || query.isFetching ? <Typography role="status">Loading result page…</Typography> : null}
    {query.isError ? <Alert severity="error">Could not load inference results: {query.error.message}<Button onClick={() => void query.refetch()}>Retry</Button><RawJsonDisclosure value={query.error}/></Alert> : query.data && (rows.length ? <DataTable rows={rows} columns={columns} highlight={row => ['true', '1', 'yes'].includes((row.is_anomaly ?? '').toLowerCase())}/> : <Alert severity="info">No results match the selected mode and filters.</Alert>)}
    {query.data && <PaginationControls page={query.data.pagination.page} pageSize={pageSize} total={query.data.pagination.total_items} totalPages={query.data.pagination.total_pages} onPage={setPage} onSize={size => { setPageSize(size); setPage(1); }} disabled={query.isFetching}/>}
    {query.data && <Box><RawJsonDisclosure value={query.data}/></Box>}
  </Stack></CardContent></Card>;
}
