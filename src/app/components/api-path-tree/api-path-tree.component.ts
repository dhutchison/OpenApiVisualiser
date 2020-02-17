import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { TreeNode, SelectItem } from 'primeng/api';
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

  /* Boolean holding the state on if an image generation is in progress */
  generatingImage = false;

  /* Possible display types */
  readonly viewTypes: SelectItem[] = [
    {title: 'Tree', value: true, icon: 'pi pi-sitemap icon-rotate-ccw-90'},
    {title: 'List', value: false, icon: 'pi pi-list'}
  ];

  /* DOM element holding the API tree view */
  @ViewChild('treeView') treeViewElement: ElementRef;

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
      if (this.preferenceService.joinNodesWithNoLeaves) {
        /* First, lets do a pretty dumb (deep) clone of the objects we got */
        const nodesCopy: TreeNode[] = JSON.parse(JSON.stringify(value));
        /* Then compress */
        this.apiPathNodes = this.compress(nodesCopy);
      } else {
        this.apiPathNodes = value;
      }
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

  get joinNodesWithNoLeaves(): boolean {
    return this.preferenceService.joinNodesWithNoLeaves;
  }

  set joinNodesWithNoLeaves(value: boolean) {
    /* Deselect any item */
    this.selectedNode = undefined;

    /* Reprocess the tree */
    // TODO: implement

    /* Set the value */
    this.preferenceService.joinNodesWithNoLeaves = value;
  }

  /**
   * Download an image of the API tree.
   *
   * This depends on the html-to-image library to do all the heavy work.
   * https://github.com/bubkoo/html-to-image
   *
   * Also uses FileSaver to handle the file download
   * https://github.com/eligrey/FileSaver.js
   */
  downloadImage() {

    /* Set marker that an image is being generated */
    this.generatingImage = true;

    /* Configure the export */
    const exportOptions: OptionsType = {
      backgroundColor: '#ffffff',
      style: {
        border: 0,
        overflow: 'visible'
      }
    };

    /* Do the work. This uses a promise to async the work */
    console.log(this.treeViewElement.nativeElement);

    toBlob(this.treeViewElement.nativeElement, exportOptions)
      .then(blob => {
        window.saveAs(blob, 'API.png');

        /* Mark that the generation is complete */
        this.generatingImage = false;
    });

  }

  /**  When we compress the view, we will merge any nodes which have only a
   * single child, and the child is not a leaf.
   *
   * @param nodes the array of nodes to compress. This array will be modified
   *              and returned.
   */
  private compress(nodes: TreeNode[]): TreeNode[] {

    console.log('In Compress');
    console.log(nodes);

    /* Iterate through the nodes at this level */
    nodes.forEach(value => {
      if (value.leaf) {
        /* Node is a leaf, don't touch */
        console.log('Leaf node: %s', value.label);
      } else if (value.children) {
        /* Child nodes exist, apply compression to them */
        console.log('Child nodes exist, pre-compress: ');
        console.log(value.children);
        const compressedChildren = this.compress(value.children);

        if (compressedChildren.length === 1 && !compressedChildren[0].leaf) {
          /* Only a single non-leaf child, merge */
          value.label += compressedChildren[0].label;
          value.children = compressedChildren[0].children;

          /* Remove any double slashes from the path */
          value.label = value.label.replace('//', '/');
        }
      }
    });


    console.log('Compress returning: ');
    console.log(nodes);

    return nodes;
  }
}
