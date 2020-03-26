import { Component, OnInit } from '@angular/core';
import { FileReaderService } from '../../services/file-reader.service';
import { TagObject } from '@loopback/openapi-v3-types';

@Component({
  selector: 'app-api-tags',
  templateUrl: './api-tags.component.html'
})
export class ApiTagsComponent implements OnInit {

  tags: TagObject[] = [];

  constructor(
    private fileReaderService: FileReaderService) { }

  ngOnInit() {
    this.fileReaderService.apiChanged.subscribe(value => {
      /* Add this specification to our current state */
      this.tags = value.tags;
    });

    this.fileReaderService.resetFiles.subscribe(v => {
      /* Clear any held state */
      this.tags = [];
    });
  }
}
