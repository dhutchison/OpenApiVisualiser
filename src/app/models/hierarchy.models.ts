import { OpenAPIObject, OperationObject, ReferenceObject, SchemaObject } from 'openapi3-ts/oas31';

/** A branch in the application-owned API path hierarchy. */
export interface ApiPathNode {
  kind: 'path';
  label: string;
  leaf: false;
  expanded: boolean;
  children: ApiPathTreeNode[];
}

/** A leaf in the application-owned API path hierarchy. */
export interface ApiOperationNode {
  kind: 'operation';
  label: string;
  leaf: true;
  expanded?: boolean;
  children: [];
  tooltip: string;
  id?: string;
  method: string;
  path: string;
  operation: OperationObject;
  apiDefinition: OpenAPIObject;
  complexity: number;
}

export type ApiPathTreeNode = ApiPathNode | ApiOperationNode;

/** A node in the application-owned schema-property hierarchy. */
export interface SchemaPropertyNode {
  label: string;
  leaf: boolean;
  expanded: boolean;
  children: SchemaPropertyNode[];
  data: SchemaObject | ReferenceObject;
}

export function isApiOperationNode(node: ApiPathTreeNode): node is ApiOperationNode {
  return node.kind === 'operation';
}
