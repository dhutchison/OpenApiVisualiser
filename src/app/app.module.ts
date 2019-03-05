import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import { TreeModule } from 'primeng/tree';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FileChooserComponent } from './file-chooser/file-chooser.component';

@NgModule({
  declarations: [
    AppComponent,
    FileChooserComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,

    BrowserAnimationsModule,

    TreeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
