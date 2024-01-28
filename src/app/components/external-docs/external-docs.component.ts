import { Component, Input } from '@angular/core';
import { ExternalDocumentationObject } from 'openapi3-ts/oas31';

@Component({
  selector: 'app-external-docs',
  templateUrl: './external-docs.component.html'
})
export class ExternalDocsComponent {

  @Input() document?: ExternalDocumentationObject;

}
