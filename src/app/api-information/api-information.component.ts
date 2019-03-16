import { Component, OnInit } from '@angular/core';
import { FileReaderService } from '../services/file-reader.service';
import { OpenAPIObject } from 'openapi3-ts';

@Component({
  selector: 'app-api-information',
  templateUrl: './api-information.component.html',
  styleUrls: ['./api-information.component.scss']
})
export class ApiInformationComponent implements OnInit {

  apiDefinitions: OpenAPIObject[] = [];

  constructor(
    private fileReaderService: FileReaderService) { }

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

}
