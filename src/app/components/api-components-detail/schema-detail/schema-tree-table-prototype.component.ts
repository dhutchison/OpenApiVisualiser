import {CdkTreeModule} from '@angular/cdk/tree';
import {DOCUMENT, NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, HostListener, inject} from '@angular/core';

interface PrototypeSchemaNode {
  key: string;
  name: string;
  type: string;
  format?: string;
  description: string;
  required?: boolean;
  reference?: string;
  children?: PrototypeSchemaNode[];
}

interface VisibleSchemaRow {
  node: PrototypeSchemaNode;
  level: number;
}

// PROTOTYPE: Three schema-property renderer variants on the existing route, switchable via ?variant=.
@Component({
  selector: 'app-schema-tree-table-prototype',
  imports: [CdkTreeModule, NgTemplateOutlet],
  templateUrl: './schema-tree-table-prototype.component.html',
  styleUrl: './schema-tree-table-prototype.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchemaTreeTablePrototypeComponent {
  private readonly document = inject(DOCUMENT);

  readonly variants = ['A', 'B', 'C'] as const;
  readonly variantNames = {A: 'Disclosure table', B: 'CDK tree grid', C: 'Nested property list'} as const;
  readonly nodes: PrototypeSchemaNode[] = [
    {key: 'order-id', name: 'id', type: 'string', format: 'uuid', description: 'Stable identifier for the order.', required: true},
    {
      key: 'order-customer', name: 'customer', type: 'object', description: 'The customer that placed the order.', required: true,
      children: [
        {key: 'order-customer-id', name: 'id', type: 'string', description: 'Customer identifier.', required: true},
        {
          key: 'order-customer-profile', name: 'profile', type: 'object', description: 'Public customer details.',
          children: [
            {key: 'order-customer-profile-name', name: 'displayName', type: 'string', description: 'Name shown to support agents.'},
            {key: 'order-customer-profile-avatar', name: 'avatar', type: 'string', format: 'uri', description: 'Optional profile image.'}
          ]
        }
      ]
    },
    {
      key: 'order-lines', name: 'lines', type: 'array', description: 'One or more products in the order.', required: true,
      children: [{
        key: 'order-lines-item', name: 'items', type: 'object', description: 'A purchased product.', reference: '#/components/schemas/OrderLine',
        children: [
          {key: 'order-lines-item-sku', name: 'sku', type: 'string', description: 'Merchant stock-keeping unit.', required: true},
          {key: 'order-lines-item-quantity', name: 'quantity', type: 'integer', format: 'int32', description: 'Quantity ordered. Minimum: 1.', required: true}
        ]
      }]
    },
    {key: 'order-status', name: 'status', type: 'string', description: 'Current fulfilment state.'}
  ];

  readonly childrenAccessor = (node: PrototypeSchemaNode) => node.children ?? [];
  readonly expansionKey = (node: PrototypeSchemaNode) => node.key;
  expandedKeys = new Set(['order-customer', 'order-lines', 'order-lines-item']);

  get variant(): 'A' | 'B' | 'C' {
    const value = new URLSearchParams(this.document.defaultView?.location.search).get('variant')?.toUpperCase();
    return value === 'B' || value === 'C' ? value : 'A';
  }

  get visibleRows(): VisibleSchemaRow[] {
    return this.flattenVisible(this.nodes);
  }

  isExpandable(node: PrototypeSchemaNode): boolean {
    return Boolean(node.children?.length);
  }

  isExpanded(node: PrototypeSchemaNode): boolean {
    return this.expandedKeys.has(node.key);
  }

  toggle(node: PrototypeSchemaNode): void {
    const next = new Set(this.expandedKeys);
    if (next.has(node.key)) {
      next.delete(node.key);
    } else {
      next.add(node.key);
    }
    this.expandedKeys = next;
  }

  setExpanded(node: PrototypeSchemaNode, expanded: boolean): void {
    if (this.isExpanded(node) !== expanded) {
      this.toggle(node);
    }
  }

  referenceTarget(reference: string): string {
    return reference.replaceAll('/', '_').replace('#', '');
  }

  setVariant(direction: -1 | 1): void {
    const current = this.variants.indexOf(this.variant);
    const next = (current + direction + this.variants.length) % this.variants.length;
    const url = new URL(this.document.defaultView?.location.href ?? 'http://localhost');
    url.searchParams.set('variant', this.variants[next]);
    this.document.defaultView?.history.replaceState({}, '', url);
    this.document.defaultView?.location.reload();
  }

  @HostListener('document:keydown', ['$event'])
  handleVariantShortcut(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.matches('input, textarea, [contenteditable="true"]')) return;
    if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      this.setVariant(event.key === 'ArrowLeft' ? -1 : 1);
    }
  }

  private flattenVisible(nodes: PrototypeSchemaNode[], level = 1): VisibleSchemaRow[] {
    return nodes.flatMap(node => [
      {node, level},
      ...(this.isExpanded(node) ? this.flattenVisible(node.children ?? [], level + 1) : [])
    ]);
  }
}
