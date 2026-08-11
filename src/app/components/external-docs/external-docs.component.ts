
import { Component, Input } from '@angular/core';
import { ExternalDocumentationObject } from 'openapi3-ts/oas31';
import { MarkdownifyPipe } from '../../pipes/markdownify.pipe';

@Component({
  selector: 'app-external-docs',
  imports: [
    MarkdownifyPipe
],
  templateUrl: './external-docs.component.html'
})
export class ExternalDocsComponent {

  @Input() document?: ExternalDocumentationObject;

}
