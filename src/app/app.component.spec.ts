import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { AccordionModule } from 'primeng/accordion';
import { ApiInformationComponent } from './components/api-information/api-information.component';
import { ApiPathTreeComponent } from './components/api-path-tree/api-path-tree.component';
import { ApiTagsComponent } from './components/api-tags/api-tags.component';
import { PanelModule } from 'primeng/panel';
import { FieldsetModule } from 'primeng/fieldset';
import { InputSwitchModule } from 'primeng/inputswitch';
import { FormsModule } from '@angular/forms';
import { TreeModule } from 'primeng/tree';
import { TooltipModule } from 'primeng/tooltip';
import { TreeOrientationPipe } from './pipes/tree-orientation.pipe';
import { NodeMethodDetailComponent } from './components/node-detail/node-method-detail/node-method-detail.component';
import { ExternalDocsComponent } from './components/external-docs/external-docs.component';
import { InputSourceModule } from './components/input-source/input-source.module';
import { ButtonModule } from 'primeng/button';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ExportComponent } from './components/export/export.component';
import { DialogModule } from 'primeng/dialog';
import { ApiComponentsDetailComponent } from './components/api-components-detail/api-components-detail.component';
import { SchemaDetailComponent } from './components/api-components-detail/schema-detail/schema-detail.component';
import { TreeTableModule } from 'primeng/treetable';
import { StringReplacePipe } from './pipes/stringreplacepipe.pipe';
import { MainComponent } from './components/main/main.component';

describe('AppComponent', () => {

  beforeEach(async(() => {

    TestBed.configureTestingModule({
      imports: [
        InputSourceModule,

        AccordionModule,
        BrowserAnimationsModule,
        ButtonModule,
        DialogModule,
        FieldsetModule,
        FormsModule,
        InputSwitchModule,
        PanelModule,
        TooltipModule,
        TreeModule,
        TreeTableModule,

        HttpClientTestingModule,
        RouterTestingModule
      ],
      declarations: [
        AppComponent,

        ApiComponentsDetailComponent,
        ApiInformationComponent,
        ApiPathTreeComponent,
        ApiTagsComponent,
        ExportComponent,
        ExternalDocsComponent,
        MainComponent,
        NodeMethodDetailComponent,
        SchemaDetailComponent,
        StringReplacePipe,
        TreeOrientationPipe
      ]
    }).compileComponents();
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'OpenAPIVisualiser'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('OpenAPIVisualiser');
  });

  it('should render title in a h1 tag', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('h1').textContent).toContain('Welcome to OpenAPIVisualiser!');
  });
});
