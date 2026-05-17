import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

import { MainComponent } from './main.component';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FieldsetModule } from 'primeng/fieldset';
import { FileUploadModule } from 'primeng/fileupload';
import { PanelModule } from 'primeng/panel';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
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

describe('MainComponent', () => {
  let component: MainComponent;
  let fixture: ComponentFixture<MainComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
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
        UrlChooserComponent
      ],
      imports: [
        PipesModule,

        AccordionModule,
        BrowserAnimationsModule,
        ButtonModule,
        DialogModule,
        FieldsetModule,
        FileUploadModule,
        FormsModule,
        PanelModule,
        SelectButtonModule,
        TooltipModule,
        TreeModule,
        TreeTableModule,

        HttpClientTestingModule,
        RouterTestingModule
      ]

    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
