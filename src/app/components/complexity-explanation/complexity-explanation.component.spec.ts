import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssessmentReason, OperationAssessment } from '../../complexity/complexity.models';
import { ComplexityExplanationComponent } from './complexity-explanation.component';

describe('ComplexityExplanationComponent', () => {
  let component: ComplexityExplanationComponent;
  let fixture: ComponentFixture<ComplexityExplanationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplexityExplanationComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ComplexityExplanationComponent);
    component = fixture.componentInstance;
  });

  it('renders a complete assessment with all five dimensions and source disclosures', () => {
    component.assessment = createAssessment();
    component.assessmentState = 'Available';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-assessment-state="Available"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('High consumer complexity');
    expect(fixture.nativeElement.querySelectorAll('.complexity-explanation__dimension')).toHaveSize(5);
    expect(fixture.nativeElement.textContent).toContain('A field adds data-shape burden.');
    expect(fixture.nativeElement.textContent).toContain('petstore.yaml');
    expect(fixture.nativeElement.textContent).toContain('/paths/~1pets/get');
  });

  it('renders qualified, incomplete, mitigated, pending, and unavailable states distinctly', () => {
    const qualified = render({
      assessmentState: 'Available',
      assessment: createAssessment({confidence: 'Qualified'})
    });
    expect(qualified).toContain('Qualified');

    const incomplete = render({
      assessmentState: 'Available',
      assessment: createAssessment({
        confidence: 'Incomplete',
        rawBand: 'Unknown',
        finalBand: 'Unknown',
        blockingFaults: [{
          ...reason('unavailable-reference', 'assessment', 'A reachable reference is unavailable.'),
          values: {reference: '#/components/schemas/Pet'}
        }]
      })
    });
    expect(incomplete).toContain('unknown consumer complexity');
    expect(incomplete).toContain('A referenced contract cannot be resolved.');
    expect(incomplete).toContain('#/components/schemas/Pet');

    const mitigated = render({
      assessmentState: 'Available',
      assessment: createAssessment({
        rawBand: 'Very high',
        finalBand: 'High',
        documentationSupport: {
          level: 'Strong',
          coveredRoles: ['request', 'response'],
          missingCoverage: [],
          reasons: [],
          mitigation: {from: 'Very high', to: 'High'}
        }
      })
    });
    expect(mitigated).toContain('Without this support, the raw band would be Very high');

    const pending = render({assessmentState: 'Pending'});
    expect(pending).toContain('Assessing operation complexity…');
    expect(pending).not.toContain('Explain the burden');

    const unavailable = render({
      assessmentState: 'Unavailable',
      assessmentFailure: reason('assessment-failed', 'assessment', 'The document assessment failed.')
    });
    expect(unavailable).toContain('Complexity assessment unavailable');
    expect(unavailable).toContain('The document assessment failed.');
  });

  function render(inputs: {
    assessmentState: 'Pending' | 'Available' | 'Unavailable';
    assessment?: OperationAssessment;
    assessmentFailure?: AssessmentReason;
  }): string {
    const stateFixture = TestBed.createComponent(ComplexityExplanationComponent);
    stateFixture.componentInstance.assessmentState = inputs.assessmentState;
    stateFixture.componentInstance.assessment = inputs.assessment;
    stateFixture.componentInstance.assessmentFailure = inputs.assessmentFailure;
    stateFixture.detectChanges();
    return stateFixture.nativeElement.textContent;
  }
});

function createAssessment(overrides: Partial<OperationAssessment> = {}): OperationAssessment {
  const fieldReason = reason('field', 'dataShape', 'A field adds data-shape burden.');
  const dimensions = {
    interactionSurface: {units: 1, level: 'Low' as const, reasons: [], escalations: []},
    dataShape: {units: 16, level: 'High' as const, reasons: [fieldReason], escalations: []},
    conditionality: {units: 4, level: 'Moderate' as const, reasons: [], escalations: []},
    indirection: {units: 3, level: 'Moderate' as const, reasons: [], escalations: []},
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
    rawBand: 'High',
    documentationSupport: {
      level: 'None',
      coveredRoles: [],
      missingCoverage: [],
      reasons: []
    },
    finalBand: 'High',
    dominantDimension: 'dataShape',
    supportingDimensions: ['conditionality', 'indirection'],
    reasons: [fieldReason],
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
