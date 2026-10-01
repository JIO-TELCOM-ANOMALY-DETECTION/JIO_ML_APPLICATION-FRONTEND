import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { ReportArtifact, StructuredValue } from '../../api/reportTypes';

const isObject = (value: StructuredValue): value is { [key: string]: StructuredValue } => typeof value === 'object' && value !== null && !Array.isArray(value);
const label = (key: string) => key.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
function Scalar({ value }: { value: StructuredValue }) { return <>{value === null ? '—' : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value)}</>; }
export function StructuredData({ title, value, depth = 0 }: { title: string; value: StructuredValue | undefined; depth?: number }) {
  if (value === undefined || value === null) return null;
  if (depth >= 4 && typeof value === 'object') return <details><summary>{title || 'View nested structured data'}</summary><Box component="pre" sx={{ maxHeight: 280, overflow: 'auto', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{JSON.stringify(value, null, 2)}</Box></details>;
  if (Array.isArray(value)) {
    if (!value.length) return <Typography variant="body2" color="text.secondary">{title}: None reported</Typography>;
    return <Box sx={{ mt: 1 }}>{title && <Typography variant="subtitle2">{title}</Typography>}<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(230px, 1fr))' }, gap: 1, mt: .5 }}>{value.map((item, index) => <Card variant="outlined" key={index}><CardContent sx={{ '&:last-child': { pb: 1.5 } }}>{isObject(item) ? <DefinitionData value={item} depth={depth + 1}/> : <Scalar value={item}/>}</CardContent></Card>)}</Box></Box>;
  }
  if (isObject(value)) return <Box sx={{ mt: 1 }}>{title && <Typography variant="subtitle2">{title}</Typography>}<DefinitionData value={value} depth={depth + 1}/></Box>;
  return <Typography variant="body2"><strong>{title}:</strong> <Scalar value={value}/></Typography>;
}
function DefinitionData({ value, depth }: { value: { [key: string]: StructuredValue }; depth: number }) {
  const entries = Object.entries(value);
  if (!entries.length) return <Typography variant="body2" color="text.secondary">No values returned.</Typography>;
  return <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(105px, 1fr) minmax(0, 2fr)', sm: 'minmax(150px, 1fr) minmax(0, 3fr)' }, gap: .75, m: 0, mt: .75, overflowWrap: 'anywhere' }}>{entries.map(([key, item]) => <DataRow key={key} name={label(key)} value={item} depth={depth}/>)}</Box>;
}
function DataRow({ name, value, depth }: { name: string; value: StructuredValue; depth: number }) {
  const scalar = value === null || typeof value !== 'object';
  return <><Typography component="dt" variant="body2" color="text.secondary">{name}</Typography><Box component="dd" sx={{ m: 0, minWidth: 0, typography: 'body2' }}>{scalar ? <Scalar value={value}/>: <details><summary>{Array.isArray(value) ? `${value.length} items` : 'View details'}</summary><StructuredData title="" value={value} depth={depth + 1}/></details>}</Box></>;
}
function formatSize(bytes: number): string { if (!Number.isFinite(bytes) || bytes < 0) return '—'; if (bytes < 1024) return `${bytes} B`; const units = ['KB', 'MB', 'GB', 'TB']; let size = bytes / 1024; let unit = units[0]; for (let index = 1; size >= 1024 && index < units.length; index++) { size /= 1024; unit = units[index]; } return `${size.toFixed(1)} ${unit}`; }
export function ArtifactList({ artifacts }: { artifacts: ReportArtifact[] }) {
  if (!artifacts.length) return <Typography color="text.secondary">No artifacts were returned.</Typography>;
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' }, gap: 1.5 }}>{artifacts.map((artifact, index) => <Card variant="outlined" key={`${artifact.relative_path}-${index}`}><CardContent><Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>{artifact.name}</Typography><Box component="dl" sx={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr)', gap: .5, overflowWrap: 'anywhere' }}><Typography component="dt" variant="body2" color="text.secondary">Kind</Typography><Typography component="dd" variant="body2" sx={{ m: 0 }}>{artifact.kind}</Typography><Typography component="dt" variant="body2" color="text.secondary">Format</Typography><Typography component="dd" variant="body2" sx={{ m: 0 }}>{artifact.format}</Typography><Typography component="dt" variant="body2" color="text.secondary">Relative path</Typography><Typography component="dd" variant="body2" sx={{ m: 0 }}>{artifact.relative_path}</Typography><Typography component="dt" variant="body2" color="text.secondary">Size</Typography><Typography component="dd" variant="body2" sx={{ m: 0 }}>{formatSize(artifact.size_bytes)} ({artifact.size_bytes} bytes)</Typography></Box>{artifact.preview === null ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No bounded preview was returned for this artifact.</Typography> : <CsvPreview artifact={artifact}/>}</CardContent></Card>)}</Box>;
}
function CsvPreview({ artifact }: { artifact: ReportArtifact }) {
  const rows = artifact.preview;
  if (!rows?.length) return <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Bounded preview: no rows returned.</Typography>;
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  if (!columns.length) return <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Bounded preview: no columns returned.</Typography>;
  return <Box sx={{ mt: 1 }}><Typography variant="caption" color="text.secondary">Bounded preview · {rows.length} rows shown</Typography><TableContainer sx={{ maxHeight: 320 }}><Table size="small" stickyHeader aria-label={`Bounded artifact preview for ${artifact.name}`}><TableHead><TableRow>{columns.map(column => <TableCell key={column}>{column}</TableCell>)}</TableRow></TableHead><TableBody>{rows.map((row, index) => <TableRow key={index}>{columns.map(column => <TableCell key={column}>{row[column] ?? '—'}</TableCell>)}</TableRow>)}</TableBody></Table></TableContainer></Box>;
}
export function ReportSection({ title, children }: { title: string; children: ReactNode }) { return <Box sx={{ mt: 2 }}><Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>{children}</Box>; }
