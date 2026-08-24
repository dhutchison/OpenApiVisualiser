import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {
          getPath, OpenAPIObject, OperationObject,
          PathItemObject, PathsObject, SchemaObject,
          ReferenceObject
        } from 'openapi3-ts/oas31';
import { ApiOperationNode, ApiPathNode, ApiPathTreeNode, SchemaPropertyNode } from '../models/hierarchy.models';
import { LoadedDocument } from '../models/loaded-document.models';
import { ComplexityAssessmentState } from '../complexity/complexity.models';

@Injectable({
  providedIn: 'root'
})
/**
 * Service which specialises in conversions between OpenAPI Specification
 * objects and the application-owned hierarchy structures used for the visualisation.
 *
 * This object will hold state and requires to be "reset" if the
 * visualisation should throw away items rendered to date.
 */
export class OpenapiTreenodeConverterService {

  /**
   * Subject which interested modules can subscribe to
   * in order to be informed when the nodes for display
   * change.
   */
  readonly treeNodesChanged = new Subject<ApiPathTreeNode[]>();

  /**
   * Array containing the possible HTTP methods which can have operations for a path.
   */
  private readonly httpMethods = [
    'get',
    'put',
    'post',
    'delete',
    'options',
    'head',
    'patch',
    'trace'
  ];

  /**
   * Object hoilding the tree nodes to display
   */
  private readonly apiPathNodes: ApiPathTreeNode[] = [];

  /* Map of the absolute path to the node definition */
  private readonly treeNodes = new Map<string, ApiPathNode>();

  private readonly operationNodes = new Map<string, ApiOperationNode>();

  constructor() {
    this.reset();
  }

  /**
   * Clear all state and notify that there are no Tree Nodes
   * for display.
   */
  reset() {
    this.apiPathNodes.length = 0;
    this.treeNodes.clear();
    this.operationNodes.clear();

    /* Setup the initial root node */
    const rootNode: ApiPathNode = {
      kind: 'path',
      label: '/',
      leaf: false,
      children: [],
      expanded: true
    };
    this.treeNodes.set(rootNode.label, rootNode);


    /* Notify subscribers that there are no nodes */
    this.treeNodesChanged.next(this.apiPathNodes);
  }

  /**
   * Merge in the paths and operations from the supplied OpenApi Specification
   * in to the current state in this service and notify subscribers
   * of the updated Tree Nodes.
   *
   * @param openApiSpec the specification to merge in.
   */
  addApiSpecification(openApiSpec: OpenAPIObject | LoadedDocument) {
    const loadedDocument = this.isLoadedDocument(openApiSpec) ? openApiSpec : undefined;
    const document: OpenAPIObject = loadedDocument ? loadedDocument.document : openApiSpec as OpenAPIObject;
    const scopeId = loadedDocument?.scopeId ?? 'assessment-scope:test';

    /* Convert the specification paths into nodes */
    this.convertPathsToTree(document.paths ?? {}, document, scopeId);


    if (this.apiPathNodes.length === 0) {
      /* This must be the first specification being added,
       * push the root node if it exists.
       */


      const rootNode = this.treeNodes.get('/');
      if (rootNode) {
        this.apiPathNodes.push(rootNode);
      }
    }

    /* Notify subscribers */
    this.treeNodesChanged.next(this.apiPathNodes);

  }

  setAssessmentState(state: ComplexityAssessmentState) {
    this.operationNodes.forEach(node => {
      if (node.scopeId !== state.scopeId) {
        return;
      }

      node.assessmentState = state.status;
      node.assessment = state.report?.assessments.find(assessment => assessment.identity.key === node.assessmentKey);
      node.assessmentFailure = state.report?.failure;
    });

    this.treeNodesChanged.next(this.apiPathNodes);
  }

  private isLoadedDocument(value: OpenAPIObject | LoadedDocument): value is LoadedDocument {
    return 'scopeId' in value && 'document' in value && 'resourceSet' in value;
  }

