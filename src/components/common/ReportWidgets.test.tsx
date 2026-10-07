import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { InfoTooltip, KeyValueTable, RawJsonDisclosure } from './ReportWidgets';

describe('report widgets', () => {
  it('renders zero, null and missing values distinctly and collapses raw JSON', () => {
    render(<><KeyValueTable values={{ zero: 0, nothing: null, absent: undefined, active: false }}/><RawJsonDisclosure value={{ secret: 'raw' }}/></>);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Not reported')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('View raw response').closest('details')).not.toHaveAttribute('open');
  });
  it('exposes field guidance through an accessible keyboard target', async () => {
    render(<InfoTooltip label="Outlier direction" description="Both checks upper and lower bounds." href="/help/training/part-b#outliers"/>);
    const button = screen.getByRole('button', { name: 'Information about Outlier direction' });
    await userEvent.tab();
    expect(button).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Both checks upper and lower bounds.');
    expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute('href', '/help/training/part-b#outliers');
  });
});
