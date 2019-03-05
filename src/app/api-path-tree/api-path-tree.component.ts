import { Component, OnInit } from '@angular/core';
import { getPath, OpenApiSpec, OperationObject, PathItemObject, PathsObject } from '@loopback/openapi-v3-types';
import { TreeNode } from 'primeng/api';
import { FileReaderService } from '../services/file-reader.service';

@Component({
  selector: 'app-api-path-tree',
  templateUrl: './api-path-tree.component.html',
  styleUrls: ['./api-path-tree.component.scss']
})
export class ApiPathTreeComponent implements OnInit {

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
   * Object holding the OpenAPI specification
   */
  private openApiSpec: OpenApiSpec;

  /**
   * Object hoilding the tree nodes to display
   */
  apiPathNodes: TreeNode[] = [];

  constructor(private fileReaderService: FileReaderService) { }

  ngOnInit() {
    this.fileReaderService.apiChanged.subscribe(value => {
      this.apiSpec = value;
    });
  }

  get apiSpec(): OpenApiSpec {
    return this.openApiSpec;
  }

  set apiSpec(spec: OpenApiSpec) {
    this.openApiSpec = spec;

    this.apiPathNodes = [];

    if (this.openApiSpec !== undefined) {
      /* If there is a specification set, parse out the nodes */
      const rootNode = this.convertPathsToTree(this.openApiSpec.paths);
      this.apiPathNodes.push(rootNode);
    }
  }

  /**
   * Create a heirarchy of Tree Nodes based on the supplied path definitions from the OpenAPI specification.
   * @param paths the paths contained in the API specification.
   * @returns the root tree node
   */
  private convertPathsToTree(paths: PathsObject): TreeNode {

    /* Map of the absolute path to the node definition */
    const treeNodes = new Map<string, TreeNode>();

    /* Setup the initial root node */
    const rootNode: TreeNode = {
      label: '/',
      leaf: false,
      children: [],
      expanded: true
    };
    treeNodes.set(rootNode.label, rootNode);

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
          const parentNode = treeNodes.get(parentPath);
          console.log('Parent node: '.concat(parentPath));
          console.log(parentNode);

          /* Get the node definition if it already exists (for instance we are adding a HTTP method to an existng path definition) */
          let pathNode = treeNodes.get(pathSoFar);
          if (pathNode === undefined) {

            /* Did not already exist, create it */
            console.log('Creating node for path %s', pathSoFar);
            pathNode = this.createPathNode('/'.concat(value), getPath(paths, pathSoFar));
            treeNodes.set(pathSoFar, pathNode);

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

    console.log(rootNode);

    return rootNode;

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

    const node: TreeNode = {
      label: method,
      leaf: true
    };

    return node;

  }

}
