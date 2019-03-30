import { Component, OnInit } from '@angular/core';
import { FileReaderService } from 'src/app/services/file-reader.service';
import { TagObject } from 'openapi3-ts';

@Component({
  selector: 'app-api-tags',
  templateUrl: './api-tags.component.html',
  styleUrls: ['./api-tags.component.scss']
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
