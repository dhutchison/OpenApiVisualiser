import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { FileReaderService } from '../../services/file-reader.service';
import { OpenapiTreenodeConverterService } from '../../services/openapi-treenode-converter.service';
import { UserPreferenceControllerService } from 'src/app/controllers/user-preference-controller.service';


import { toBlob, OptionsType } from 'html-to-image';

@Component({
  selector: 'app-api-path-tree',
  templateUrl: './api-path-tree.component.html'
})
export class ApiPathTreeComponent implements OnInit {

  /**
   * Object hoilding the tree nodes to display
   */
  apiPathNodes: TreeNode[] = [];
  selectedNode: TreeNode;

  /* DOM element holding the API tree view */
  @ViewChild('treeView', {static: false}) treeViewElement: ElementRef;

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

  get horizontalView(): boolean {
    return this.preferenceService.horizontalView;
  }

  set horizontalView(value: boolean) {
    /* Deselect any item */
    this.selectedNode = undefined;
    /* Change the view */
    this.preferenceService.horizontalView = value;
  }

  /**
   * Download an image of the API tree.
   *
   * This depends on the html-to-image library to do all the heavy work.
   * https://github.com/bubkoo/html-to-image
   *
   * TODO: async / progress indicator (can take a while)
   */
  downloadImage() {

    const exportOptions: OptionsType = {
      backgroundColor: '#ffffff',
      style: {
        border: 0,
        overflow: 'visible'
      }
    };

    console.log(this.treeViewElement.nativeElement);

    toBlob(this.treeViewElement.nativeElement, exportOptions)
      .then(blob => {
        window.saveAs(blob, 'API.png');
    });

  }
}
