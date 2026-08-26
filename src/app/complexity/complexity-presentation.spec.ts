import {formatComplexityStatus} from './complexity-presentation';
import {AssessmentReason, OperationAssessment} from './complexity.models';
import {createComplexityExplanation} from './complexity-presentation';

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

  it('presents a complete mitigated assessment as a consumer-facing explanation', () => {
    const assessment = createAssessment({
      confidence: 'Complete',
      rawBand: 'Very high',
      finalBand: 'High',
      dominantDimension: 'dataShape',
      documentationSupport: {
        level: 'Strong',
        coveredRoles: ['request', 'response'],
        missingCoverage: [],
        reasons: [],
        mitigation: {from: 'Very high', to: 'High'}
      }
    });

    const view = createComplexityExplanation('Available', assessment);

    expect(view.state).toBe('Available');
    expect(view.conclusion).toContain('High consumer complexity');
    expect(view.dominantBurden).toContain('Data shape');
    expect(view.facts).toEqual([
      {label: 'Assessment confidence', value: 'Complete'},
      {label: 'Raw complexity band', value: 'Very high'},
      {label: 'Final complexity band', value: 'High'},
      {label: 'Documentation support', value: 'Strong'}
    ]);
    expect(view.documentation.headline).toContain('reduces the final band');
  });

  it('keeps pending and unavailable states explicit', () => {
    const failure = {
      ...reason('assessment-failed', 'assessment', 'Assessment failed.'),
      values: {message: 'The scope could not be assessed.'}
    };

    expect(createComplexityExplanation('Pending').heading).toBe('Assessing operation complexity…');
    expect(createComplexityExplanation('Unavailable', undefined, failure).diagnostics[0].meaning)
      .toBe('The scope could not be assessed.');
  });

  it('preserves documentation coverage roles and describes strong support without mitigation', () => {
    const partial = createAssessment({
      documentationSupport: {
        level: 'Partial',
        coveredRoles: ['request or input'],
        missingCoverage: ['primary success outcome', 'alternative or error outcome'],
        reasons: []
      }
    });
    const partialView = createComplexityExplanation('Available', partial);

    expect(partialView.documentation.detail).toContain('Primary success outcome');
    expect(partialView.documentation.detail).toContain('Alternative or error outcome');

    const strong = createAssessment({
      rawBand: 'Low',
      finalBand: 'Low',
      documentationSupport: {
        level: 'Strong',
        coveredRoles: ['request or input', 'primary success outcome', 'alternative or error outcome'],
        missingCoverage: [],
        reasons: []
      }
    });
    const strongView = createComplexityExplanation('Available', strong);

    expect(strongView.documentation.headline).toContain('without changing its band');
  });

  it('does not turn an available operation without a matching assessment into an unavailable scope', () => {
    const view = createComplexityExplanation('Available');

    expect(view.state).toBe('Available');
    expect(view.heading).toBe('Complexity assessment incomplete');
    expect(view.conclusion).toContain('available assessment is incomplete');
  });
});

function createAssessment(overrides: Partial<OperationAssessment> = {}): OperationAssessment {
  const reasonValue = reason('field', 'dataShape', 'A field adds shape burden.');
  const dimensions = {
    interactionSurface: {units: 1, level: 'Low' as const, reasons: [], escalations: []},
    dataShape: {units: 20, level: 'High' as const, reasons: [reasonValue], escalations: []},
    conditionality: {units: 1, level: 'Low' as const, reasons: [], escalations: []},
    indirection: {units: 1, level: 'Low' as const, reasons: [], escalations: []},
    protocolObligations: {units: 1, level: 'Low' as const, reasons: [], escalations: []}
  };

  return {
    identity: {
      key: 'assessment-scope:test:get:/pets',
      scopeId: 'assessment-scope:test',
      sourceId: 'petstore.yaml',
      path: '/pets',
      method: 'get'
    },
    modelVersion: 'operation-contract-complexity/1.0.0',
    confidence: 'Complete',
    dimensions,
    rawBand: 'Very high',
    documentationSupport: {
      level: 'None',
      coveredRoles: [],
      missingCoverage: [],
      reasons: []
    },
    finalBand: 'Very high',
    dominantDimension: 'dataShape',
    supportingDimensions: [],
    reasons: [reasonValue],
    blockingFaults: [],
    warnings: [],
    ...overrides
  };
}

function reason(code: string, category: AssessmentReason['category'], meaning: string): AssessmentReason {
  return {
    code,
    category,
    source: {sourceId: 'petstore.yaml', pointer: '/paths/~1pets/get'},
    values: {meaning}
  };
}
