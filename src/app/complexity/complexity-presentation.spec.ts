import {formatComplexityStatus} from './complexity-presentation';

describe('formatComplexityStatus', () => {
  it('describes a pending assessment', () => {
    expect(formatComplexityStatus('Pending')).toBe('Complexity: assessing…');
  });

  it('describes an unavailable assessment', () => {
    expect(formatComplexityStatus('Unavailable')).toBe('Complexity unavailable');
  });

  it('formats an available band and falls back to unknown when absent', () => {
    expect(formatComplexityStatus('Available', 'High')).toBe('Complexity: High');
    expect(formatComplexityStatus('Available')).toBe('Complexity: Unknown');
  });
});
