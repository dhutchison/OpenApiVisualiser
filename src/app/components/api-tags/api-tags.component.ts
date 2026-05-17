import { Component, OnInit, inject } from '@angular/core';
import { FileReaderService } from '../../services/file-reader.service';
import { TagObject } from 'openapi3-ts/oas31';

@Component({
  standalone: false,
  selector: 'app-api-tags',
  templateUrl: './api-tags.component.html'
})
export class ApiTagsComponent implements OnInit {

  private fileReaderService = inject(FileReaderService);

  tags: TagObject[] = [];

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
