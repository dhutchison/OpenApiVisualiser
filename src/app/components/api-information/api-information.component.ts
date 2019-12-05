import { Component, OnInit } from '@angular/core';
import { FileReaderService } from '../../services/file-reader.service';
import { getPath, OpenAPIObject, PathsObject, OperationObject } from 'openapi3-ts';

@Component({
  selector: 'app-api-information',
  templateUrl: './api-information.component.html'
})
export class ApiInformationComponent implements OnInit {

  apiDefinitions: Api[] = [];

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

  constructor(
    private fileReaderService: FileReaderService) { }

  ngOnInit() {
    this.fileReaderService.apiChanged.subscribe(value => {
      /* Add this specification to our current state,
       * after calculating the statistics */
      const api: Api = {
        apiDefinition: value,
        statistics: this.getApiStatistics(value)
      };

      this.apiDefinitions.push(api);

      console.log(value);
    });

    this.fileReaderService.resetFiles.subscribe(v => {
      /* Clear any held state */
      this.apiDefinitions = [];
    });
  }

  private getApiStatistics(api: OpenAPIObject): ApiStatistics {

    /* Setup the base object */
    const apiStats: ApiStatistics = {
      pathCount: Object.keys(api.paths).length,
      methodCount: 0,
      methodsSplit: {
        get: 0,
        put: 0,
        post: 0,
        delete: 0,
        options: 0,
        head: 0,
        patch: 0,
        trace: 0
      }
    };

    /* Iterate through each path and method */
    Object.keys(api.paths).forEach(pathKey => {
      const pathObject = getPath(api.paths, pathKey);

      /* Iterate through the possible http methods, adding nodes as required */
      this.httpMethods.forEach(method => {
        if (pathObject[method]) {
          /* Definition exists for the http method */
          apiStats.methodsSplit[method]++;
          apiStats.methodCount++;
        }
      });
    });

    return apiStats;

  }

  private calculateComplexity(operation: OperationObject): number {
    //TODO: Implement;

    /* Calculate the complexity of the request object */
    // if (operation.requestBody instanceof ReferenceObject) {
      /* Need to resolve the object */
    // }
    // operation.requestBody;

    return 0;
  }

}

interface ApiStatistics {

  pathCount: number;
  methodCount: number;
  methodsSplit: {
    get: number;
    put: number;
    post: number;
    delete: number;
    options: number;
    head: number;
    patch: number;
    trace: number
  };

}

interface Api {
  apiDefinition: OpenAPIObject;
  statistics: ApiStatistics;
}
