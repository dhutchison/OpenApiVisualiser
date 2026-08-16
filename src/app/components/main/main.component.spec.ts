import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { MainComponent } from './main.component';

import { TreeModule } from 'primeng/tree';
import { TreeTableModule } from 'primeng/treetable';

import { ApiComponentsDetailComponent } from '../api-components-detail/api-components-detail.component';
import { ApiInformationComponent } from '../api-information/api-information.component';
import { ApiPathTreeComponent } from '../api-path-tree/api-path-tree.component';
import { ApiTagsComponent } from '../api-tags/api-tags.component';
import { ExportComponent } from '../export/export.component';
import { ExternalDocsComponent } from '../external-docs/external-docs.component';
import { SchemaDetailComponent } from '../api-components-detail/schema-detail/schema-detail.component';
import { FileChooserComponent } from '../file-chooser/file-chooser.component';
import { UrlChooserComponent } from '../url-chooser/url-chooser.component';
import { SummaryComponent } from '../summary/summary.component';
import { EndpointSwaggerComponent } from '../endpoint-swagger/endpoint-swagger.component';

import { PipesModule } from '../../pipes/pipes.module';
import { FileReaderService } from '../../services/file-reader.service';

describe('MainComponent', () => {
  let component: MainComponent;
  let fixture: ComponentFixture<MainComponent>;
  let fileReaderService: FileReaderService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        MainComponent,

        ApiComponentsDetailComponent,
        ApiInformationComponent,
        ApiPathTreeComponent,
        ApiTagsComponent,
        EndpointSwaggerComponent,
        ExportComponent,
        ExternalDocsComponent,
        FileChooserComponent,
        SchemaDetailComponent,
        SummaryComponent,
        UrlChooserComponent,
        PipesModule,

        FormsModule,
        TreeModule,
        TreeTableModule
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations()
      ]

    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MainComponent);
    component = fixture.componentInstance;
    fileReaderService = TestBed.inject(FileReaderService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render section headers as buttons', () => {
    const headers = fixture.nativeElement.querySelectorAll('summary') as NodeListOf<HTMLElement>;

    expect(headers.length).toBe(5);
    expect(headers[0].textContent).toContain('API Information');
  });

  it('should toggle sections open and closed', () => {
    const apiPathsHeader = fixture.debugElement.query(By.css('#api-path-tab'));
    const apiPathsDetails = () => fixture.nativeElement.querySelector('#api-path-tab').parentElement as HTMLDetailsElement;

    expect(apiPathsDetails().open).toBeFalse();

    apiPathsHeader.nativeElement.click();
    fixture.detectChanges();

    expect(component.activePanels).toEqual(['2']);
    expect(apiPathsDetails().open).toBeTrue();

    apiPathsHeader.nativeElement.click();
    fixture.detectChanges();

    expect(component.activePanels).toEqual([]);
    expect(apiPathsDetails().open).toBeFalse();
  });

  it('should show a dialog when a URL import fails', () => {
    const message = 'Could not load the API definition from http://localhost/missing.yaml (404 Not Found).';

    fileReaderService.loadFailed.next(message);
    fixture.detectChanges(false);

    expect(component.displayLoadFailureDialog).toBeTrue();
    expect(component.loadFailureMessage).toBe(message);
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.querySelector('h2')?.textContent).toContain('API definition could not be loaded');

    component.displayLoadFailureDialog = false;
    fixture.detectChanges(false);
    expect(component.displayLoadFailureDialog).toBeFalse();
  });
});
