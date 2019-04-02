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
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ApiPathTreeComponent } from './components/api-path-tree/api-path-tree.component';
import { NodeMethodDetailComponent } from './components/node-detail/node-method-detail/node-method-detail.component';
import { ApiInformationComponent } from './components/api-information/api-information.component';
import { ApiTagsComponent } from './components/api-tags/api-tags.component';
import { ExternalDocsComponent } from './components/external-docs/external-docs.component';
import { TreeOrientationPipe } from './pipes/tree-orientation.pipe';
import { InputSourceModule } from './components/input-source/input-source.module';

@NgModule({
  declarations: [
    AppComponent,
    ApiPathTreeComponent,
    NodeMethodDetailComponent,
    ApiInformationComponent,
    ApiTagsComponent,
    ExternalDocsComponent,
    TreeOrientationPipe
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
    FieldsetModule,
    InputSwitchModule,
    PanelModule,
    TooltipModule,
    TreeModule
  ],
  exports: [
    TreeOrientationPipe
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
