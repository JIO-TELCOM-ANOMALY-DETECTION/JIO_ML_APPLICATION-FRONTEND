import { describe, expect, it } from 'vitest';
import { guides } from './guideContent';
import partA from './PartAWorkspacePage.tsx?raw';
import partsBC from './PartsBCWorkspacePage.tsx?raw';
import partD from './PartDWorkspacePage.tsx?raw';
import quick from './QuickTrainingPage.tsx?raw';
import inference from './InferencePage.tsx?raw';
import runs from './RunsPages.tsx?raw';
import quickB from '../components/training/QuickPartBEditor.tsx?raw';
import phase4 from '../components/training/Phase4Editor.tsx?raw';
import partC from '../components/training/PartCEditors.tsx?raw';
import training from '../components/training/TrainingConfiguration.tsx?raw';
import { xgboostFields, isolationFields } from '../api/training';

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const guided = ['training/part-a', 'training/part-b', 'training/part-c', 'training/part-d', 'training/inference-bootstrap'];
const allLabels = new Set(Object.values(guides).flatMap(guide => guide.sections.flatMap(section => (section.fields ?? []).flatMap(field => field.labels.map(normalize)))));
const dynamicLabels = [
  ...xgboostFields, ...isolationFields,
  'circle column mapping', 'cluster column mapping', 'site name column mapping', 'timestamp column mapping', 'value column mapping', 'kpi name column mapping',
  'server type column mapping', 'consequent value column mapping', 'bucket type column mapping', 'bucket size column mapping',
  'phase_1 minimum points', 'phase_1 maximum points', 'phase_2 minimum points', 'phase_2 maximum points', 'phase_3 minimum points', 'phase_3 maximum points',
  'phase_4_pass_1 minimum points', 'phase_4_pass_1 maximum points', 'phase_4_pass_2 minimum points',
];
const sources = { partA, partsBC, partD, quick, inference, runs, quickB, phase4, partC, training };

describe('editable Help coverage', () => {
  it('gives every guided stage substantive field-level content', () => {
    for (const path of guided) {
      const fields = guides[path].sections.flatMap(section => section.fields ?? []);
      expect(fields.length, path).toBeGreaterThan(3);
      for (const field of fields) {
        expect(field.effect.length, `${path}: ${field.labels[0]} effect`).toBeGreaterThan(65);
        expect(field.example.length, `${path}: ${field.labels[0]} example`).toBeGreaterThan(25);
      }
    }
  });
  it('documents literal and dynamic form labels', () => {
    const literalLabels = Object.values(sources).flatMap(source => [...source.matchAll(/\blabel="([^"]+)"/g)].map(match => match[1]));
    const missing = [...new Set([...literalLabels, ...dynamicLabels])].filter(label => !allLabels.has(normalize(label)));
    expect(missing).toEqual([]);
  });
  it('keeps quick stage links pointed at corresponding detailed guides', () => {
    for (const [step, path] of [['part-a', 'training/part-a'], ['part-b', 'training/part-b'], ['part-c', 'training/part-c'], ['part-d', 'training/part-d'], ['bootstrap', 'training/inference-bootstrap']] as const) {
      expect(guides['training/quick'].sections.find(section => section.id === step)?.related).toContain(path);
    }
  });
  it('contains no common UTF-8 mojibake fragments in checked frontend source', () => {
    for (const [name, source] of Object.entries(sources)) expect(source, name).not.toMatch(/(?:Ã.|Â.|â[\u0080-\u00bf]|�)/u);
  });
});
