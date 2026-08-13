import {CommonModule, NgTemplateOutlet} from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
  isDevMode,
  ViewEncapsulation
} from '@angular/core';
import {CdkNestedTreeNode, CdkTree, CdkTreeNodeDef, CdkTreeNodeOutlet} from '@angular/cdk/tree';
import {Tree, TreeItem, TreeItemGroup} from '@angular/aria/tree';
import {ActivatedRoute, Router} from '@angular/router';
import {TreeNode} from 'primeng/api';
import {Subscription} from 'rxjs';

// PROTOTYPE — Three API-path renderer foundations, switchable with ?variant=,
// embedded in the existing page and fed by its real converted tree data.

type PrototypeVariant = 'A' | 'B' | 'C';

interface ApiPathRenderNode {
  key: string;
  label: string;
  operation: boolean;
  method?: string;
  path?: string;
  tooltip?: string;
  expanded: boolean;
  children: ApiPathRenderNode[];
  source?: TreeNode;
}

interface VariantDescription {
  key: PrototypeVariant;
  name: string;
  summary: string;
}

const VARIANTS: readonly VariantDescription[] = [
  {
    key: 'A',
    name: 'Native disclosure tree',
    summary: 'Recursive app-owned lists and native buttons. Every visible node is a Tab stop; tree arrow-key behaviour would remain application code.'
  },
  {
    key: 'B',
    name: 'Angular CDK Tree',
    summary: 'Uses the CDK dependency already present on the Angular 22 branch. CDK owns tree roles, roving focus, typeahead, and arrow-key expansion.'
  },
  {
    key: 'C',
    name: 'Angular Aria Tree',
    summary: 'Adds the headless Angular Aria package. Its API owns selection, expansion, focus modes, keyboard navigation, and screen-reader semantics.'
  }
];

function createDemoNodes(): ApiPathRenderNode[] {
  return [
    {
      key: 'demo-root',
      label: '/',
      operation: false,
      expanded: true,
      children: [
        {
          key: 'demo-pets',
          label: '/pets',
          operation: false,
          expanded: true,
          children: [
            {key: 'demo-list-pets', label: 'GET', operation: true, method: 'GET', path: '/pets', tooltip: 'List all pets · Complexity 2', expanded: false, children: []},
            {key: 'demo-create-pet', label: 'POST', operation: true, method: 'POST', path: '/pets', tooltip: 'Create a pet · Complexity 5', expanded: false, children: []}
          ]
        },
        {
          key: 'demo-pet-id',
          label: '/pets/{petId}',
          operation: false,
          expanded: true,
          children: [
            {key: 'demo-show-pet', label: 'GET', operation: true, method: 'GET', path: '/pets/{petId}', tooltip: 'Show a pet by ID · Complexity 3', expanded: false, children: []},
            {key: 'demo-delete-pet', label: 'DELETE', operation: true, method: 'DELETE', path: '/pets/{petId}', tooltip: 'Delete a pet · Complexity 2', expanded: false, children: []}
          ]
        },
        {
          key: 'demo-audit',
          label: '/audit/events',
          operation: false,
          expanded: true,
          children: [
            {key: 'demo-list-audit', label: 'GET', operation: true, method: 'GET', path: '/audit/events', tooltip: 'List audit events · Complexity 4', expanded: false, children: []}
          ]
        }
      ]
    }
  ];
}

function adaptNodes(nodes: TreeNode[], parentKey = 'api'): ApiPathRenderNode[] {
  return nodes.map((node, index) => {
    const operation = node.type === 'operation';
    const operationNode = node as TreeNode & {
      id?: string;
      method?: string;
      path?: string;
      tooltip?: string;
    };
    const label = String(node.label ?? 'Unnamed');
    const key = String(node.key ?? operationNode.id ?? `${parentKey}/${index}:${label}`);

    return {
      key,
      label,
      operation,
      method: operationNode.method,
      path: operationNode.path,
      tooltip: operationNode.tooltip,
      expanded: node.expanded !== false,
      children: adaptNodes(node.children ?? [], key),
      source: node
    };
  });
}

function findNode(nodes: ApiPathRenderNode[], key: string): ApiPathRenderNode | undefined {
  for (const node of nodes) {
    if (node.key === key) {
      return node;
    }

    const child = findNode(node.children, key);
    if (child) {
      return child;
    }
  }

  return undefined;
}

