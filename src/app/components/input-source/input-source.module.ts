import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileChooserComponent } from './file-chooser/file-chooser.component';
import { InputSourceComponent } from './input-source.component';
import { UrlChooserComponent } from './url-chooser/url-chooser.component';
import { FileUploadModule } from 'primeng/fileupload';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    FileChooserComponent,
    InputSourceComponent,
    UrlChooserComponent
  ],
  imports: [
    CommonModule,
    FormsModule,

    DialogModule,
    FileUploadModule
  ],
  exports: [
    InputSourceComponent
  ]
})
export class InputSourceModule { }