  /**
   * Create a tree node for a component schema object with nested
   * structure below it for any child components referenced by properties
   *
   * @param schema the schema object
   */
  public createComponentSchemaPropertiesToTreeNodes(
    schema: SchemaObject | ReferenceObject,
    apiDefinition: OpenAPIObject,
    visitedReferences = new Set<string>()
  ): SchemaPropertyNode[] {
    if (this.isReferenceObject(schema) && visitedReferences.has(schema.$ref)) {
      return [];
    }

    const nextVisitedReferences = new Set(visitedReferences);
    if (this.isReferenceObject(schema)) {
      nextVisitedReferences.add(schema.$ref);
    }

    let schemaObject = this.getSchemaObjectFromReference(schema, apiDefinition);

    const nodes: SchemaPropertyNode[] = [];
    if (schemaObject.type && schemaObject.type === 'array') {
      const node = this.createSchemaPropertyToTreeNode(
        schemaObject.title ?? '',
        schemaObject.items,
        apiDefinition,
        false,
        nextVisitedReferences
      );
      if (node) {
        const root: SchemaPropertyNode = {
          label: schemaObject.title ?? '',
          leaf: node.children.length === 0,
          expanded: true,
          children: [node],
          data: schemaObject
        };
        nodes.push(root);
      }
    }
    if (schemaObject.properties) {
      Object.keys(schemaObject.properties).forEach(title => {
        const node = this.createSchemaPropertyToTreeNode(
          title,
          schemaObject.properties[title],
          apiDefinition,
          schemaObject.required?.includes(title),
          nextVisitedReferences
        );
        if (node) {
          nodes.push(node);
        }
      });
    }
    return nodes;
  }

  /**
   * Create a heirarchy of Tree Nodes based on the supplied path definitions from the
   * OpenAPI specification.
   *
   * This will update the internal "treeNodes" map with the nodes which are
   * created / updated.
   *
   * @param paths the paths contained in the API specification.
   */
  private convertPathsToTree(paths: PathsObject, apiDefinition: OpenAPIObject, scopeId: string) {

    /* Iterate through each API path key building up the tree nodes */
    Object.keys(paths).forEach(key => {
      const apiPath: PathItemObject = getPath(paths, key);

      /* Need to work back up the path structure. */
      key.split('/')
        .forEach((value, index, pathSegments) => {

          /* Work out the path for the node we are trying to work on.
           * Note that slice does not include the end indexed element, so need to add 1 here.
           */
          const pathSoFar = '/'.concat(
              pathSegments.slice(0, (index + 1))
              .filter(pathSegment => pathSegment.length > 0)
              .join('/'));

          /* Work out the path for the parent */
          const parentPath = '/'.concat(
              pathSegments.slice(0, index)
              .filter(pathSegment => pathSegment.length > 0)
              .join('/'));

          /* Get the parent node. This should always exist as we are working from back to front for the path */
          const parentNode = this.treeNodes.get(parentPath);

          /* Get the node definition if it already exists (for instance we are adding a HTTP method to an existng path definition) */
          let pathNode = this.treeNodes.get(pathSoFar);
          if (pathNode === undefined) {

            /* Did not already exist, create it */
            pathNode = this.createPathNode('/'.concat(value));
            this.treeNodes.set(pathSoFar, pathNode);

            /* Add it to the parent, if we are not dealing with the root node */
            if (parentNode !== undefined) {
              parentNode.children.push(pathNode);
            }
          }

          if (key === pathSoFar) {
            /* If the path matches the original key then we are at
             * the level we need to add the HTTP methods */

            /* Iterate through the possible http methods, adding nodes as required */
            this.httpMethods.forEach(method => {
              if (apiPath[method]) {
                /* Definition exists for the http method */
                  pathNode.children.push(
                  this.createHttpMethodNode(key, method.toUpperCase(), apiPath[method], apiDefinition, scopeId));
              }
            });
          }
      });
    });

  }

