import { Component, AfterViewInit, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { FileReaderService } from '../../services/file-reader.service';
import { OpenapiTreenodeConverterService, OperationTreeNode } from '../../services/openapi-treenode-converter.service';
import { UserPreferenceControllerService } from '../../controllers/user-preference-controller.service';


import { toBlob } from 'html-to-image';

@Component({
  standalone: false,
  selector: 'app-api-path-tree',
  templateUrl: './api-path-tree.component.html'
})
export class ApiPathTreeComponent implements AfterViewInit, OnDestroy, OnInit {

  private preferenceService = inject(UserPreferenceControllerService);
  private fileReaderService = inject(FileReaderService);
  private openApiConverterService = inject(OpenapiTreenodeConverterService);

  /* DOM element holding the API tree view */
  @ViewChild('treeView') treeViewElement: ElementRef;

  @ViewChild('pathTreeLayout') pathTreeLayoutElement: ElementRef<HTMLElement>;

  /**
   * Object hoilding the tree nodes to display
   */
  apiPathNodes: TreeNode[] = [];

  selectedOperationNode?: OperationTreeNode;

  endpointDialogVisible = false;

  pathTreeMinHeight?: number;

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

  private measureTimeoutId?: ReturnType<typeof setTimeout>;
  private resizeObserver?: ResizeObserver;

  get horizontalView(): boolean {
    return this.preferenceService.horizontalView;
  }

  set horizontalView(value: boolean) {
    /* Deselect any item */
    this.selectedOperationNode = undefined;
    this.endpointDialogVisible = false;
    /* Change the view */
    this.preferenceService.horizontalView = value;
    this.schedulePathTreeMeasurement();
  }

  get joinNodesWithNoLeaves(): boolean {
    return this.preferenceService.joinNodesWithNoLeaves;
  }

  set joinNodesWithNoLeaves(value: boolean) {
    /* Deselect any item */
    this.selectedOperationNode = undefined;
    this.endpointDialogVisible = false;

    /* Set the value */
    this.preferenceService.joinNodesWithNoLeaves = value;

    /* Reprocess the tree */
    this.setTreeNodes();
    this.schedulePathTreeMeasurement();
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

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver(() => this.schedulePathTreeMeasurement());
    this.resizeObserver.observe(this.pathTreeLayoutElement.nativeElement);
    this.schedulePathTreeMeasurement();
  }

  ngOnDestroy() {
    if (this.measureTimeoutId) {
      clearTimeout(this.measureTimeoutId);
    }

    this.resizeObserver?.disconnect();
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

    const backgroundColor = getComputedStyle(this.treeViewElement.nativeElement).backgroundColor;

    /* Configure the export */
    const exportOptions = {
      backgroundColor,
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

    this.schedulePathTreeMeasurement();
  }

  openEndpointDetail(treeNode: TreeNode) {
    const node = treeNode as OperationTreeNode;
    if (node.type !== 'operation') {
      this.endpointDialogVisible = false;
      this.selectedOperationNode = undefined;
      return;
    }

    this.selectedOperationNode = node;
    this.endpointDialogVisible = true;
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

  private schedulePathTreeMeasurement() {
    if (this.measureTimeoutId) {
      clearTimeout(this.measureTimeoutId);
    }

    this.measureTimeoutId = setTimeout(() => this.updatePathTreeMinHeight(), 0);
  }

  private updatePathTreeMinHeight() {
    if (!this.pathTreeLayoutElement) {
      return;
    }

    const layoutElement = this.pathTreeLayoutElement.nativeElement;
    this.updateHorizontalConnectorBounds(layoutElement);
    const layoutTop = layoutElement.getBoundingClientRect().top;
    const renderedElements = Array.from(layoutElement.querySelectorAll('*')) as HTMLElement[];
    const renderedBottom = renderedElements.reduce((bottom, element) => {
      const rect = element.getBoundingClientRect();

      return Math.max(bottom, rect.bottom);
    }, layoutElement.getBoundingClientRect().bottom);
    const measuredHeight = Math.ceil(renderedBottom - layoutTop);

    this.pathTreeMinHeight = measuredHeight > 0 ? measuredHeight : undefined;
  }

  private updateHorizontalConnectorBounds(layoutElement: HTMLElement) {
    const childLists = Array.from(layoutElement.querySelectorAll('.tree-horizontal .p-tree-node-children')) as HTMLElement[];

    childLists.forEach((childList) => {
      const immediateChildContents = this.getImmediateChildNodeContents(childList);

      if (immediateChildContents.length < 2) {
        childList.style.removeProperty('--tree-connector-top');
        childList.style.removeProperty('--tree-connector-bottom');
        return;
      }

      const childListRect = childList.getBoundingClientRect();
      const firstChildRect = immediateChildContents[0].getBoundingClientRect();
      const lastChildRect = immediateChildContents[immediateChildContents.length - 1].getBoundingClientRect();
      const firstChildCenter = firstChildRect.top - childListRect.top + (firstChildRect.height / 2);
      const lastChildCenter = lastChildRect.top - childListRect.top + (lastChildRect.height / 2);

      childList.style.setProperty('--tree-connector-top', `${firstChildCenter}px`);
      childList.style.setProperty('--tree-connector-bottom', `${lastChildCenter}px`);
    });
  }

  private getImmediateChildNodeContents(childList: HTMLElement): HTMLElement[] {
    return Array.from(childList.children)
      .map((childElement) => {
        if (!(childElement instanceof HTMLElement)) {
          return undefined;
        }

        if (childElement.matches('.p-tree-node')) {
          return childElement.querySelector(':scope > .p-tree-node-content') as HTMLElement | null;
        }

        return childElement.querySelector(':scope > .p-tree-node > .p-tree-node-content') as HTMLElement | null;
      })
      .filter((contentElement): contentElement is HTMLElement => contentElement instanceof HTMLElement);
  }
}
