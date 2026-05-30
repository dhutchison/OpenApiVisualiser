import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';
import { FileReaderService } from '../../services/file-reader.service';
import { OpenapiTreenodeConverterService, OperationTreeNode } from '../../services/openapi-treenode-converter.service';
import { UserPreferenceControllerService } from '../../controllers/user-preference-controller.service';
import { createApiTreeSvg } from '../../utils/api-tree-svg-exporter';
import { EndpointSwaggerComponent } from '../endpoint-swagger/endpoint-swagger.component';

@Component({
  selector: 'app-api-path-tree',
  imports: [
    ButtonModule,
    CommonModule,
    DialogModule,
    EndpointSwaggerComponent,
    FormsModule,
    SelectButtonModule,
    TooltipModule,
    TreeModule
  ],
  templateUrl: './api-path-tree.component.html'
})
export class ApiPathTreeComponent implements AfterViewInit, OnDestroy, OnInit {

  private readonly preferenceService = inject(UserPreferenceControllerService);
  private readonly fileReaderService = inject(FileReaderService);
  private readonly openApiConverterService = inject(OpenapiTreenodeConverterService);

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
  private apiPathNodesOrig: TreeNode[] = [];

  private measureTimeoutId?: ReturnType<typeof setTimeout>;
  private resizeObserver?: ResizeObserver;
  private textMeasureContext?: CanvasRenderingContext2D;

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
   * Uses FileSaver to handle the file download
   * https://github.com/eligrey/FileSaver.js
   */
  downloadImage() {
    /* Set marker that an image is being generated */
    this.generatingImage = true;

    return this.createImageBlob()
      .then(blob => {
        globalThis.saveAs(blob, 'API.svg');

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

  private createImageBlob() {
    return Promise.resolve(new Blob([this.createSvgMarkup()], {
      type: 'image/svg+xml;charset=utf-8'
    }));
  }

  private createSvgMarkup() {
    const treeViewElement = this.treeViewElement?.nativeElement;
    const rootStyle = getComputedStyle(document.documentElement);
    const treeStyle = treeViewElement ? getComputedStyle(treeViewElement) : rootStyle;
    const cssVar = (name: string, fallback: string) => rootStyle.getPropertyValue(name).trim() || fallback;

    return createApiTreeSvg(this.apiPathNodes, {
      background: treeStyle.backgroundColor || cssVar('--app-surface-solid', '#1b1f1b'),
      cssVar,
      measureText: (text, font) => this.measureSvgText(text, font)
    });
  }

  private measureSvgText(text: string, font: string): number {
    const context = this.getTextMeasureContext();

    if (!context) {
      return text.length * 14 * 0.62;
    }

    context.font = font;

    return context.measureText(text).width;
  }

  private getTextMeasureContext(): CanvasRenderingContext2D | undefined {
    if (this.textMeasureContext) {
      return this.textMeasureContext;
    }

    const canvas = document.createElement('canvas');
    this.textMeasureContext = canvas.getContext('2d') ?? undefined;

    return this.textMeasureContext;
  }

  /**
   * Method which takes the original (uncompressed) tree
   * nodes and, if required, applies compression before
   * setting the field the UI is watching
   */
  private setTreeNodes() {
    if (this.preferenceService.joinNodesWithNoLeaves) {
      this.apiPathNodes = this.cloneCompressedTreeNodes(this.apiPathNodesOrig);
    } else {
      this.apiPathNodes = this.cloneTreeNodes(this.apiPathNodesOrig);
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

  togglePathNode(treeNode: TreeNode, event?: Event) {
    event?.stopPropagation();

    const node = treeNode as OperationTreeNode;
    if (treeNode.leaf || node.type === 'operation') {
      return;
    }

    treeNode.expanded = !treeNode.expanded;
    this.schedulePathTreeMeasurement();
  }

  /**  When we compress the view, we will merge any nodes which have only a
   * single child, and the child is not a leaf.
   *
   * @param nodes the array of nodes to compress.
   */
  private cloneCompressedTreeNodes(nodes: TreeNode[]): TreeNode[] {

    return nodes.map(value => this.cloneCompressedTreeNode(value));
  }

  private cloneCompressedTreeNode(node: TreeNode): TreeNode {
    const nodeCopy = this.cloneTreeNode(node);

    if (nodeCopy.leaf) {
      return nodeCopy;
    }

    const compressedChildren = this.cloneCompressedTreeNodes(node.children ?? []);

    if (compressedChildren.length === 1 && !compressedChildren[0].leaf) {
      nodeCopy.label = `${nodeCopy.label}${compressedChildren[0].label}`.replace('//', '/');
      nodeCopy.children = compressedChildren[0].children;
    } else {
      nodeCopy.children = compressedChildren;
    }

    return nodeCopy;
  }

  private cloneTreeNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes.map(node => this.cloneTreeNode(node));
  }

  private cloneTreeNode(node: TreeNode): TreeNode {
    return {
      ...node,
      children: node.children ? this.cloneTreeNodes(node.children) : node.children
    };
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

    if (this.horizontalView) {
      this.updateHorizontalConnectorBounds(layoutElement);
    }

    const measuredHeight = Math.ceil(layoutElement.scrollHeight);

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
      const lastChildRect = immediateChildContents.at(-1).getBoundingClientRect();
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
