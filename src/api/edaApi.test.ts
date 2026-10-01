import { describe, expect, it } from 'vitest';
import { buildEDARequest, defaultEDAFormValues, validateEDAForm, type EDAFormValues } from './edaApi';

const valid = (overrides: Partial<EDAFormValues> = {}): EDAFormValues => ({ ...defaultEDAFormValues, ...overrides });

describe('Part A request construction', () => {
  it('uses schema defaults and omits identifiers for a new run', () => {
    const request = buildEDARequest(valid({ inputFile: 'data.csv' }));
    expect(request).not.toHaveProperty('run_id'); expect(request).not.toHaveProperty('attempt_id');
    expect(request.dataset.columns).toEqual(defaultEDAFormValues.columns);
    expect(request.dataset.expected_timeline).toEqual({ timeline_mode: 'global_min_max' });
    expect(request.dataset).not.toHaveProperty('bucket'); expect(request.dataset).not.toHaveProperty('single_kpi_name');
  });
  it('requires the server path and trims optional metadata while omitting blanks', () => {
    expect(validateEDAForm(valid()).inputFile).toBeTruthy();
    const request = buildEDARequest(valid({ inputFile: '  C:\\data\\input.csv ', runName: ' Run one ', employeeCode: ' ', employeeName: ' Asha ' }));
    expect(request.dataset.input_file).toBe('C:\\data\\input.csv');
    expect(request.run_metadata).toEqual({ employee_name: 'Asha', run_name: 'Run one' });
  });
  it('constructs existing-run and targeted-attempt selection modes', () => {
    const existing = buildEDARequest(valid({ inputFile: 'dataset.csv', executionMode: 'new_attempt', runId: ' run-1 ' }));
    expect(existing.run_id).toBe('run-1'); expect(existing).not.toHaveProperty('attempt_id');
    const retry = buildEDARequest(valid({ inputFile: 'dataset.csv', executionMode: 'retry_attempt', runId: 'run-1', attemptId: 'attempt-2' }));
    expect(retry.run_id).toBe('run-1'); expect(retry.attempt_id).toBe('attempt-2');
    expect(validateEDAForm(valid({ executionMode: 'retry_attempt', attemptId: 'attempt-2' }))).toHaveProperty('runId');
  });
  it('rejects duplicate and empty physical column mappings', () => {
    const columns = { ...defaultEDAFormValues.columns, circle_column: 'same', cluster_column: ' same ' };
    expect(validateEDAForm(valid({ inputFile: 'data.csv', columns })).circle_column).toMatch(/Duplicates/);
    expect(validateEDAForm(valid({ inputFile: 'data.csv', columns: { ...defaultEDAFormValues.columns, value_column: ' ' } })).value_column).toMatch(/must not be empty/);
  });
  it('includes request-level bucket and single-KPI values only when selected', () => {
    const base = valid({ inputFile: 'data.csv', bucketSource: 'request', bucketType: ' fortnights ', bucketSize: '15', kpiSource: 'single', singleKpiName: ' traffic ' });
    const request = buildEDARequest(base);
    expect(request.dataset.bucket).toEqual({ bucket_type: 'fortnights', bucket_size: 15 }); expect(request.dataset.single_kpi_name).toBe('traffic');
    expect(buildEDARequest(valid({ inputFile: 'data.csv', bucketSource: 'csv', kpiSource: 'csv', singleKpiName: 'stale' })).dataset).not.toHaveProperty('bucket');
    expect(buildEDARequest(valid({ inputFile: 'data.csv', kpiSource: 'csv', singleKpiName: 'stale' })).dataset).not.toHaveProperty('single_kpi_name');
    expect(validateEDAForm(valid({ inputFile: 'data.csv', bucketSource: 'request', bucketType: '', bucketSize: '0' }))).toMatchObject({ bucketType: expect.any(String), bucketSize: expect.any(String) });
  });
  it('validates conditional date range and positive day count without stale fields', () => {
    expect(buildEDARequest(valid({ inputFile: 'data.csv' })).dataset.expected_timeline).toEqual({ timeline_mode: 'global_min_max' });
    expect(validateEDAForm(valid({ inputFile: 'data.csv', timelineMode: 'date_range', expectedStart: '', expectedEnd: '' }))).toMatchObject({ expectedStart: expect.any(String), expectedEnd: expect.any(String) });
    expect(validateEDAForm(valid({ inputFile: 'data.csv', timelineMode: 'date_range', expectedStart: '2026-02-02T10:00', expectedEnd: '2026-02-01T10:00' })).expectedEnd).toMatch(/later/);
    const range = buildEDARequest(valid({ inputFile: 'data.csv', timelineMode: 'date_range', expectedStart: '2026-02-01T10:30', expectedEnd: '2026-02-02T11:45', numDays: '99' }));
    expect(range.dataset.expected_timeline).toEqual({ timeline_mode: 'date_range', expected_start: '2026-02-01T10:30:00', expected_end: '2026-02-02T11:45:00' });
    expect(validateEDAForm(valid({ inputFile: 'data.csv', timelineMode: 'num_days', numDays: '1.2' })).numDays).toMatch(/positive/);
    expect(buildEDARequest(valid({ inputFile: 'data.csv', timelineMode: 'num_days', numDays: '3', expectedStart: 'stale' })).dataset.expected_timeline).toEqual({ timeline_mode: 'num_days', num_days: 3 });
  });
});
