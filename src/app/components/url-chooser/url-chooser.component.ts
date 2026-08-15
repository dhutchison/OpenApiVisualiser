
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { LucideCheck, LucideCloudUpload, LucideX } from '@lucide/angular';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { FileReaderService } from '../../services/file-reader.service';

@Component({
  selector: 'app-url-chooser',
  imports: [
    DialogModule,
    FormsModule,
    LucideCheck,
    LucideCloudUpload,
    LucideX
],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './url-chooser.component.html'
})
export class UrlChooserComponent {

  private readonly fileReaderService = inject(FileReaderService);

  url: string;
  display = false;

  showDialog() {
    this.display = true;
  }

  import() {
    console.log(this.url);

    /* Reset back to having no files loaded */
    this.fileReaderService.resetFiles.next();

    /* Process the supplied URL */
    this.fileReaderService.loadFileFromURL(this.url);

    /* Hide the dialog and clear the url*/
    this.display = false;
    this.url = undefined;
  }

}
