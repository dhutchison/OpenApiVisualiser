import { Component, OnInit } from '@angular/core';
import { OpenAPIObject } from '@loopback/openapi-v3-types';
import { FileReaderService } from '../../services/file-reader.service';

import { saveAs } from 'file-saver';
import * as jsyaml from 'js-yaml';

@Component({
  selector: 'app-export',
  templateUrl: './export.component.html'
})
export class ExportComponent implements OnInit {

  // TODO: A lot of comonality with this and the api-information component.
  display = false;

  apiDefinitions: OpenAPIObject[] = [];

  /* The export formats we support */
  readonly exportFormats = [
    {
      id: 1,
      description: 'OpenAPI 3.0 (YAML)'
    },
    {
      id: 2,
      description: 'OpenAPI 3.0 (JSON)'
    }
  ];

  /* The currently selected export format */
  private exportFormatId = 1;

  constructor(
    private fileReaderService: FileReaderService) { }


  get buttonEnabled() {
    return (this.apiDefinitions.length === 1);
  }

  get exportFormat(): number {
    return this.exportFormatId;
  }

  set exportFormat(value) {
    /* Need to force this to be a number */
    this.exportFormatId = +value;
  }

  ngOnInit() {
    this.fileReaderService.apiChanged.subscribe(value => {
      /* Add this specification to our current state */
      this.apiDefinitions.push(value);

      console.log(value);
    });

    this.fileReaderService.resetFiles.subscribe(v => {
      /* Clear any held state */
      this.apiDefinitions = [];
    });
  }

  showDialog() {
    /* Reset the export format */
    this.exportFormat = this.exportFormats[0].id;
    /* Show the dialog */
    this.display = true;
  }

  export() {
    console.log(this.exportFormat);
    const yaml = false;

    let fileContent;
    let fileName;
    let fileContentType;
    if (this.exportFormat === this.exportFormats[0].id) {
      console.log(this.exportFormats[0].description);
      fileContent = this.convertToOpenAPIYaml(this.apiDefinitions[0]);
      fileName = this.apiDefinitions[0].info.title + '.yaml';
      fileContentType = 'text/plain';
    } else if (this.exportFormat === this.exportFormats[1].id) {
      console.log(this.exportFormats[0].description);
      fileContent = this.convertToOpenAPIJson(this.apiDefinitions[0]);
      fileName = this.apiDefinitions[0].info.title + '.json';
      fileContentType = 'application/json';
    } else {
      console.warn('Unknown value: ' + this.exportFormat);
    }

    if (fileContent) {
      const file = new File([fileContent], fileName, {type: fileContentType});
      saveAs(file);
    }


    this.display = false;
  }

  private convertToOpenAPIYaml(spec: OpenAPIObject): string {

    return jsyaml.safeDump(spec);
  }

  private convertToOpenAPIJson(spec: OpenAPIObject): string {

    return JSON.stringify(spec, null, 2);
  }

}
