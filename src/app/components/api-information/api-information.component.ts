import { Component, OnInit, inject } from '@angular/core';
import { FileReaderService } from '../../services/file-reader.service';
import { OpenAPIObject, ServerObject, SecurityRequirementObject } from 'openapi3-ts/oas31';

interface ComponentSummary {
  label: string;
  count: number;
}

@Component({
  standalone: false,
  selector: 'app-api-information',
  templateUrl: './api-information.component.html'
})
export class ApiInformationComponent implements OnInit {

  private readonly fileReaderService = inject(FileReaderService);

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

  getPathCount(api: OpenAPIObject): number {
    return Object.keys(api.paths ?? {}).filter(path => !path.startsWith('x-')).length;
  }

  getOperationCount(api: OpenAPIObject): number {
    return Object.values(api.paths ?? {}).reduce((total, pathItem) => {
      return total + this.httpMethods.filter(method => pathItem?.[method]).length;
    }, 0);
  }

  getComponentSummaries(api: OpenAPIObject): ComponentSummary[] {
    const componentLabels = [
      {key: 'schemas', label: 'Schemas'},
      {key: 'responses', label: 'Responses'},
      {key: 'parameters', label: 'Parameters'},
      {key: 'examples', label: 'Examples'},
      {key: 'requestBodies', label: 'Request bodies'},
      {key: 'headers', label: 'Headers'},
      {key: 'securitySchemes', label: 'Security schemes'},
      {key: 'links', label: 'Links'},
      {key: 'callbacks', label: 'Callbacks'},
      {key: 'pathItems', label: 'Path items'}
    ];

    return componentLabels
      .map(component => ({
        label: component.label,
        count: Object.keys(api.components?.[component.key] ?? {}).length
      }))
      .filter(component => component.count > 0);
  }

  getSecurityRequirements(securityRequirements?: SecurityRequirementObject[]): string[] {
    return (securityRequirements ?? []).map(requirement => {
      const schemes = Object.keys(requirement);

      if (schemes.length === 0) {
        return 'No authentication required';
      }

      return schemes
        .map(scheme => {
          const scopes = requirement[scheme];
          return scopes.length > 0 ? `${scheme} (${scopes.join(', ')})` : scheme;
        })
        .join(', ');
    });
  }

  getServerVariables(server: ServerObject): Array<{name: string; defaultValue: string | boolean | number; description?: string}> {
    return Object.entries(server.variables ?? {}).map(([name, variable]) => ({
      name,
      defaultValue: variable.default,
      description: variable.description
    }));
  }

}
