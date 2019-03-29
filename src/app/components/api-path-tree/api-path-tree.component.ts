import { Component, OnInit } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { FileReaderService } from '../../services/file-reader.service';
import { OpenapiTreenodeConverterService } from '../../services/openapi-treenode-converter.service';
import { UserPreferenceControllerService } from 'src/app/controllers/user-preference-controller.service';

@Component({
  selector: 'app-api-path-tree',
  templateUrl: './api-path-tree.component.html',
  styleUrls: ['./api-path-tree.component.scss']
})
export class ApiPathTreeComponent implements OnInit {

  /**
   * Object hoilding the tree nodes to display
   */
  apiPathNodes: TreeNode[] = [];
  selectedNode: TreeNode;

  constructor(
    private preferenceService: UserPreferenceControllerService,
    private fileReaderService: FileReaderService,
    private openApiConverterService: OpenapiTreenodeConverterService ) { }

  ngOnInit() {
    this.fileReaderService.apiChanged.subscribe(value => {
      /* Add this specification to our current state */
      this.openApiConverterService.addApiSpecification(value);
    });

    this.fileReaderService.resetFiles.subscribe(v => {
      /* Reset the service which holds our current state */
      this.openApiConverterService.reset();
    });

    this.openApiConverterService.treeNodesChanged.subscribe(value => {
      this.apiPathNodes = value;
    });
  }
}
