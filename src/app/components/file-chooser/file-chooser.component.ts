import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { LucideFileUp } from '@lucide/angular';
import { FileReaderService } from '../../services/file-reader.service';

type FileSelectionEvent = {
  files?: File[];
  target?: { files?: Iterable<File> | ArrayLike<File> | null };
};

@Component({
  selector: 'app-file-chooser',
  imports: [
    LucideFileUp
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './file-chooser.component.html',
  styleUrls: ['./file-chooser.component.scss']
})
export class FileChooserComponent {

  private readonly fileReaderService = inject(FileReaderService);

  readonly yamlFilenamePattern = /\.ya?ml$/i;
  readonly jsonFilenamePattern = /\.json$/i;

  loadFile(event: Event | FileSelectionEvent) {

    const nativeInput = event.target instanceof HTMLInputElement ? event.target : undefined;

    /* Reset back to having no files loaded */
    this.fileReaderService.resetFiles.next();

    let fileArray: File[];
    const selectionEvent = event as FileSelectionEvent;
    if (selectionEvent.files) {
      /* Use the provided file array when called by a file-picker adapter. */
      fileArray = selectionEvent.files;
    } else {
      /* Assume event from a regular HTML file input
       * Note that a FileList isn't an array
      * so we need to make it one first */
      const target = event.target as HTMLInputElement | FileSelectionEvent['target'] | null | undefined;
      fileArray = Array.from(target?.files ?? []);
    }


    const supportedFiles = fileArray.filter(file => {
      if (!file.name.match(this.yamlFilenamePattern) &&
            !file.name.match(this.jsonFilenamePattern)) {
        alert(`You are trying to upload an unsupported file extension (${file.name}). Please choose either a .yaml, .yml, or .json file.`);
        return false;
      }

      return true;
    });

    /* Read the complete selection as one resource set. */
    this.fileReaderService.loadFiles(supportedFiles);

    /* Allow choosing the same file again after it has been processed. */
    if (nativeInput) {
      nativeInput.value = '';
    }

  }

}
