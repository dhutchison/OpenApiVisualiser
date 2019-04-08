import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { FieldsetModule } from 'primeng/fieldset';
import { InputSwitchModule } from 'primeng/inputswitch';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';
import { TreeTableModule } from 'primeng/treetable';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ApiPathTreeComponent } from './components/api-path-tree/api-path-tree.component';
import { NodeMethodDetailComponent } from './components/node-detail/node-method-detail/node-method-detail.component';
import { ApiInformationComponent } from './components/api-information/api-information.component';
import { ExportComponent } from './components/export/export.component';
import { ApiTagsComponent } from './components/api-tags/api-tags.component';
import { ExternalDocsComponent } from './components/external-docs/external-docs.component';
import { TreeOrientationPipe } from './pipes/tree-orientation.pipe';
import { InputSourceModule } from './components/input-source/input-source.module';
import { DialogModule } from 'primeng/dialog';
import { ApiComponentsDetailComponent } from './components/api-components-detail/api-components-detail.component';
import { SchemaDetailComponent } from './components/api-components-detail/schema-detail/schema-detail.component';
import { StringReplacePipe } from './pipes/stringreplacepipe.pipe';

@NgModule({
  declarations: [
    AppComponent,
    ApiPathTreeComponent,
    NodeMethodDetailComponent,
    ApiInformationComponent,
    ExportComponent,
    ApiTagsComponent,
    ExternalDocsComponent,
    TreeOrientationPipe,
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

    InputSourceModule,

    AppRoutingModule,
    FormsModule,

    BrowserAnimationsModule,

    AccordionModule,
    ButtonModule,
    DialogModule,
    FieldsetModule,
    InputSwitchModule,
    PanelModule,
    TableModule,
    TabViewModule,
    TooltipModule,
    TreeModule,
    TreeTableModule
  ],
  exports: [
    TreeOrientationPipe
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
