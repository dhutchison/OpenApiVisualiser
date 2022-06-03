import { Component } from '@angular/core';
import { FileReaderService } from '../../services/file-reader.service';

@Component({
  selector: 'app-file-chooser',
  templateUrl: './file-chooser.component.html'
})
export class FileChooserComponent {

  readonly yamlFilenamePattern = /\.y(a)?ml/;
  readonly jsonFilenamePattern = /\.json/;

  constructor(
    private fileReaderService: FileReaderService) { }

  loadFile(
    event: { files?: File[]; target?: { files: Iterable<File> | ArrayLike<File> } },
    fileUploadComponent?: { clear: () => void }) {

    console.log(event);

    /* Reset back to having no files loaded */
    this.fileReaderService.resetFiles.next();

    let fileArray: File[];
    if (event.files) {
      /* Most likely coming from a PrimeNG Upload component - just use this array */
      fileArray = event.files;
    } else {
      /* Assume event from a regular HTML file input
       * Note that a FileList isn't an array
      * so we need to make it one first */
      fileArray = Array.from(event.target.files);
    }


    /* Process all the selected files. */
    fileArray.forEach(file => {
      if (!file.name.match(this.yamlFilenamePattern) &&
            !file.name.match(this.jsonFilenamePattern)) {
        alert(`You are trying to upload an unsupported file extension (${file.name}). ' +
          'Please choose either a '.yaml', '.yml', or '.json' file.`);
        return;
      }
      console.log(file);

      this.fileReaderService.loadFile(file);
    });

    if (fileUploadComponent) {
      /* Clear the selection */
      console.log(fileUploadComponent);
      fileUploadComponent.clear();
    }

  }

}
