import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { OpenApiSpec, PathsObject, getPath, PathItemObject, OperationObject } from '@loopback/openapi-v3-types';
import { TreeNode } from 'primeng/api';

import * as jsyaml from 'js-yaml';
import { stringify } from '@angular/core/src/render3/util';

@Component({
  selector: 'app-file-chooser',
  templateUrl: './file-chooser.component.html',
  styleUrls: ['./file-chooser.component.scss']
})
export class FileChooserComponent implements OnInit {

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

  apiPathNodes: TreeNode[] = [];

  constructor() { }

  ngOnInit() {
  }

  loadFile(event) {
    console.log(event);
    const file = event.target.files[0];

    const data = this.loadFileData(file);

    data.subscribe(fileContent => {
      console.log(fileContent);

      const spec = this.convertToJSON(fileContent);

      console.log(spec.paths);
      console.log(Object.keys(spec.paths));

      this.convertPathsToTree(spec.paths);
    });
  }

  private loadFileData(file): Observable<string> {
    const pattern = /\.yaml/;

    if (!file.name.match(pattern)) {
      alert('You are trying to upload a non-YAML file. Please choose a YAML file.');
      return;
    }
    console.log(file);

    const reader = new FileReader();
    reader.readAsText(file);

    return Observable.create(observer => {
      reader.onloadend = () => {
        observer.next(reader.result);
        observer.complete();
      };
    });
  }

  private convertToJSON(yaml: string): OpenApiSpec {
    const obj = jsyaml.safeLoad(yaml);

    console.log(JSON.stringify(obj, null, 4));

    return obj;
  }

  private convertPathsToTree(paths: PathsObject): TreeNode {

    const pathKeys = Object.keys(paths);

    const treeNodes = new Map<string, TreeNode>();

    const rootNode: TreeNode = {
      label: '/',
      leaf: false,
      children: [],
      expanded: true
    };
    treeNodes.set(rootNode.label, rootNode);

    this.apiPathNodes = [];
    pathKeys.forEach(key => {
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
          if (pathNode !== undefined) {
            /* Already existed */
            console.log('Found existing node %s', pathSoFar);

          } else {
            /* Did not already exist, create it */
            console.log('Creating node for path %s', pathSoFar);
            pathNode = this.createTreeNode('/'.concat(value), getPath(paths, pathSoFar));
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

    this.apiPathNodes.push(rootNode);

    console.log(this.apiPathNodes);

    return;

  }

  private createTreeNode(path: string, definition: PathItemObject): TreeNode {

    const node: TreeNode = {
      label: path,
      leaf: false,
      expanded: true,
      children: []
    };

    return node;
  }

  private createHttpMethodNode(method: string, operation: OperationObject): TreeNode {

    const node: TreeNode = {
      label: method,
      leaf: true
    };

    return node;

  }

}
