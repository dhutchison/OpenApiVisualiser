import { AssessmentAvailability, ComplexityBand } from './complexity.models';

export function formatComplexityStatus(status: AssessmentAvailability, band?: ComplexityBand): string {
  if (status === 'Pending') {
    return 'Complexity: assessing…';
  }
  if (status === 'Unavailable') {
    return 'Complexity unavailable';
  }
  return `Complexity: ${band ?? 'Unknown'}`;
}
