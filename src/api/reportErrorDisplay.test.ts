import { describe, expect, it } from 'vitest';
import { reportErrorMessage } from './reportErrorDisplay';

describe('reportErrorMessage', () => {
  it('replaces traceback messages with safe guidance', () => {
    expect(reportErrorMessage('Traceback (most recent call last):\n  File "C:\\service\\reader.py", line 24')).toContain('Check the reporting service logs');
  });
  it('redacts absolute paths from backend errors', () => {
    expect(reportErrorMessage('Unable to read C:\\service\\runs\\manifest.json')).not.toContain('C:\\service');
    expect(reportErrorMessage('Unable to read /srv/app/runs/manifest.json')).not.toContain('/srv/app');
  });
});
