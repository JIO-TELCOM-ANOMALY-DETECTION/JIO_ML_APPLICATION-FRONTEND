import { useEffect } from 'react';
import HelpOutline from '@mui/icons-material/HelpOutline';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Card, CardContent, Chip, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import { PageContainer } from '../components/common/PageContainer';
import { PageHeader } from '../components/common/PageHeader';
import { guides, helpHref, type GuideKey } from './guideContent';
import { fieldId } from './helpFieldTypes';

export function GuideButton({ guide, section }: { guide: GuideKey; section?: string }) {
  return <Button component="a" href={helpHref(guide, section)} target="_blank" rel="noopener noreferrer" startIcon={<HelpOutline />} variant="outlined" type="button">Open settings guide</Button>;
}

export function HelpIndex() {
  return <PageContainer>
    <PageHeader title="Help" description="Practical settings and workflow guides." />
    <Typography sx={{ mb: 2 }}>Dataset &rarr; Part A &rarr; Part B &rarr; Part C &rarr; Part D &rarr; Inference bootstrap &rarr; Inference. Guided Training lets you review each stage; Quick Training sends Parts A through D together.</Typography>
    <Typography sx={{ mb: 3 }}>CSV paths are read by the ML server. Record run, attempt, and invocation IDs to return to persisted reports.</Typography>
    <Box component="nav" aria-label="Help table of contents" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
      {Object.entries(guides).map(([path, guide]) => <Card key={path} variant="outlined" sx={{ height: '100%' }}><CardContent><Stack spacing={1.5} height="100%"><Typography component="h2" variant="h6">{guide.title}</Typography><Typography color="text.secondary" sx={{ flexGrow: 1 }}>{guide.purpose}</Typography><Button component={RouterLink} to={helpHref(path)} variant="outlined" sx={{ alignSelf: 'flex-start' }}>Open {guide.title}</Button></Stack></CardContent></Card>)}
    </Box>
  </PageContainer>;
}

export function HelpDetail() {
  const { '*': key = '' } = useParams();
  const location = useLocation();
  const guide = guides[key];
  useEffect(() => {
    if (!guide || !location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const target = document.getElementById(id);
    if (typeof target?.scrollIntoView === 'function') target.scrollIntoView();
    target?.focus({ preventScroll: true });
  }, [guide, location.hash]);
  if (!guide) return <PageContainer><PageHeader title="Guide not found" description="Choose a guide from Help." /><Button component={RouterLink} to="/help">Open Help</Button></PageContainer>;
  const active = decodeURIComponent(location.hash.slice(1));
  return <PageContainer>
    <Box id="page-top" tabIndex={-1} sx={{ scrollMarginTop: 88 }}><PageHeader title={guide.title} description={guide.purpose} /></Box>
    <Box component="nav" aria-label="Guide contents" sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Typography component="h2" variant="h6" sx={{ mb: 1 }}>On this page</Typography>
      <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>{guide.sections.map(item => <Button key={item.id} component={RouterLink} to={`${location.pathname}#${item.id}`} size="small" variant="outlined">{item.title}</Button>)}</Stack>
    </Box>
    {guide.sections.map(item => <Accordion key={`${item.id}-${active}`} id={item.id} tabIndex={-1} defaultExpanded={!active || active === item.id || item.fields?.some(field => fieldId(item.id, field.labels[0]) === active)} slotProps={{ transition: { unmountOnExit: false } }} sx={{ mb: 1.5, scrollMarginTop: 88 }}>
      <AccordionSummary expandIcon={<ExpandMore />} aria-controls={`${item.id}-content`} id={`${item.id}-heading`}><Typography component="span" variant="h6">{item.title}</Typography></AccordionSummary>
      <AccordionDetails id={`${item.id}-content`}><Stack spacing={2}>
        {item.body.map(line => <Typography key={line}>{line}</Typography>)}
        {item.fields?.map(field => <Card key={field.labels[0]} component="article" id={fieldId(item.id, field.labels[0])} aria-labelledby={`${fieldId(item.id, field.labels[0])}-heading`} tabIndex={-1} variant="outlined" sx={{ scrollMarginTop: 96, bgcolor: 'background.default' }}><CardContent><Stack spacing={1}>
          <Typography component="h4" id={`${fieldId(item.id, field.labels[0])}-heading`} variant="subtitle1" fontWeight={700}>{field.labels[0]}</Typography>
          {field.labels.length > 1 && <Typography variant="caption" color="text.secondary">Also shown as: {field.labels.slice(1).join(', ')}</Typography>}
          <Typography>{field.effect}</Typography>
          <Typography variant="body2"><strong>Example:</strong> {field.example}</Typography>
          {field.defaultValue && <Box><Chip size="small" variant="outlined" label={`Default: ${field.defaultValue}`} sx={{ maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: .5 } }} /></Box>}
        </Stack></CardContent></Card>)}
        {item.related && <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} alignItems="center"><Typography variant="body2">Related:</Typography>{item.related.map(path => <Link key={path} component={RouterLink} to={helpHref(path)}>{guides[path]?.title ?? path}</Link>)}</Stack>}
        <Button component={RouterLink} to={`${location.pathname}#page-top`} size="small" sx={{ alignSelf: 'flex-start' }}>Back to top</Button>
      </Stack></AccordionDetails>
    </Accordion>)}
    <Button component={RouterLink} to="/help" sx={{ mt: 2 }}>All help topics</Button>
  </PageContainer>;
}
