import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MainComponent } from './main.component';
import { AccordionModule } from 'primeng/accordion';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FieldsetModule } from 'primeng/fieldset';
import { FormsModule } from '@angular/forms';
import { InputSwitchModule } from 'primeng/inputswitch';
import { PanelModule } from 'primeng/panel';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';
import { TreeTableModule } from 'primeng/treetable';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ApiComponentsDetailComponent } from '../api-components-detail/api-components-detail.component';
import { ApiInformationComponent } from '../api-information/api-information.component';
import { ApiPathTreeComponent } from '../api-path-tree/api-path-tree.component';
import { ApiTagsComponent } from '../api-tags/api-tags.component';
import { ExportComponent } from '../export/export.component';
import { ExternalDocsComponent } from '../external-docs/external-docs.component';
import { NodeMethodDetailComponent } from '../node-detail/node-method-detail/node-method-detail.component';
import { SchemaDetailComponent } from '../api-components-detail/schema-detail/schema-detail.component';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { FileChooserComponent } from '../file-chooser/file-chooser.component';
import { UrlChooserComponent } from '../url-chooser/url-chooser.component';
import { FileUploadModule } from 'primeng/fileupload';

describe('MainComponent', () => {
  let component: MainComponent;
  let fixture: ComponentFixture<MainComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        MainComponent,

        ApiComponentsDetailComponent,
        ApiInformationComponent,
        ApiPathTreeComponent,
        ApiTagsComponent,
        ExportComponent,
        ExternalDocsComponent,
        FileChooserComponent,
        NodeMethodDetailComponent,
        SchemaDetailComponent,
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
        InputSwitchModule,
        PanelModule,
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