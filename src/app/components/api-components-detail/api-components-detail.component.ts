import { Component, OnInit, inject } from '@angular/core';
import { SchemaObject, ReferenceObject, OpenAPIObject, ComponentsObject } from 'openapi3-ts/oas31';
import { FileReaderService } from '../../services/file-reader.service';

export class SchemaContainer {
  [schema: string]: SchemaObject | ReferenceObject;
}

interface ComponentSection {
  key: keyof ComponentsObject;
  label: string;
  items: string[];
}

@Component({
  standalone: false,
  selector: 'app-api-components-detail',
  templateUrl: './api-components-detail.component.html'
})
export class ApiComponentsDetailComponent implements OnInit {

  private fileReaderService = inject(FileReaderService);

  apiSpec?: OpenAPIObject;
  schemas?: SchemaContainer;
  items?: string[] = [];
  componentSections: ComponentSection[] = [];
  expandedSchemas: string[] = [];
  expandedComponentSections: Array<keyof ComponentsObject> = [];

  private readonly componentSectionLabels: Array<{key: keyof ComponentsObject; label: string}> = [
    {key: 'responses', label: 'Responses'},
    {key: 'parameters', label: 'Parameters'},
    {key: 'examples', label: 'Examples'},
    {key: 'requestBodies', label: 'Request bodies'},
    {key: 'headers', label: 'Headers'},
    {key: 'securitySchemes', label: 'Security schemes'},
    {key: 'links', label: 'Links'},
    {key: 'callbacks', label: 'Callbacks'}
  ];

  ngOnInit() {
    this.fileReaderService.apiChanged.subscribe(value => {
      /* Add this specification to our current state */
      this.apiSpec = value;
      this.schemas = value.components?.schemas ?? {};
      this.items = Object.keys(this.schemas);
      this.componentSections = this.createComponentSections(value.components);
      this.expandedSchemas = [];
      this.expandedComponentSections = [];
    });

    this.fileReaderService.resetFiles.subscribe(v => {
      /* Clear any held state */
      this.schemas = {};
      this.items = [];
      this.componentSections = [];
      this.expandedSchemas = [];
      this.expandedComponentSections = [];
    });
  }

  toggleSchema(schemaName: string) {
    this.expandedSchemas = this.toggleExpandedItem(this.expandedSchemas, schemaName);
  }

  isSchemaExpanded(schemaName: string): boolean {
    return this.expandedSchemas.includes(schemaName);
  }

  toggleComponentSection(sectionKey: keyof ComponentsObject) {
    this.expandedComponentSections = this.toggleExpandedItem(this.expandedComponentSections, sectionKey);
  }

  isComponentSectionExpanded(sectionKey: keyof ComponentsObject): boolean {
    return this.expandedComponentSections.includes(sectionKey);
  }

  isReference(schema: SchemaObject | ReferenceObject): schema is ReferenceObject {
    return '$ref' in schema;
  }

  getSchemaType(schema: SchemaObject | ReferenceObject): string {
    if (this.isReference(schema)) {
      return 'Reference';
    }

    if (Array.isArray(schema.type)) {
      return schema.type.join(' | ');
    }

    if (schema.type) {
      return schema.type;
    }

    if (schema.properties) {
      return 'object';
    }

    if (schema.allOf?.length) {
      return 'allOf';
    }

    if (schema.oneOf?.length) {
      return 'oneOf';
    }

    if (schema.anyOf?.length) {
      return 'anyOf';
    }

    return 'Schema';
  }

  getSchemaPropertyCount(schema: SchemaObject | ReferenceObject): number {
    return this.isReference(schema) ? 0 : Object.keys(schema.properties ?? {}).length;
  }

  getSchemaBadges(schema: SchemaObject | ReferenceObject): string[] {
    if (this.isReference(schema)) {
      return [schema.$ref];
    }

    const badges = [];

    if (schema.required?.length) {
      badges.push(`${schema.required.length} required`);
    }

    if (schema.enum?.length) {
      badges.push(`${schema.enum.length} enum values`);
    }

    if (schema.deprecated) {
      badges.push('Deprecated');
    }

    if (schema.readOnly) {
      badges.push('Read only');
    }

    if (schema.writeOnly) {
      badges.push('Write only');
    }

    return badges;
  }

  getComponentEntries(section: ComponentSection): Array<{name: string; value: unknown}> {
    const components = this.apiSpec?.components?.[section.key] ?? {};

    return section.items.map(name => ({
      name,
      value: components[name]
    }));
  }

  describeComponent(value: unknown): string {
    const component = value as {description?: string; summary?: string; type?: string; $ref?: string; name?: string; in?: string};

    if (component.$ref) {
      return component.$ref;
    }

    if (component.description) {
      return component.description;
    }

    if (component.summary) {
      return component.summary;
    }

    if (component.type) {
      return component.type;
    }

    if (component.name && component.in) {
      return `${component.name} in ${component.in}`;
    }

    return 'Defined component';
  }

  private createComponentSections(components?: ComponentsObject): ComponentSection[] {
    return this.componentSectionLabels
      .map(section => ({
        ...section,
        items: Object.keys(components?.[section.key] ?? {})
      }))
      .filter(section => section.items.length > 0);
  }

  private toggleExpandedItem<T>(items: T[], item: T): T[] {
    if (items.includes(item)) {
      return items.filter(existingItem => existingItem !== item);
    }

    return [...items, item];
  }

}
