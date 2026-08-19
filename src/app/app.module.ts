import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  imports: [
    AppComponent,
    BrowserModule,
    AppRoutingModule
  ],
  providers: [
    provideHttpClient(withXhr())
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
