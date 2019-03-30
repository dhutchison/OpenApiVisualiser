import { Component, OnInit, Input } from '@angular/core';
import { ExternalDocumentationObject } from 'openapi3-ts';

@Component({
  selector: 'app-external-docs',
  templateUrl: './external-docs.component.html',
  styleUrls: ['./external-docs.component.scss']
})
export class ExternalDocsComponent implements OnInit {

  @Input() document?: ExternalDocumentationObject;

  constructor() { }

  ngOnInit() {
  }

}
