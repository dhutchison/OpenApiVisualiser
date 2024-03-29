import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { FileReaderService } from '../../services/file-reader.service';
import { OpenapiTreenodeConverterService } from '../../services/openapi-treenode-converter.service';
import { UserPreferenceControllerService } from '../../controllers/user-preference-controller.service';


import { toBlob } from 'html-to-image';

@Component({
  selector: 'app-api-path-tree',
  templateUrl: './api-path-tree.component.html'
})
export class ApiPathTreeComponent implements OnInit {

  /* DOM element holding the API tree view */
  @ViewChild('treeView') treeViewElement: ElementRef;

  /**
   * Object hoilding the tree nodes to display
   */
  apiPathNodes: TreeNode[] = [];

  /**
   * The selected node
   */
  selectedNode: TreeNode;

  /* Boolean holding the state on if an image generation is in progress */
  generatingImage = false;

  /* Possible display orientation types */
  readonly viewTypes: any[] = [
    {title: 'Tree', value: true, icon: 'pi pi-sitemap icon-rotate-ccw-90'},
    {title: 'List', value: false, icon: 'pi pi-list'}
  ];

  /* Possible display expansion modes */
  readonly expansionTypes: any[] = [
    {title: 'Compressed', value: true, icon: 'pi pi-window-minimize'},
    {title: 'Expanded', value: false, icon: 'pi pi-window-maximize'}
  ];

  /**
   * The original (uncompressed) version of the tree nodes
   */
  private apiPathNodesOrig: TreeNode[];

  constructor(
    private preferenceService: UserPreferenceControllerService,
    private fileReaderService: FileReaderService,
    private openApiConverterService: OpenapiTreenodeConverterService ) { }

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

    /* Set the value */
    this.preferenceService.joinNodesWithNoLeaves = value;

    /* Reprocess the tree */
    this.setTreeNodes();
  }

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
      this.apiPathNodesOrig = value;
      this.setTreeNodes();
    });
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
    const exportOptions = {
      backgroundColor: '#ffffff',
      /*
       * Needing to set this configuration option until
       * https://github.com/bubkoo/html-to-image/issues/74
       * is fixed
       */
      pixelRatio: 1,
      // style: styles
    };

    /* Do the work. This uses a promise to async the work */
    console.log(this.treeViewElement.nativeElement);

    toBlob(this.treeViewElement.nativeElement, exportOptions)
      .then(blob => {
        window.saveAs(blob, 'API.png');

        /* Mark that the generation is complete */
        this.generatingImage = false;
      })
      .catch(err => {

        //TODO: Error handling in UI
        console.error('Failed to generate image: %o', err);

        /* Mark that the generation is complete */
        this.generatingImage = false;
      });

  }

  /**
   * Method which takes the original (uncompressed) tree
   * nodes and, if required, applies compression before
   * setting the field the UI is watching
   */
  private setTreeNodes() {
    /* First, lets do a pretty dumb (deep) clone of the objects we got */
    const nodesCopy: TreeNode[] = JSON.parse(JSON.stringify(this.apiPathNodesOrig));

    if (this.preferenceService.joinNodesWithNoLeaves) {
      /* Then compress */
      this.apiPathNodes = this.compress(nodesCopy);
    } else {
      this.apiPathNodes = nodesCopy;
    }
  }

  /**  When we compress the view, we will merge any nodes which have only a
   * single child, and the child is not a leaf.
   *
   * @param nodes the array of nodes to compress. This array will be modified
   *              and returned.
   */
  private compress(nodes: TreeNode[]): TreeNode[] {

    console.debug('In Compress: %o', nodes);

    /* Iterate through the nodes at this level */
    nodes.forEach(value => {
      if (value.leaf) {
        /* Node is a leaf, don't touch */
        console.debug('Leaf node: %s', value.label);
      } else if (value.children) {
        /* Child nodes exist, apply compression to them */
        console.debug('Child nodes exist, pre-compress: %o', value.children);
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


    console.debug('Compress returning: %o', nodes);

    return nodes;
  }
}
