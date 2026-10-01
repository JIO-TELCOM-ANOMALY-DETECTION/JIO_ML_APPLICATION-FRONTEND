import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { GuideButton, HelpDetail, HelpIndex } from './HelpPages';
import { formGuideTargets, guides, helpHref } from './guideContent';
import { fieldId } from './helpFieldTypes';

const visit = (path: string) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/help" element={<HelpIndex />} /><Route path="/help/*" element={<HelpDetail />} /></Routes></MemoryRouter>);
const content = (path: string) => guides[path].sections.flatMap(section => [...section.body, ...(section.fields ?? []).flatMap(field => [...field.labels, field.effect, field.example, field.defaultValue ?? ''])]).join(' ');

describe('settings help', () => {
  it('links from the index to every guide and gives every guide a section menu', () => {
    for (const [path, guide] of Object.entries(guides)) {
      const index = visit('/help');
      expect(screen.getByRole('link', { name: `Open ${guide.title}` })).toHaveAttribute('href', helpHref(path));
      index.unmount();
      const detail = visit(helpHref(path));
      expect(screen.getByRole('heading', { name: guide.title })).toBeInTheDocument();
      expect(within(screen.getByRole('navigation', { name: 'Guide contents' })).getAllByRole('link')).toHaveLength(guide.sections.length);
      detail.unmount();
    }
  });
  it('keeps every form target mapped to a real guide section', () => {
    const targets = [...Object.values(formGuideTargets.guided), ...formGuideTargets.quick, formGuideTargets.inference];
    for (const [path, id] of targets) expect(guides[path]?.sections.some(section => section.id === id), `${path}#${id}`).toBe(true);
  });
  it('opens mapped guides in a safe new tab', () => {
    for (const [path, id] of [...Object.values(formGuideTargets.guided), ...formGuideTargets.quick, formGuideTargets.inference]) {
      const view = render(<GuideButton guide={path} section={id} />);
      const link = screen.getByRole('link', { name: 'Open settings guide' });
      expect(link).toHaveAttribute('href', helpHref(path, id));
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      view.unmount();
    }
  });
  it('renders field cards with effects, examples and defaults at a direct section link', () => {
    Element.prototype.scrollIntoView = vi.fn();
    visit('/help/training/part-c#feature-types');
    expect(screen.getByRole('heading', { name: 'Custom feature types' })).toBeInTheDocument();
    const card = screen.getByRole('article', { name: 'seasonal_difference' });
    expect(within(card).getByText(/same current-minus-lag formula/)).toBeInTheDocument();
    expect(within(card).getByText(/Example:/)).toBeInTheDocument();
    expect(within(card).getByText(/Default:/)).toBeInTheDocument();
    expect(document.getElementById('feature-types')).toHaveFocus();
  });
  it('opens a collapsed section from the menu and supports field anchors and back to top', () => {
    Element.prototype.scrollIntoView = vi.fn();
    visit('/help/training/part-c#modes');
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Guide contents' })).getByRole('link', { name: 'Custom feature types' }));
    expect(screen.getByRole('button', { name: 'Custom feature types' })).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('feature-types')).toHaveFocus();
    expect(document.getElementById(fieldId('feature-types', 'seasonal_difference'))).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Back to top' }).length).toBeGreaterThan(0);
  });
  it('explains operational boundaries, status codes, bootstrap and chronology', () => {
    for (const [path, phrases] of [
      ['training/part-a', ['00:30', 'status -2', '15-minute']],
      ['training/part-b', ['strictly below', 'strictly above', 'Equality', '-2 = inserted timestamp', '2, 4']],
      ['training/part-c', ['current-minus-lag', 'corrected_history', 'Minimum valid']],
      ['training/part-d', ['Maximum gap days', 'Optuna', '400']],
      ['training/inference-bootstrap', ['Maximum gap ratio', 'missing bridge points']],
      ['inference', ['day 1, then day 2, then day 3', 'does not manufacture day 2']],
    ] as const) for (const phrase of phrases) expect(content(path), `${path}: ${phrase}`).toContain(phrase);
  });
});
