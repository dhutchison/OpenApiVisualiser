import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ApiInformationComponent } from './api-information.component';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PipesModule } from '../../pipes/pipes.module';
import { FileReaderService } from '../../services/file-reader.service';

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
    fileReaderService.apiChanged.next({
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
    });
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    expect(fixture.nativeElement.querySelector('section.app-panel h2')?.textContent).toContain('Pets API');
    expect(fixture.nativeElement.querySelectorAll('fieldset').length).toBe(4);
    expect(fixture.nativeElement.querySelectorAll('legend')[0].textContent).toContain('External Documentation');
    expect(fixture.nativeElement.querySelector('p-panel')).toBeNull();
    expect(fixture.nativeElement.querySelector('p-fieldset')).toBeNull();
  });
});
