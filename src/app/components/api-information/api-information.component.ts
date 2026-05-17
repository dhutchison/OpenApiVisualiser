import { Component, OnInit, inject } from '@angular/core';
import { FileReaderService } from '../../services/file-reader.service';
import { OpenAPIObject } from 'openapi3-ts/oas31';

@Component({
  standalone: false,
  selector: 'app-api-information',
  templateUrl: './api-information.component.html'
})
export class ApiInformationComponent implements OnInit {

  private fileReaderService = inject(FileReaderService);

  apiDefinitions: OpenAPIObject[] = [];

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

  ngOnInit() {
    this.fileReaderService.apiChanged.subscribe(value => {
      /* Add this specification to our current state */
      this.apiDefinitions.push(value);
    });

    this.fileReaderService.resetFiles.subscribe(v => {
      /* Clear any held state */
      this.apiDefinitions = [];
    });
  }

}