  /**
   * Create a non-leaf node for a path.
   *
   * @param path the path segment to have as the label for the node
   */
  private createPathNode(path: string): ApiPathNode {

    const node: ApiPathNode = {
      kind: 'path',
      label: path,
      leaf: false,
      expanded: true,
      children: []
    };

    return node;
  }

  /**
   * Create a leaf node for an HTTP Method Operation
   *
   * @param method the HTTP method
   * @param operation the details of the Operation
   */
  private createHttpMethodNode(path: string, method: string, operation: OperationObject, apiDefinition: OpenAPIObject, scopeId: string): ApiOperationNode {
    const assessmentKey = `${scopeId}:${method.toLowerCase()}:${path}`;

    const node: ApiOperationNode = {
      kind: 'operation',
      label: method,
      leaf: true,
      tooltip: '',
      children: [],
      operation,
      method,
      path,
      apiDefinition,
      scopeId,
      assessmentKey,
      assessmentState: 'Pending'
    };

    /* Add a tooltip */
    if (operation.description) {
      node.tooltip = operation.description;
    } else if (operation.summary) {
      node.tooltip = operation.summary;
    }

    /* Add an id */
    if (node.operation && node.operation.operationId) {
      node.id = node.operation.operationId;
    }

    this.operationNodes.set(assessmentKey, node);

    return node;

  }

  private resolveReference(name: string, apiDefinition: OpenAPIObject): any {

    const nameParts = name.split('/');
    /* remove the first element, this will always be a '#' */
    nameParts.shift();

    /* Only interested in index 1 onwards */
    let object = apiDefinition;
    for (const key of nameParts) {
      object = object[key];
    }

    return object;
  }

  /**
   * Create a tree node for the property component schema object with nested
   * structure below it for any child components referenced by properties
   *
   * @param schema the schema object
   */
  private createSchemaPropertyToTreeNode(
    title: string,
    property: SchemaObject | ReferenceObject,
    apiDefinition: OpenAPIObject,
    required = false,
    visitedReferences = new Set<string>()
  ): SchemaPropertyNode {

    let schemaObject = this.getSchemaObjectFromReference(property, apiDefinition);
    
    const node: SchemaPropertyNode = {
      label: title,
      leaf: true,
      expanded: false,
      required,
      children: [],
      data: property
    };

    if (schemaObject.type === 'array' && schemaObject.items) {
      node.children = this.createComponentSchemaPropertiesToTreeNodes(
        schemaObject.items,
        apiDefinition,
        visitedReferences
      );
    } else if (schemaObject.properties) {
      node.children = this.createComponentSchemaPropertiesToTreeNodes(schemaObject, apiDefinition, visitedReferences);
    }
    node.leaf = node.children.length === 0;
    return node;
  }

  /**
   * Helper method using type guards to determine if the supplied object is a ReferenceObject.
   *
   * @param object the object to test
   */
  private isReferenceObject(object: unknown): object is ReferenceObject {
    return (object as ReferenceObject).$ref !== undefined;
  }

  /**
   * Helper method using type guards to determine if the supplied object is a SchemaObject.
   *
   * @param object the object to test
   */
  private isSchemaObject(object: unknown): object is SchemaObject {

    const schemaObject = (object as SchemaObject);

    return (schemaObject.properties !== undefined ||
      schemaObject.items !== undefined ||
      schemaObject.allOf !== undefined ||
      schemaObject.anyOf !== undefined ||
      schemaObject.oneOf !== undefined ||
      schemaObject.not !== undefined ||
      schemaObject.type !== undefined ||
      schemaObject.description !== undefined ||
      schemaObject.format !== undefined ||
      schemaObject.enum !== undefined);
  }

  private getSchemaObjectFromReference(object: SchemaObject | ReferenceObject, apiDefinition: OpenAPIObject): SchemaObject {
    let schemaObject: SchemaObject;
    if (this.isReferenceObject(object)) {
      return this.resolveReference(object.$ref, apiDefinition);
    } else if (this.isSchemaObject(object)) {
      return object
    }
  }

}
