import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FileReaderService } from '../../services/file-reader.service';
import { OpenAPIObject, OperationObject, PathItemObject, TagObject } from 'openapi3-ts/oas31';
import { MarkdownifyPipe } from '../../pipes/markdownify.pipe';
import { ExternalDocsComponent } from '../external-docs/external-docs.component';

interface TagSummary {
  name: string;
  description?: string;
  externalDocs?: TagObject['externalDocs'];
  operationCount: number;
  operations: Array<{method: string; path: string; summary?: string; operationId?: string}>;
}

@Component({
  selector: 'app-api-tags',
  imports: [
    CommonModule,
    ExternalDocsComponent,
    MarkdownifyPipe
  ],
  templateUrl: './api-tags.component.html'
})
export class ApiTagsComponent implements OnInit {

  private readonly fileReaderService = inject(FileReaderService);

  tagSummaries: TagSummary[] = [];

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
      this.tagSummaries = this.createTagSummaries(value);
    });

    this.fileReaderService.resetFiles.subscribe(v => {
      /* Clear any held state */
      this.tagSummaries = [];
    });
  }

  private createTagSummaries(api: OpenAPIObject): TagSummary[] {
    const tagSummaries = new Map<string, TagSummary>();

    (api.tags ?? []).forEach(tag => {
      tagSummaries.set(tag.name, {
        name: tag.name,
        description: tag.description,
        externalDocs: tag.externalDocs,
        operationCount: 0,
        operations: []
      });
    });

    Object.entries(api.paths ?? {}).forEach(([path, pathItem]) => {
      this.httpMethods.forEach(method => {
        const operation = (pathItem as PathItemObject)?.[method] as OperationObject | undefined;

        if (!operation) {
          return;
        }

        const operationTags = operation.tags?.length ? operation.tags : ['Untagged'];

        operationTags.forEach(tagName => {
          if (!tagSummaries.has(tagName)) {
            tagSummaries.set(tagName, {
              name: tagName,
              operationCount: 0,
              operations: []
            });
          }

          const tagSummary = tagSummaries.get(tagName);
          tagSummary.operationCount += 1;
          tagSummary.operations.push({
            method: method.toUpperCase(),
            path,
            summary: operation.summary,
            operationId: operation.operationId
          });
        });
      });
    });

    return Array.from(tagSummaries.values());
  }
}
