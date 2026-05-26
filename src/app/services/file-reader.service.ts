import { Injectable, inject } from '@angular/core';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { OpenAPIObject } from 'openapi3-ts/oas31';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import * as jsyaml from 'js-yaml';

@Injectable({
  providedIn: 'root'
})
export class FileReaderService {

  private readonly http = inject(HttpClient);

  /**
   * Subject used to notify that a new Api Specification has been read.
   */
  readonly apiChanged = new ReplaySubject<OpenAPIObject>(1);

  /**
   * Subject used to notify that all files have been closed and components
   * should reset any stored state.
   */
  readonly resetFiles = new Subject<void>();

  /**
   * Subject used to notify that a file could not be loaded.
   */
  readonly loadFailed = new Subject<string>();

  /**
   * Load the supplied file as a YAML OpenAPI specification
   * and notify subscribers to the "apiChanged" subject in this service.
   *
   * @param file the file to load as a YAML specification
   */
  loadFile(file: File) {

    const fileData = this.loadFileData(file);

    const yaml = (file.name.match(/\.yaml/) !== undefined);

    fileData.subscribe(fileContent => this.loadData(fileContent, yaml));
  }

  /**
   * Load the supplied URL as a YAML OpenAPI specification
   * and notify subscribers to the "apiChanged" subject in this service.
   *
   * @param url the url to load as a YAML specification
   */
  loadFileFromURL(url: string) {
    const fileData = this.http.get(url, {responseType: 'text'});

    const yaml = (url.match(/\.yaml/) !== null);
    fileData.subscribe({
      next: fileContent => this.loadData(fileContent, yaml),
      error: error => this.handleUrlLoadFailure(url, error)
    });
  }

  private handleUrlLoadFailure(url: string, error: HttpErrorResponse) {
    console.error(error);

    const status = error.status > 0 ? ` (${error.status} ${error.statusText})` : '';
    this.loadFailed.next(`Could not load the API definition from ${url}${status}.`);
  }

  /**
   * Load the supplied file content as a OpenAPI specification
   * and notify subscribers to the "apiChanged" subject in this service.
   *
   * @param fileContent the file contents to load
   * @param yaml boolean indicating if the file content is YAML (true) or not.
   *       If this is false then it will be assumed to be JSON.
   */
  private loadData(fileContent: string, yaml: boolean) {
    console.log(fileContent);

    let spec: OpenAPIObject;

    if (yaml === true) {
      spec = this.convertYamlToOpenApiSpec(fileContent);
    } else {
      spec = JSON.parse(fileContent);
    }

    console.log(spec.paths);
    console.log(Object.keys(spec.paths));

    /* Notify any subscribers of the updated spec */
    this.apiChanged.next(spec);
  }

  /**
   * Start loading the file data as text and return an observable
   * which will be notified when the file contents have been read.
   *
   * @param file the file to read from
   */
  private loadFileData(file: File): Observable<string> {

    const reader = new FileReader();
    reader.readAsText(file);

    return new Observable<string>(observer => {
      reader.onloadend = () => {
        observer.next(reader.result as string);
        observer.complete();
      };
    });
  }

  /**
   * Convert the supplied YAML api defintion into the OpenApiSpec object.
   *
   * @param yaml the YAML to convert
   */
  private convertYamlToOpenApiSpec(yaml: string): OpenAPIObject {
    const obj = jsyaml.load(yaml) as OpenAPIObject;

    console.log(JSON.stringify(obj, null, 4));

    return obj;
  }
}
