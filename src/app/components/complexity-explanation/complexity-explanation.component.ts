import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AssessmentAvailability, AssessmentReason, OperationAssessment } from '../../complexity/complexity.models';
import { ComplexityExplanationView, createComplexityExplanation } from '../../complexity/complexity-presentation';

@Component({
  selector: 'app-complexity-explanation',
  imports: [],
  templateUrl: './complexity-explanation.component.html',
  styleUrls: ['./complexity-explanation.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ComplexityExplanationComponent {
  @Input() assessmentState: AssessmentAvailability = 'Pending';
  @Input() assessment?: OperationAssessment;
  @Input() assessmentFailure?: AssessmentReason;

  get explanation(): ComplexityExplanationView {
    return createComplexityExplanation(this.assessmentState, this.assessment, this.assessmentFailure);
  }
}
