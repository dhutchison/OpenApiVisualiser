import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { FieldsetModule } from 'primeng/fieldset';
import { PanelModule } from 'primeng/panel';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FileChooserComponent } from './file-chooser/file-chooser.component';
import { ApiPathTreeComponent } from './api-path-tree/api-path-tree.component';
import { NodeMethodDetailComponent } from './node-method-detail/node-method-detail.component';
import { ApiInformationComponent } from './api-information/api-information.component';
import { UrlChooserComponent } from './url-chooser/url-chooser.component';

@NgModule({
  declarations: [
    AppComponent,
    FileChooserComponent,
    ApiPathTreeComponent,
    NodeMethodDetailComponent,
    ApiInformationComponent,
    UrlChooserComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,

    AppRoutingModule,
    FormsModule,

    BrowserAnimationsModule,

    AccordionModule,
    ButtonModule,
    FieldsetModule,
    PanelModule,
    TooltipModule,
    TreeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
