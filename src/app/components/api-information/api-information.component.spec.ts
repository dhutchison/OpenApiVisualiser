import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ApiInformationComponent } from './api-information.component';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PipesModule } from '../../pipes/pipes.module';
import { FileReaderService } from '../../services/file-reader.service';
import { createLoadedDocument } from '../../models/loaded-document.models';

describe('ApiInformationComponent', () => {
  let component: ApiInformationComponent;
  let fixture: ComponentFixture<ApiInformationComponent>;
  let fileReaderService: FileReaderService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ApiInformationComponent,
        PipesModule
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApiInformationComponent);
    component = fixture.componentInstance;
    fileReaderService = TestBed.inject(FileReaderService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the API panel and information groups with native semantics', async () => {
    fileReaderService.apiChanged.next(createLoadedDocument({
      openapi: '3.1.0',
      info: {
        title: 'Pets API',
        version: '1.0.0',
        termsOfService: 'https://example.test/terms',
        contact: {name: 'API team'},
        license: {name: 'MIT'}
      },
      paths: {},
      externalDocs: {url: 'https://example.test/docs'}
    }));
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    expect(fixture.nativeElement.querySelector('section.app-panel h2')?.textContent).toContain('Pets API');
    expect(fixture.nativeElement.querySelectorAll('fieldset')).toHaveSize(4);
    expect(fixture.nativeElement.querySelectorAll('legend')[0].textContent).toContain('External Documentation');
    expect(fixture.nativeElement.querySelector('section.app-panel')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('fieldset.app-fieldset')).toHaveSize(4);
  });

  it('renders only non-empty reusable component summaries', async () => {
    fileReaderService.apiChanged.next(createLoadedDocument({
      openapi: '3.1.0',
      info: {title: 'Pets API', version: '1.0.0'},
      paths: {},
      components: {
        schemas: {
          Pet: {type: 'object'},
          Category: {type: 'object'},
          Order: {type: 'object'},
          User: {type: 'object'},
          Tag: {type: 'object'},
          ApiResponse: {type: 'object'}
        },
        requestBodies: {
          Pet: {content: {}},
          UserArray: {content: {}}
        },
        securitySchemes: {
          petstoreAuth: {type: 'apiKey', name: 'Authorization', in: 'header'},
          apiKey: {type: 'apiKey', name: 'X-API-Key', in: 'header'}
        }
      }
    }));
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    const cards = [...fixture.nativeElement.querySelectorAll('.metadata-grid.compact > div')]
      .map((card: HTMLElement) => ({
        label: card.querySelector('dt')?.textContent,
        count: card.querySelector('dd')?.textContent
      }));

    expect(cards).toEqual([
      {label: 'Schemas', count: '6'},
      {label: 'Request bodies', count: '2'},
      {label: 'Security schemes', count: '2'}
    ]);
  });

  it('calculates paths, operations, security, and server variables', () => {
    const api = {
      openapi: '3.1.0',
      info: {title: 'Pets API', version: '1.0.0'},
      paths: {
        'x-vendor-path': {},
        '/pets': {
          get: {},
          put: {},
          post: {},
          delete: {},
          options: {},
          head: {},
          patch: {},
          trace: {}
        }
      },
      security: [
        {},
        {apiKey: []},
        {oauth: ['read', 'write'], apiKey: ['scope']}
      ],
      servers: [{
        url: 'https://{region}.example.test',
        variables: {
          region: {default: 'eu-west-1', description: 'Deployment region'}
        }
      }]
    } as any;

    expect(component.getPathCount(api)).toBe(1);
    expect(component.getOperationCount(api)).toBe(8);
    expect(component.getSecurityRequirements(api.security)).toEqual([
      'No authentication required',
      'apiKey',
      'oauth (read, write), apiKey (scope)'
    ]);
    expect(component.getSecurityRequirements()).toEqual([]);
    expect(component.getServerVariables(api.servers[0])).toEqual([
      {name: 'region', defaultValue: 'eu-west-1', description: 'Deployment region'}
    ]);
    expect(component.getServerVariables({url: 'https://example.test'})).toEqual([]);
  });

  it('resets API definitions when files are reset', () => {
    fileReaderService.apiChanged.next(createLoadedDocument({
      openapi: '3.1.0',
      info: {title: 'Pets API', version: '1.0.0'},
      paths: {}
    }));

    fileReaderService.resetFiles.next();

    expect(component.apiDefinitions).toEqual([]);
  });
});
