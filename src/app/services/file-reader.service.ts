import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { OpenApiSpec } from '@loopback/openapi-v3-types';

import * as jsyaml from 'js-yaml';

@Injectable({
  providedIn: 'root'
})
export class FileReaderService {

  readonly apiChanged = new Subject<OpenApiSpec>();

  constructor() { }

  /**
   * Load the supplied file as a YAML OpenAPI specification
   * and notify subscribers to the "apiChanged" subject in this service.
   * @param file the file to load as a YAML specification
   */
  loadFile(file: File) {

    const fileData = this.loadFileData(file);
    fileData.subscribe(fileContent => {
      console.log(fileContent);

      const spec = this.convertYamlToOpenApiSpec(fileContent);

      console.log(spec.paths);
      console.log(Object.keys(spec.paths));

      /* Notify any subscribers of the updated spec */
      this.apiChanged.next(spec);
    });

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

    return Observable.create(observer => {
      reader.onloadend = () => {
        observer.next(reader.result);
        observer.complete();
      };
    });
  }

  /**
   * Convert the supplied YAML api defintion into the OpenApiSpec object.
   * @param yaml the YAML to convert
   */
  private convertYamlToOpenApiSpec(yaml: string): OpenApiSpec {
    const obj = jsyaml.safeLoad(yaml);

    console.log(JSON.stringify(obj, null, 4));

    return obj;
  }
}
