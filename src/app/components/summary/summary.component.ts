import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { OpenapiTreenodeConverterService } from '../../services/openapi-treenode-converter.service';
import { ApiOperationNode, ApiPathTreeNode, isApiOperationNode } from '../../models/hierarchy.models';

@Component({
  selector: 'app-summary',
  imports: [
    CommonModule
  ],
  templateUrl: './summary.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./summary.component.sass']
})
export class SummaryComponent implements OnInit {

  private readonly openApiConverterService = inject(OpenapiTreenodeConverterService);

  /**
   * Object hoilding the tree nodes to display
   */
  apiPathNodes: ApiOperationNode[] = [];
  methodSummary =  new Map<string, number>();

    ngOnInit() {
      this.openApiConverterService.treeNodesChanged.subscribe(value => {
        this.methodSummary.clear();
        this.apiPathNodes = this.flatten(value);
        for (const node of this.apiPathNodes) {
          let n = this.methodSummary.get(node.label);
          if (n) {
            n += 1;
          } else {
            n = 1;
          }
          this.methodSummary.set(node.label, n);
        }

      });
    }

    /**
     * Flattens the descendants of the provided nodes into a single array
     * containing just the leaves
     *
     * @param parent nodes to be flattened
     */
  flatten(parent: ApiPathTreeNode[]): ApiOperationNode[] {
      let paths: ApiOperationNode[] = [];

      for (const child of parent) {
        let children: ApiOperationNode[] = [];
        if (isApiOperationNode(child)) {
          children.push(child);
        } else {
          children = children.concat(this.flatten(child.children));
        }
        paths = paths.concat(children);
      }
      return paths;
  }

  getComplexityAssessmentStatus(): string | undefined {
    if (this.apiPathNodes.some(node => node.assessmentState === 'Pending')) {
      return 'Assessing operation complexity…';
    }
    if (this.apiPathNodes.some(node => node.assessmentState === 'Unavailable')) {
      return 'Complexity assessment unavailable';
    }
    return undefined;
  }

}
