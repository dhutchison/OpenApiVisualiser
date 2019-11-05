import { Component, OnInit } from '@angular/core';
import { SchemaObject, ReferenceObject } from 'openapi3-ts';
import { FileReaderService } from 'src/app/services/file-reader.service';

export class SchemaContainer {
  [schema: string]: SchemaObject | ReferenceObject;
}

@Component({
  selector: 'app-api-components-detail',
  templateUrl: './api-components-detail.component.html'
})
export class ApiComponentsDetailComponent implements OnInit {

  schemas?: SchemaContainer;
  items?: string[] = [];

  constructor(
    private fileReaderService: FileReaderService) { }

  ngOnInit() {
    this.fileReaderService.apiChanged.subscribe(value => {
      /* Add this specification to our current state */
      if (value.components) {
        Object.keys(value.components.schemas).forEach(key => {
          // Retaining a sorted list of the items for the time being so that can
          // display in the same order as defined in the specification file
          this.items.push(key);
          this.schemas = value.components.schemas;
        });
      }
    });

    this.fileReaderService.resetFiles.subscribe(v => {
      /* Clear any held state */
      this.schemas = {};
      this.items = [];
    });
  }

}
