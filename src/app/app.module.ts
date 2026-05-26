import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // NOSONAR - PrimeNG components still require Angular's legacy animation renderer.
import Aura from '@primeuix/themes/aura';

import { providePrimeNG } from 'primeng/config';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  imports: [
    AppComponent,
    BrowserModule,

    AppRoutingModule,
    BrowserAnimationsModule // NOSONAR - Keep until PrimeNG no longer depends on legacy animation triggers.
  ],
  providers: [
    provideHttpClient(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark-mode'
        }
      }
    })
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
