import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { OpenAPIObject } from 'openapi3-ts/oas31';

import { ApiComponentsDetailComponent } from './api-components-detail.component';
import { SchemaDetailComponent } from './schema-detail/schema-detail.component';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PipesModule } from '../../pipes/pipes.module';
import { FileReaderService } from '../../services/file-reader.service';
import { createLoadedDocument } from '../../models/loaded-document.models';

describe('ApiComponentsDetailComponent', () => {
  let component: ApiComponentsDetailComponent;
  let fixture: ComponentFixture<ApiComponentsDetailComponent>;
  let fileReaderService: FileReaderService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ApiComponentsDetailComponent,
        SchemaDetailComponent,
        PipesModule,
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApiComponentsDetailComponent);
    component = fixture.componentInstance;
    fileReaderService = TestBed.inject(FileReaderService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render schema and component section headers as buttons', async () => {
    const apiSpec: OpenAPIObject = {
      openapi: '3.1.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {},
      components: {
        schemas: {
          Pet: {
            type: 'object',
            properties: {
              id: {
                type: 'integer'
              }
            }
          }
        },
        responses: {
          PetResponse: {
            description: 'A response'
          }
        }
      }
    };

    fileReaderService.apiChanged.next(createLoadedDocument(apiSpec));
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    const headers = fixture.nativeElement.querySelectorAll('summary') as NodeListOf<HTMLElement>;

    expect(headers.length).toBe(2);
    expect(headers[0].textContent).toContain('Pet');
    expect(headers[1].textContent).toContain('Responses');
  });

  it('should toggle schema details open and closed', async () => {
    fileReaderService.apiChanged.next(createLoadedDocument({
      openapi: '3.1.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {},
      components: {
        schemas: {
          Pet: {
            type: 'object',
            properties: {}
          }
        }
      }
    }));
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    const schemaHeader = fixture.nativeElement.querySelector('summary') as HTMLElement;

    expect(fixture.debugElement.query(By.css('#components-schemas-panel-Pet'))).toBeNull();

    schemaHeader.click();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    expect(component.expandedSchemas).toEqual(['Pet']);
    expect(fixture.debugElement.query(By.css('#components-schemas-panel-Pet'))).not.toBeNull();

    schemaHeader.click();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    expect(component.expandedSchemas).toEqual([]);
    expect(fixture.debugElement.query(By.css('#components-schemas-panel-Pet'))).toBeNull();
  });

  it('renders every populated component section and its descriptions', async () => {
    fileReaderService.apiChanged.next(createLoadedDocument({
      openapi: '3.1.0',
      info: {title: 'Test API', version: '1.0.0'},
      paths: {},
      components: {
        responses: {Created: {description: 'Created response'}},
        parameters: {Limit: {name: 'limit', in: 'query'}},
        examples: {Pet: {summary: 'Example pet'}},
        requestBodies: {Pet: {description: 'Pet body', content: {}}},
        headers: {RateLimit: {description: 'Rate limit', schema: {type: 'integer'}}},
        securitySchemes: {apiKey: {type: 'apiKey', name: 'X-API-Key', in: 'header'}},
        links: {Pet: {description: 'Pet link', operationId: 'getPet'}},
        callbacks: {Pet: {'{$request.query.callbackUrl}': {}}}
      }
    }));
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    const summaries = fixture.nativeElement.querySelectorAll('summary') as NodeListOf<HTMLElement>;
    expect(summaries).toHaveSize(8);

    const requestBodySummary = [...summaries].find(summary => summary.textContent?.includes('Request bodies'));
    expect(requestBodySummary?.textContent).toContain('1');

    requestBodySummary?.click();
    fixture.detectChanges();

    const requestBodyPanel = fixture.nativeElement.querySelector('#components-section-panel-requestBodies');
    expect(requestBodyPanel?.textContent).toContain('Pet');
    expect(requestBodyPanel?.textContent).toContain('Pet body');

    const expectedSections = [
      {label: 'Responses', key: 'responses', name: 'Created', detail: 'Created response'},
      {label: 'Parameters', key: 'parameters', name: 'Limit', detail: 'limit in query'},
      {label: 'Examples', key: 'examples', name: 'Pet', detail: 'Example pet'},
      {label: 'Headers', key: 'headers', name: 'RateLimit', detail: 'Rate limit'},
      {label: 'Security schemes', key: 'securitySchemes', name: 'apiKey', detail: 'apiKey'},
      {label: 'Links', key: 'links', name: 'Pet', detail: 'Pet link'},
      {label: 'Callbacks', key: 'callbacks', name: 'Pet', detail: 'Defined component'}
    ];

    expectedSections.forEach(section => {
      const summary = [...fixture.nativeElement.querySelectorAll('summary')]
        .find(element => element.textContent?.includes(section.label)) as HTMLElement;
      summary.click();
      fixture.detectChanges();

      const panel = fixture.nativeElement.querySelector(`#components-section-panel-${section.key}`) as HTMLElement;
      expect(panel.textContent).toContain(section.name);
      expect(panel.textContent).toContain(section.detail);
    });
  });

  it('describes component values using the most specific available detail', () => {
    expect(component.describeComponent({$ref: '#/components/schemas/Pet'})).toBe('#/components/schemas/Pet');
    expect(component.describeComponent({description: 'Description', summary: 'Summary'})).toBe('Description');
    expect(component.describeComponent({summary: 'Summary'})).toBe('Summary');
    expect(component.describeComponent({type: 'string'})).toBe('string');
    expect(component.describeComponent({name: 'limit', in: 'query'})).toBe('limit in query');
    expect(component.describeComponent({})).toBe('Defined component');
  });

  it('identifies schema types, properties, references, and badges', () => {
    const reference = {$ref: '#/components/schemas/Pet'} as any;
    expect(component.getSchemaType(reference)).toBe('Reference');
    expect(component.getSchemaPropertyCount(reference)).toBe(0);
    expect(component.getSchemaBadges(reference)).toEqual([reference.$ref]);

    expect(component.getSchemaType({type: ['string', 'null']} as any)).toBe('string | null');
    expect(component.getSchemaType({type: 'array'} as any)).toBe('array');
    expect(component.getSchemaType({properties: {id: {type: 'integer'}}} as any)).toBe('object');
    expect(component.getSchemaType({allOf: []} as any)).toBe('Schema');
    expect(component.getSchemaType({allOf: [{type: 'string'}]} as any)).toBe('allOf');
    expect(component.getSchemaType({oneOf: [{type: 'string'}]} as any)).toBe('oneOf');
    expect(component.getSchemaType({anyOf: [{type: 'string'}]} as any)).toBe('anyOf');
    expect(component.getSchemaType({} as any)).toBe('Schema');

    expect(component.getSchemaBadges({
      required: ['id'],
      enum: ['cat'],
      deprecated: true,
      readOnly: true,
      writeOnly: true
    } as any)).toEqual(['1 required', '1 enum values', 'Deprecated', 'Read only', 'Write only']);
  });

  it('resets schemas and sections when files are reset', async () => {
    fileReaderService.apiChanged.next(createLoadedDocument({
      openapi: '3.1.0',
      info: {title: 'Test API', version: '1.0.0'},
      paths: {},
      components: {schemas: {Pet: {type: 'object'}}}
    }));
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    fileReaderService.resetFiles.next();

    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    expect(component.schemas).toEqual({});
    expect(component.apiSpec).toBeUndefined();
    expect(component.items).toEqual([]);
    expect(component.componentSections).toEqual([]);
    expect(component.expandedSchemas).toEqual([]);
    expect(component.expandedComponentSections).toEqual([]);
  });
});
