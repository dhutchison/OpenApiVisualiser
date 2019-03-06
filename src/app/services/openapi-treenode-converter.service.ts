import { Injectable } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { Subject } from 'rxjs';
import {
          getPath, OpenApiSpec, OperationObject,
          PathItemObject, PathsObject
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
    this.convertPathsToTree(openApiSpec.paths);


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
  private convertPathsToTree(paths: PathsObject) {

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
                  this.createHttpMethodNode(method.toUpperCase(), apiPath[method]));
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
  private createHttpMethodNode(method: string, operation: OperationObject): TreeNode {

    const node: OperationTreeNode = {
      label: method,
      leaf: true,
      type: 'operation',
      styleClass: 'ui-treenode-http-method'
    };

    /* Add a tooltip */
    if (operation.description) {
      node.tooltip = operation.description;
    } else if (operation.summary) {
      node.tooltip = operation.summary;
    }

    return node;

  }

}

export interface OperationTreeNode extends TreeNode {
  tooltip?: string;
}