@Component({
  selector: 'app-native-api-path-tree-prototype',
  imports: [CommonModule, NgTemplateOutlet],
  template: `
    <ul class="prototype-tree" [class.layout-horizontal]="horizontal" role="list" aria-label="API paths">
      <ng-template
        [ngTemplateOutlet]="nativeNodes"
        [ngTemplateOutletContext]="{nodes: nodes}" />
    </ul>

    <ng-template #nativeNodes let-nodes="nodes">
      @for (node of nodes; track node.key) {
        <li class="prototype-node">
          <button
            type="button"
            class="prototype-node__content"
            [class.prototype-operation]="node.operation"
            [attr.data-method]="node.method"
            [attr.aria-expanded]="node.operation ? null : node.expanded"
            [attr.title]="node.tooltip"
            (click)="activate(node)">
            @if (!node.operation) {
              <span class="prototype-chevron" aria-hidden="true">{{ node.expanded ? '−' : '+' }}</span>
            }
            <span>{{ node.label }}</span>
          </button>

          @if (node.children.length && node.expanded) {
            <ul class="prototype-group" role="list">
              <ng-template
                [ngTemplateOutlet]="nativeNodes"
                [ngTemplateOutletContext]="{nodes: node.children}" />
            </ul>
          }
        </li>
      }
    </ng-template>
  `,
  styleUrl: './api-path-tree-prototype.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class NativeApiPathTreePrototypeComponent {
  @Input({required: true}) nodes: ApiPathRenderNode[] = [];
  @Input() horizontal = true;
  @Output() operationSelect = new EventEmitter<ApiPathRenderNode>();

  activate(node: ApiPathRenderNode) {
    if (node.operation) {
      this.operationSelect.emit(node);
    } else {
      node.expanded = !node.expanded;
    }
  }
}

@Component({
  selector: 'app-cdk-api-path-tree-prototype',
  imports: [CdkNestedTreeNode, CdkTree, CdkTreeNodeDef, CdkTreeNodeOutlet],
  template: `
    <cdk-tree
      #tree="cdkTree"
      class="prototype-tree"
      [class.layout-horizontal]="horizontal"
      aria-label="API paths"
      [dataSource]="nodes"
      [childrenAccessor]="childrenAccessor"
      [expansionKey]="expansionKey">
      <cdk-nested-tree-node
        *cdkTreeNodeDef="let node"
        class="prototype-node"
        [isExpandable]="node.children.length > 0"
        [isExpanded]="node.expanded"
        [cdkTreeNodeTypeaheadLabel]="node.label"
        (expandedChange)="node.expanded = $event"
        (activation)="activate(node, tree)"
        (click)="activate(node, tree)">
        <div
          class="prototype-node__content"
          [class.prototype-operation]="node.operation"
          [attr.data-method]="node.method"
          [attr.title]="node.tooltip">
          @if (!node.operation) {
            <span class="prototype-chevron" aria-hidden="true">{{ tree.isExpanded(node) ? '−' : '+' }}</span>
          }
          <span>{{ node.label }}</span>
        </div>

        @if (node.children.length) {
          <div class="prototype-group" role="group" [class.prototype-group--hidden]="!tree.isExpanded(node)">
            <ng-container cdkTreeNodeOutlet />
          </div>
        }
      </cdk-nested-tree-node>
    </cdk-tree>
  `,
  styleUrl: './api-path-tree-prototype.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class CdkApiPathTreePrototypeComponent {
  @Input({required: true}) nodes: ApiPathRenderNode[] = [];
  @Input() horizontal = true;
  @Output() operationSelect = new EventEmitter<ApiPathRenderNode>();

  readonly childrenAccessor = (node: ApiPathRenderNode) => node.children;
  readonly expansionKey = (node: ApiPathRenderNode) => node.key;

  activate(node: ApiPathRenderNode, tree: CdkTree<ApiPathRenderNode, string>, event?: Event) {
    event?.stopPropagation();
    if (node.operation) {
      this.operationSelect.emit(node);
    } else {
      tree.toggle(node);
    }
  }
}

@Component({
  selector: 'app-aria-api-path-tree-prototype',
  imports: [NgTemplateOutlet, Tree, TreeItem, TreeItemGroup],
  template: `
    <ul
      ngTree
      #tree="ngTree"
      class="prototype-tree"
      [class.layout-horizontal]="horizontal"
      aria-label="API paths"
      [value]="selectedKeys"
      (valueChange)="selectionChanged($event)">
      <ng-template
        [ngTemplateOutlet]="ariaNodes"
        [ngTemplateOutletContext]="{nodes: nodes, parent: tree}" />
    </ul>

    <ng-template #ariaNodes let-nodes="nodes" let-parent="parent">
      @for (node of nodes; track node.key) {
        <li
          ngTreeItem
          #treeItem="ngTreeItem"
          class="prototype-node"
          [parent]="parent"
          [value]="node.key"
          [label]="node.label"
          [selectable]="node.operation"
          [(expanded)]="node.expanded">
          <div
            class="prototype-node__content"
            [class.prototype-operation]="node.operation"
            [attr.data-method]="node.method"
            [attr.title]="node.tooltip">
            @if (!node.operation) {
              <span class="prototype-chevron" aria-hidden="true">{{ treeItem.expanded() ? '−' : '+' }}</span>
            }
            <span>{{ node.label }}</span>
          </div>
        </li>

        @if (node.children.length) {
          <ul class="prototype-group" role="group" [class.prototype-group--hidden]="!treeItem.expanded()">
            <ng-template ngTreeItemGroup [ownedBy]="treeItem" #group="ngTreeItemGroup">
              <ng-template
                [ngTemplateOutlet]="ariaNodes"
                [ngTemplateOutletContext]="{nodes: node.children, parent: group}" />
            </ng-template>
          </ul>
        }
      }
    </ng-template>
  `,
  styleUrl: './api-path-tree-prototype.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class AriaApiPathTreePrototypeComponent {
  @Input({required: true}) nodes: ApiPathRenderNode[] = [];
  @Input() horizontal = true;
  @Output() operationSelect = new EventEmitter<ApiPathRenderNode>();

  selectedKeys: string[] = [];

  selectionChanged(keys: string[]) {
    this.selectedKeys = keys;
    const selected = keys.at(-1);
    const node = selected ? findNode(this.nodes, selected) : undefined;
    if (node?.operation) {
      this.operationSelect.emit(node);
    }
  }
}

@Component({
  selector: 'app-api-path-tree-prototype',
  imports: [
    AriaApiPathTreePrototypeComponent,
    CdkApiPathTreePrototypeComponent,
    NativeApiPathTreePrototypeComponent
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <aside class="prototype-notice">
      <strong>Throwaway renderer prototype · {{ currentVariant.key }} — {{ currentVariant.name }}</strong>
      <span>{{ currentVariant.summary }}</span>
      <span class="prototype-state">
        State: {{ countNodes(renderNodes) }} nodes · {{ countExpanded(renderNodes) }} branches expanded ·
        {{ selectedLabel || 'no operation activated' }} · {{ horizontal ? 'diagram layout' : 'list layout' }}
      </span>
    </aside>

    @switch (variant) {
      @case ('A') {
        <app-native-api-path-tree-prototype
          [nodes]="renderNodes"
          [horizontal]="horizontal"
          (operationSelect)="selectOperation($event)" />
      }
      @case ('B') {
        <app-cdk-api-path-tree-prototype
          [nodes]="renderNodes"
          [horizontal]="horizontal"
          (operationSelect)="selectOperation($event)" />
      }
      @case ('C') {
        <app-aria-api-path-tree-prototype
          [nodes]="renderNodes"
          [horizontal]="horizontal"
          (operationSelect)="selectOperation($event)" />
      }
    }

    @if (showSwitcher) {
      <nav class="prototype-switcher" aria-label="Prototype variant switcher">
        <button type="button" aria-label="Previous prototype variant" (click)="cycle(-1)">←</button>
        <span>{{ currentVariant.key }} — {{ currentVariant.name }}</span>
        <button type="button" aria-label="Next prototype variant" (click)="cycle(1)">→</button>
      </nav>
    }
  `,
  styleUrl: './api-path-tree-prototype.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ApiPathTreePrototypeComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  @Input() horizontal = true;
  @Output() operationSelect = new EventEmitter<TreeNode>();

  private readonly demoNodes = createDemoNodes();
  private readonly subscriptions = new Subscription();
  private sourceNodes: TreeNode[] = [];

  renderNodes = this.demoNodes;
  selectedLabel?: string;
  variant: PrototypeVariant = 'A';
  readonly showSwitcher = isDevMode();

  readonly variants = VARIANTS;

  @Input()
  set nodes(value: TreeNode[]) {
    this.sourceNodes = value;
    this.renderNodes = value.length ? adaptNodes(value) : this.demoNodes;
    this.selectedLabel = undefined;
  }

  get nodes(): TreeNode[] {
    return this.sourceNodes;
  }

  get currentVariant(): VariantDescription {
    return this.variants.find(candidate => candidate.key === this.variant) ?? this.variants[0];
  }

  ngOnInit() {
    this.subscriptions.add(this.route.queryParamMap.subscribe(params => {
      const requested = params.get('variant')?.toUpperCase();
      this.variant = requested === 'B' || requested === 'C' ? requested : 'A';
    }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent) {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)) {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const active = document.activeElement;
      if (active?.closest('.prototype-tree')) {
        return;
      }

      event.preventDefault();
      this.cycle(event.key === 'ArrowLeft' ? -1 : 1);
    }
  }

  cycle(offset: number) {
    const currentIndex = this.variants.findIndex(candidate => candidate.key === this.variant);
    const next = this.variants[(currentIndex + offset + this.variants.length) % this.variants.length];
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {variant: next.key},
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  selectOperation(node: ApiPathRenderNode) {
    this.selectedLabel = `${node.method ?? node.label} ${node.path ?? ''}`.trim();
    if (node.source) {
      this.operationSelect.emit(node.source);
    }
  }

  countNodes(nodes: ApiPathRenderNode[]): number {
    return nodes.reduce((total, node) => total + 1 + this.countNodes(node.children), 0);
  }

  countExpanded(nodes: ApiPathRenderNode[]): number {
    return nodes.reduce((total, node) => {
      const expanded = !node.operation && node.expanded ? 1 : 0;
      return total + expanded + this.countExpanded(node.children);
    }, 0);
  }
}
