import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { OpenAPIObject } from 'openapi3-ts/oas31';

import { ApiComponentsDetailComponent } from './api-components-detail.component';
import { SchemaDetailComponent } from './schema-detail/schema-detail.component';
import { TreeTableModule } from 'primeng/treetable';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PipesModule } from '../../pipes/pipes.module';
import { FileReaderService } from '../../services/file-reader.service';

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
        TreeTableModule
      ],
      providers: [
        provideHttpClient(),
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

  it('should render schema and component section headers as buttons', () => {
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

    fileReaderService.apiChanged.next(apiSpec);
    fixture.detectChanges();

    const headers = fixture.debugElement.queryAll(By.css('.p-accordionheader'));

    expect(headers.length).toBe(2);
    expect(headers[0].nativeElement.textContent).toContain('Pet');
    expect(headers[1].nativeElement.textContent).toContain('Responses');
  });

  it('should toggle schema details open and closed', () => {
    fileReaderService.apiChanged.next({
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
    });
    fixture.detectChanges();

    const schemaHeader = fixture.debugElement.query(By.css('.p-accordionheader'));

    expect(fixture.debugElement.query(By.css('#components-schemas-panel-Pet'))).toBeNull();

    schemaHeader.nativeElement.click();
    fixture.detectChanges();

    expect(component.expandedSchemas).toEqual(['Pet']);
    expect(fixture.debugElement.query(By.css('#components-schemas-panel-Pet'))).not.toBeNull();

    schemaHeader.nativeElement.click();
    fixture.detectChanges();

    expect(component.expandedSchemas).toEqual([]);
    expect(fixture.debugElement.query(By.css('#components-schemas-panel-Pet'))).toBeNull();
  });
});
