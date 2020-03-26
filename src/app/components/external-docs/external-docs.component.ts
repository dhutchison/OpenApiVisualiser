import { Component, OnInit, Input } from '@angular/core';
import { ExternalDocumentationObject } from '@loopback/openapi-v3-types';

@Component({
  selector: 'app-external-docs',
  templateUrl: './external-docs.component.html'
})
export class ExternalDocsComponent implements OnInit {

  @Input() document?: ExternalDocumentationObject;

  constructor() { }

  ngOnInit() {
  }

}
