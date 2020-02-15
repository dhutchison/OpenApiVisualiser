import { Component, OnInit } from '@angular/core';
import { OpenAPIObject } from 'openapi3-ts';
import { FileReaderService } from 'src/app/services/file-reader.service';
import { OpenapiTreenodeConverterService } from 'src/app/services/openapi-treenode-converter.service';
import { TreeNode } from 'primeng/api';

@Component({
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.sass']
})
export class SummaryComponent implements OnInit {

  /**
   * Object hoilding the tree nodes to display
   */
  apiPathNodes: TreeNode[] = [];
  methodSummary =  new Map<string, number>();

  constructor(
    private fileReaderService: FileReaderService,
    private openApiConverterService: OpenapiTreenodeConverterService ) { }

    ngOnInit() {
      this.openApiConverterService.treeNodesChanged.subscribe(value => {
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
     * @param parent nodes to be flattened
     */
    flatten(parent: TreeNode[]): TreeNode[] {
      let paths = [];

      for (const child of parent) {
        let children = [];
        if (child.leaf) {
          children.push(child);
        } else {
          children = children.concat(this.flatten(child.children));
        }
        paths = paths.concat(children);
      }
      return paths;
    }

}
