import { Injectable } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { Subject } from 'rxjs';
import {
          getPath, OpenApiSpec, OperationObject,
          PathItemObject, PathsObject, SchemaObject,
          RequestBodyObject, ReferenceObject, ComponentsObject, MediaTypeObject, ResponseObject
        } from '@loopback/openapi-v3-types';

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
   * Subject which interested modules can subscribe to
   * in order to be informed when the nodes for display
   * change.
   */
  readonly treeNodesChanged = new Subject<TreeNode[]>();

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
   * @param openApiSpec the specification to merge in.
   */
  addApiSpecification(openApiSpec: OpenApiSpec) {

    /* Convert the specification paths into nodes */
    this.convertPathsToTree(openApiSpec.paths, openApiSpec.components);


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
   * Create a heirarchy of Tree Nodes based on the supplied path definitions from the
   * OpenAPI specification.
   *
   * This will update the internal "treeNodes" map with the nodes which are
   * created / updated.
   *
   * @param paths the paths contained in the API specification.
   */
  private convertPathsToTree(paths: PathsObject, components: ComponentsObject) {

    /* Iterate through each API path key building up the tree nodes */
    Object.keys(paths).forEach(key => {
      console.log('Key: %s', key);
      const apiPath: PathItemObject = getPath(paths, key);
      console.log(apiPath);

      /* Need to work back up the path structure. Filtering out any blank elements */
      key.split('/')
        .filter(value => value.length > 0)
        .forEach((value, index, pathSegments) => {

          console.log('Loop values: Value %s, Index %d, PathSegments:', value, index);
          console.log(pathSegments);


          /* Work out the path for the node we are trying to work on.
           * Note that slice does not include the end indexed element, so need to add 1 here.
           */
          const pathSoFar = '/'.concat(pathSegments.slice(0, (index + 1)).join('/'));
          console.log('Path so far: %s', pathSoFar);

          /* Work out the path for the parent */
          const parentPath = '/'.concat(pathSegments.slice(0, index).join('/'));

          /* Get the parent node. This should always exist as we are working from back to front for the path */
          const parentNode = this.treeNodes.get(parentPath);
          console.log('Parent node: '.concat(parentPath));
          console.log(parentNode);

          /* Get the node definition if it already exists (for instance we are adding a HTTP method to an existng path definition) */
          let pathNode = this.treeNodes.get(pathSoFar);
          if (pathNode === undefined) {

            /* Did not already exist, create it */
            console.log('Creating node for path %s', pathSoFar);
            pathNode = this.createPathNode('/'.concat(value), getPath(paths, pathSoFar));
            this.treeNodes.set(pathSoFar, pathNode);

            /* Add it to the parent */
            parentNode.children.push(pathNode);
          }

          if (key === pathSoFar) {
            /* If the path matches the original key then we are at
             * the level we need to add the HTTP methods */
            console.log('Path matches the key');

            /* Iterate through the possible http methods, adding nodes as required */
            this.httpMethods.forEach(method => {
              if (apiPath[method]) {
                /* Definition exists for the http method */
                pathNode.children.push(
                  this.createHttpMethodNode(key, method.toUpperCase(), apiPath[method], components));
              }
            });
          }
      });
    });

  }

  /**
   * Create a non-leaf node for a path.
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
   * @param method the HTTP method
   * @param operation the details of the Operation
   */
  private createHttpMethodNode(path: string, method: string, operation: OperationObject, components: ComponentsObject): TreeNode {

    const node: OperationTreeNode = {
      label: method,
      leaf: true,
      type: 'operation',
      styleClass: 'ui-treenode-http-method-' + method.toLowerCase(),
      operation,
      method,
      path
    };

    /* Add a tooltip */
    if (operation.description) {
      node.tooltip = operation.description;
    } else if (operation.summary) {
      node.tooltip = operation.summary;
    }

    /* Work out the object complexity */
    node.complexity = this.calculateComplexity(operation, components);

    return node;

  }

  private calculateComplexity(operation: OperationObject, components: ComponentsObject): number {
    console.log('Request');
    console.log(operation.requestBody);
    console.log(typeof operation.requestBody);
    console.log('Response');
    console.log(operation.responses[200]);
    console.log(typeof operation.responses[200]);

    /* Calculate the complexity of the request object */
    let totalComplexity = 0;
    if (operation.requestBody) {
      totalComplexity += this.calculateObjectComplexity(operation.requestBody, components);
    }


    if (operation.responses[200]) {
      /* A bit crude, but only care about "ok" responses. */
      totalComplexity += this.calculateObjectComplexity(operation.responses[200], components);
    }

    console.log('Complexity: %s', totalComplexity);
    return totalComplexity;
  }

  private calculateObjectComplexity(object: any, components: ComponentsObject): number {

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
        complexity += this.calculateObjectComplexity(object[key], components);
      });
    } else if (this.isMediaTypeObject(object)) {
      /* Keep recursing down to calculate the complexity */
      complexity += this.calculateObjectComplexity(object, components);
    } else if (this.isReferenceObject(object)) {
      console.log('Reference needs resolved: %s', object.$ref);
      const resolvedReference = this.resolveReference(object.$ref, components);
      console.log('Resolved Reference: ', resolvedReference);
      complexity += this.calculateObjectComplexity(resolvedReference, components);
    } else if (this.isSchemaObject(object)) {
      /* Quite a few fields in this we could consider, most of these will not be set */
      console.log('Schema object needs processed: %s', object);

      complexity += this.calculateObjectComplexity(object.items, components);
      complexity += this.calculateObjectComplexity(object.allOf, components);
      complexity += this.calculateObjectComplexity(object.anyOf, components);
      complexity += this.calculateObjectComplexity(object.oneOf, components);
      /* TODO: Check - if this is for excluding fields from a combined object
       * then it should make the score go down */
      complexity -= this.calculateObjectComplexity(object.not, components);

      if (object.properties) {
        /* Actual definition of fields in an object.
         * Keys here are the fields which can be in the object */
        complexity += Object.keys(object.properties).length;
      }

    } else {
      console.log('Did not process object: %s', object);
    }

    return complexity;
  }

  private resolveReference(name: string, components: ComponentsObject): any {

    const nameParts = name.split('/');

    /* only interested in parts 2 & 3 of the array */
    return components[nameParts[2]][nameParts[3]];
  }


  /**
   * Create a tree node for a component schema object with nested
   * structure below it for any child components referenced by properties
   * @param schema the schema object
   */
  public createComponentSchemaPropertiesToTreeNodes(schema: SchemaObject): TreeNode[] {
    const nodes: TreeNode[] = [];
    if (schema.type && schema.type === 'array') {
      const node = this.createSchemaPropertyToTreeNode(schema.title, schema.items);
      if (node) {
        const root: TreeNode = {
          label: schema.title,
          leaf: false,
          expanded: true,
          children: [node],
          data: schema
        };
        nodes.push(root);
      }
    }
    if (schema.properties) {
      Object.keys(schema.properties).forEach(title => {
        const node = this.createSchemaPropertyToTreeNode(title, schema.properties[title]);
        if (node) {
          nodes.push(node);
        }
      });
    }
    return nodes;
  }

  /**
   * Create a tree node for the property component schema object with nested
   * structure below it for any child components referenced by properties
   * @param schema the schema object
   */
  private createSchemaPropertyToTreeNode(title: string, property: SchemaObject): TreeNode {
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
          node.children = this.createComponentSchemaPropertiesToTreeNodes(property.items);
        } else {
          // console.log(`Unrecognised property: [${key}]`);
        }
    });
    return node;
  }

  /**
   * Helper method using type guards to determine if the supplied object is a RequestBodyObject. 
   * @param object the object to test
   */
  private isRequestBodyObject(object: object): object is RequestBodyObject {
    return (object as RequestBodyObject).content !== undefined;
  }

  private isReferenceObject(object: object): object is ReferenceObject {
    return (object as ReferenceObject).$ref !== undefined;
  }

  private isMediaTypeObject(object: object): object is MediaTypeObject {
    return (object as MediaTypeObject).schema !== undefined;
  }

  private isResponseObject(object: object): object is ResponseObject {
    return (object as ResponseObject).content !== undefined;
  }

  private isSchemaObject(object: object): object is SchemaObject {

    const schemaObject = (object as SchemaObject);

    return (schemaObject.properties !== undefined ||
      schemaObject.items !== undefined ||
      schemaObject.allOf !== undefined ||
      schemaObject.anyOf !== undefined ||
      schemaObject.oneOf !== undefined ||
      schemaObject.not !== undefined);
  }

}

export interface OperationTreeNode extends TreeNode {
  tooltip?: string;

  // Additional fields to supply details to Node Detail Rendering
  method?: string;
  path?: string;
  operation?: OperationObject,
  complexity?: number;
}
