import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { OpenapiTreenodeConverterService } from '../../services/openapi-treenode-converter.service';
import { ApiOperationNode, ApiPathTreeNode, isApiOperationNode } from '../../models/hierarchy.models';
import { FileReaderService } from '../../services/file-reader.service';
import { ComplexityAssessmentService } from '../../services/complexity-assessment.service';
import {
  AssessmentAvailability,
  ComplexityAssessmentReport,
  ComplexityAssessmentState,
  HotspotEntry,
  OperationIdentity
} from '../../complexity/complexity.models';
import { LoadedDocument } from '../../models/loaded-document.models';

export interface HotspotView extends HotspotEntry {
  readonly label: string;
}

export class ComplexityScopeSummary {
  showAll = false;

  constructor(
    readonly scopeId: string,
    readonly sourceId: string,
    readonly title: string,
    readonly status: AssessmentAvailability,
    readonly report?: ComplexityAssessmentReport
  ) {}

  get hotspots(): readonly HotspotView[] {
    return (this.report?.hotspots ?? []).map(hotspot => ({
      ...hotspot,
      label: describeOperation(hotspot.identity)
    }));
  }

  get visibleHotspots(): readonly HotspotView[] {
    return this.showAll ? this.hotspots : this.hotspots.slice(0, 10);
  }

  get additionalTiedHotspots(): number {
    if (this.hotspots.length <= 10) {
      return 0;
    }

    const cutoffTier = this.hotspots[9].tier;
    return this.hotspots.slice(10).filter(hotspot => hotspot.tier === cutoffTier).length;
  }

  get needsAssessment(): readonly OperationIdentity[] {
    return this.report?.needsAssessment ?? [];
  }
}

@Component({
  selector: 'app-summary',
  imports: [CommonModule],
  templateUrl: './summary.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./summary.component.sass']
})
export class SummaryComponent implements OnInit {

  private readonly openApiConverterService = inject(OpenapiTreenodeConverterService);
  private readonly fileReaderService = inject(FileReaderService);
  private readonly complexityAssessmentService = inject(ComplexityAssessmentService);

  /** The operation nodes used by the existing HTTP method summary. */
  apiPathNodes: ApiOperationNode[] = [];
  methodSummary = new Map<string, number>();
  scopeSummaries: ComplexityScopeSummary[] = [];

  ngOnInit() {
    this.openApiConverterService.treeNodesChanged.subscribe(value => {
      this.methodSummary.clear();
      this.apiPathNodes = this.flatten(value);
      for (const node of this.apiPathNodes) {
        this.methodSummary.set(node.label, (this.methodSummary.get(node.label) ?? 0) + 1);
      }
    });

    this.fileReaderService.apiChanged.subscribe(document => this.addPendingScope(document));
    this.fileReaderService.resetFiles.subscribe(() => this.scopeSummaries = []);
    this.complexityAssessmentService.assessmentChanged.subscribe(state => this.applyAssessment(state));
  }

  /**
   * Flattens the descendants of the provided nodes into the operation leaves.
   */
  flatten(parent: ApiPathTreeNode[]): ApiOperationNode[] {
    let paths: ApiOperationNode[] = [];

    for (const child of parent) {
      if (isApiOperationNode(child)) {
        paths.push(child);
      } else {
        paths = paths.concat(this.flatten(child.children));
      }
    }
    return paths;
  }

  getComplexityAssessmentStatus(): string | undefined {
    if (this.scopeSummaries.some(scope => scope.status === 'Pending')) {
      return 'Assessing operation complexity…';
    }
    if (this.scopeSummaries.some(scope => scope.status === 'Unavailable')) {
      return 'Complexity assessment unavailable';
    }
    return undefined;
  }

  showAll(scope: ComplexityScopeSummary): void {
    scope.showAll = true;
  }

  describeOperation(identity: OperationIdentity): string {
    return describeOperation(identity);
  }

  getFailureMessage(scope: ComplexityScopeSummary): string | undefined {
    const message = scope.report?.failure?.values?.['message'];
    return typeof message === 'string' ? message : undefined;
  }

  private addPendingScope(document: LoadedDocument): void {
    const summary = new ComplexityScopeSummary(
      document.scopeId,
      document.sourceId,
      document.document.info?.title || document.sourceId,
      'Pending'
    );
    this.scopeSummaries = [
      ...this.scopeSummaries.filter(scope => scope.scopeId !== document.scopeId),
      summary
    ];
  }

  private applyAssessment(state: ComplexityAssessmentState): void {
    const existing = this.scopeSummaries.find(scope => scope.scopeId === state.scopeId);
    if (!existing) {
      this.scopeSummaries = [
        ...this.scopeSummaries,
        new ComplexityScopeSummary(state.scopeId, state.report?.sourceId ?? state.scopeId, state.scopeId, state.status, state.report)
      ];
      return;
    }

    const replacement = new ComplexityScopeSummary(
      existing.scopeId,
      state.report?.sourceId ?? existing.sourceId,
      existing.title,
      state.status,
      state.report
    );
    replacement.showAll = existing.showAll;
    this.scopeSummaries = this.scopeSummaries.map(scope => scope.scopeId === state.scopeId ? replacement : scope);
  }
}

function describeOperation(identity: OperationIdentity): string {
  return `${identity.method.toUpperCase()} ${identity.path}`;
}
