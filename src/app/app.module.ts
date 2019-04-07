import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FieldsetModule } from 'primeng/fieldset';
import { FileUploadModule } from 'primeng/fileupload';
import { InputSwitchModule } from 'primeng/inputswitch';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';
import { TreeTableModule } from 'primeng/treetable';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FileChooserComponent } from './components/input-source/file-chooser/file-chooser.component';
import { ApiPathTreeComponent } from './components/api-path-tree/api-path-tree.component';
import { NodeMethodDetailComponent } from './components/node-detail/node-method-detail/node-method-detail.component';
import { ApiInformationComponent } from './components/api-information/api-information.component';
import { UrlChooserComponent } from './components/input-source/url-chooser/url-chooser.component';
import { InputSourceComponent } from './components/input-source/input-source.component';
import { TreeOrientationEnumPipe } from './pipes/TreeOrientationEnumPipe';
import { ApiComponentsDetailComponent } from './components/api-components-detail/api-components-detail.component';
import { SchemaDetailComponent } from './components/api-components-detail/schema-detail/schema-detail.component';
import { ExportComponent } from './components/export/export.component';
import { ApiTagsComponent } from './components/api-tags/api-tags.component';
import { ExternalDocsComponent } from './components/external-docs/external-docs.component';
import { StringReplacePipe } from './pipes/stringreplacepipe.pipe';

@NgModule({
  declarations: [
    AppComponent,
    FileChooserComponent,
    ApiPathTreeComponent,
    NodeMethodDetailComponent,
    ApiInformationComponent,
    UrlChooserComponent,
    InputSourceComponent,
    TreeOrientationEnumPipe,
    ApiComponentsDetailComponent,
    SchemaDetailComponent,
    ExportComponent,
    ApiTagsComponent,
    ExternalDocsComponent,
    StringReplacePipe
  ],
  imports: [
    BrowserModule,
    HttpClientModule,

    AppRoutingModule,
    FormsModule,

    BrowserAnimationsModule,

    AccordionModule,
    ButtonModule,
    DialogModule,
    FieldsetModule,
    FileUploadModule,
    InputSwitchModule,
    PanelModule,
    TableModule,
    TabViewModule,
    TooltipModule,
    TreeModule,
    TreeTableModule
  ],
  exports: [
    TreeOrientationEnumPipe
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
