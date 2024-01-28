import { Injectable, ComponentFactoryResolver } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { Subject } from 'rxjs';
import {
          getPath, OpenAPIObject, OperationObject,
          PathItemObject, PathsObject, SchemaObject,
          RequestBodyObject, ReferenceObject, MediaTypeObject, ResponseObject
        } from 'openapi3-ts/oas31';

@Injectable({
  providedIn: 'root'
})
/**
 * Service which specialises in conversions between OpenAPI Specification
 * objects and the TreeNode structures used for the visualisation.
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
  readonly treeNodesChanged = new Subject<TreeNode[]>();

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
  private apiPathNodes: TreeNode[] = [];

  /* Map of the absolute path to the node definition */
  private treeNodes = new Map<string, TreeNode>();

  constructor() {
    this.reset();
  }

  /**
   * Clear all state and notify that there are no Tree Nodes
   * for display.
   */
  reset() {
    this.apiPathNodes = [];
    this.treeNodes = new Map<string, TreeNode>();

    /* Setup the initial root node */
    const rootNode: TreeNode = {
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
  addApiSpecification(openApiSpec: OpenAPIObject) {

    /* Convert the specification paths into nodes */
    console.log(openApiSpec);
    this.convertPathsToTree(openApiSpec.paths, openApiSpec);


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

  /**
   * Create a tree node for a component schema object with nested
   * structure below it for any child components referenced by properties
   *
   * @param schema the schema object
   */
  public createComponentSchemaPropertiesToTreeNodes(schema: SchemaObject | ReferenceObject, apiDefinition: OpenAPIObject): TreeNode[] {
    
    let schemaObject = this.getSchemaObjectFromReference(schema, apiDefinition);
    
    const nodes: TreeNode[] = [];
    if (schemaObject.type && schemaObject.type === 'array') {
      const node = this.createSchemaPropertyToTreeNode(schemaObject.title, schemaObject.items, apiDefinition);
      if (node) {
        const root: TreeNode = {
          label: schemaObject.title,
          leaf: false,
          expanded: true,
          children: [node],
          data: schemaObject
        };
        nodes.push(root);
      }
    }
    if (schemaObject.properties) {
      Object.keys(schemaObject.properties).forEach(title => {
        const node = this.createSchemaPropertyToTreeNode(title, schemaObject.properties[title], apiDefinition);
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
  private convertPathsToTree(paths: PathsObject, apiDefinition: OpenAPIObject) {

    /* Iterate through each API path key building up the tree nodes */
    Object.keys(paths).forEach(key => {
      console.log('Key: %s', key);
      const apiPath: PathItemObject = getPath(paths, key);
      console.log(apiPath);

      /* Need to work back up the path structure. */
      key.split('/')
        .forEach((value, index, pathSegments) => {

          console.debug('Loop values: Value "%s", Index %d, PathSegments: %o', value, index, pathSegments);

          /* Work out the path for the node we are trying to work on.
           * Note that slice does not include the end indexed element, so need to add 1 here.
           */
          const pathSoFar = '/'.concat(
              pathSegments.slice(0, (index + 1))
              .filter(pathSegment => pathSegment.length > 0)
              .join('/'));
          console.log('Path so far: %s', pathSoFar);

          /* Work out the path for the parent */
          const parentPath = '/'.concat(
              pathSegments.slice(0, index)
              .filter(pathSegment => pathSegment.length > 0)
              .join('/'));

          /* Get the parent node. This should always exist as we are working from back to front for the path */
          const parentNode = this.treeNodes.get(parentPath);
          console.debug('Parent node: %s, %o', parentPath, parentNode);

          /* Get the node definition if it already exists (for instance we are adding a HTTP method to an existng path definition) */
          let pathNode = this.treeNodes.get(pathSoFar);
          if (pathNode === undefined) {

            /* Did not already exist, create it */
            console.log('Creating node for path %s', pathSoFar);
            pathNode = this.createPathNode('/'.concat(value), getPath(paths, pathSoFar));
            this.treeNodes.set(pathSoFar, pathNode);

            /* Add it to the parent, if we are not dealing with the root node */
            if (parentNode !== undefined) {
              parentNode.children.push(pathNode);
            }
          }

          if (key === pathSoFar) {
            /* If the path matches the original key then we are at
             * the level we need to add the HTTP methods */
            console.log('Path %s matches the key %s', pathSoFar, key);

            /* Iterate through the possible http methods, adding nodes as required */
            this.httpMethods.forEach(method => {
              if (apiPath[method]) {
                /* Definition exists for the http method */
                pathNode.children.push(
                  this.createHttpMethodNode(key, method.toUpperCase(), apiPath[method], apiDefinition));
              }
            });
          } else {
            console.log('No match between %s and %s', key, pathSoFar);
          }
      });
    });

  }

  /**
   * Create a non-leaf node for a path.
   *
   * @param path the path segment to have as the label for the node
   * @param definition the path section definition
   */
  private createPathNode(path: string, definition: PathItemObject): TreeNode {

    const node: TreeNode = {
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
  private createHttpMethodNode(path: string, method: string, operation: OperationObject, apiDefinition: OpenAPIObject): TreeNode {

    console.debug('Creating HTTP method node for %s (%s)', operation.operationId, method);

    const node: OperationTreeNode = {
      label: method,
      leaf: true,
      type: 'operation',
      styleClass: 'p-treenode-http-method-' + method.toLowerCase(),
      operation,
      method,
      path
    };

    /* Work out the object complexity */
    node.complexity = this.calculateComplexity(operation, apiDefinition);

    /* Add a tooltip */
    if (operation.description) {
      node.tooltip = operation.description;
    } else if (operation.summary) {
      node.tooltip = operation.summary;
    }

    if (node.tooltip) {
      node.tooltip += '<br/><br/>Complexity: ' + node.complexity;
    } else {
      node.tooltip = 'Complexity: ' + node.complexity;
    }

    /* Add an id */
    if (node.operation && node.operation.operationId) {
      node.id = node.operation.operationId;
    }

    return node;

  }

  private calculateComplexity(operation: OperationObject, apiDefinition: OpenAPIObject): number {

    /* Calculate the complexity of the request object */
    let totalComplexity = 0;
    if (operation.requestBody) {
      totalComplexity += this.calculateObjectComplexity(operation.requestBody, apiDefinition);
    }

    /* A bit crude, but only care about "ok" and "created" responses. */
    if (operation.responses[200]) {
      totalComplexity += this.calculateObjectComplexity(operation.responses[200], apiDefinition);
    }
    if (operation.responses[201]) {
      totalComplexity += this.calculateObjectComplexity(operation.responses[201], apiDefinition);
    }

    console.log('Complexity: %s', totalComplexity);
    return totalComplexity;
  }

  private calculateObjectComplexity(object: any, apiDefinition: OpenAPIObject): number {

    let complexity = 1;

    if (object === undefined) {
      /* If the object supplied isn't defined, nothing should be added.
       * Doing this to prevent having to do additional checking in the caller
       */
      complexity = 0;

    } else if (this.isRequestBodyObject(object) || this.isResponseObject(object)) {
      console.log('Request or Response body object: %s', object.content);

      /* Process each media type */
      Object.keys(object).forEach(key => {
        console.log('key: %s, value: %s', key, object[key]);

        /* Keep recursing down to calculate the complexity */
        complexity += this.calculateObjectComplexity(object[key], apiDefinition);
      });
    } else if (this.isMediaTypeObject(object)) {
      /* Keep recursing down to calculate the complexity */
      complexity += this.calculateObjectComplexity(object.schema, apiDefinition);
    } else if (this.isReferenceObject(object)) {
      console.log('Reference needs resolved: %s', object.$ref);
      const resolvedReference = this.resolveReference(object.$ref, apiDefinition);
      console.log('Resolved Reference: ', resolvedReference);
      complexity += this.calculateObjectComplexity(resolvedReference, apiDefinition);
    } else if (this.isSchemaObject(object)) {
      /* Quite a few fields in this we could consider, most of these will not be set */
      console.log('Schema object needs processed: %s', object);

      complexity += this.calculateObjectComplexity(object.items, apiDefinition);
      complexity += this.calculateObjectComplexity(object.allOf, apiDefinition);
      complexity += this.calculateObjectComplexity(object.anyOf, apiDefinition);
      complexity += this.calculateObjectComplexity(object.oneOf, apiDefinition);
      /* TODO: Check - if this is for excluding fields from a combined object
       * then it should make the score go down */
      complexity -= this.calculateObjectComplexity(object.not, apiDefinition);

      if (object.properties) {
        /* Actual definition of fields in an object.
         * Keys here are the fields which can be in the object */
        complexity += Object.keys(object.properties).length;
      }

    } else {
      console.log('Did not process object: %s', object);
      console.log(object);
    }

    return complexity;
  }

  private resolveReference(name: string, apiDefinition: OpenAPIObject): any {

    const nameParts = name.split('/');
    /* remove the first element, this will always be a '#' */
    nameParts.shift();

    console.log('Name parts: %s', nameParts);
    console.log(nameParts);

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
  private createSchemaPropertyToTreeNode(title: string, property: SchemaObject | ReferenceObject, apiDefinition: OpenAPIObject): TreeNode {

    let schemaObject = this.getSchemaObjectFromReference(property, apiDefinition);
    
    const node: TreeNode = {
      label: title,
      leaf: true,
      expanded: false,
      children: [],
      data: property
    };

    Object.keys(property).forEach(key => {
        if (key === 'type' && property[key] === 'array') {
          // If we have an array type then start to recursively traverse and add child nodes
          node.leaf = false;
          node.children = this.createComponentSchemaPropertiesToTreeNodes(schemaObject.items, apiDefinition);
        } else {
          // console.log(`Unrecognised property: [${key}]`);
        }
    });
    return node;
  }

  /**
   * Helper method using type guards to determine if the supplied object is a RequestBodyObject.
   *
   * @param object the object to test
   */
  private isRequestBodyObject(object: unknown): object is RequestBodyObject {
    return (object as RequestBodyObject).content !== undefined;
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
   * Helper method using type guards to determine if the supplied object is a MediaTypeObject.
   *
   * @param object the object to test
   */
  private isMediaTypeObject(object: unknown): object is MediaTypeObject {
    return (object as MediaTypeObject).schema !== undefined;
  }

  /**
   * Helper method using type guards to determine if the supplied object is a ResponseObject.
   *
   * @param object the object to test
   */
  private isResponseObject(object: unknown): object is ResponseObject {
    return (object as ResponseObject).content !== undefined;
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
      schemaObject.not !== undefined);
  }

  private getSchemaObjectFromReference(object: SchemaObject | ReferenceObject, apiDefinition: OpenAPIObject): SchemaObject {
    let schemaObject: SchemaObject;
    if (this.isReferenceObject(object)) {
      console.log('Reference needs resolved: %s', object.$ref);
      return this.resolveReference(object.$ref, apiDefinition);
    } else if (this.isSchemaObject(object)) {
      return object
    }
  }

}




export interface OperationTreeNode extends TreeNode {
  tooltip?: string;
  id?: string;

  // Additional fields to supply details to Node Detail Rendering
  method?: string;
  path?: string;
  operation?: OperationObject;
  complexity?: number;
}
