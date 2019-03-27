import { Component, OnInit } from '@angular/core';
import { FileReaderService } from '../../services/file-reader.service';

@Component({
  selector: 'app-file-chooser',
  templateUrl: './file-chooser.component.html',
  styleUrls: ['./file-chooser.component.scss']
})
export class FileChooserComponent implements OnInit {

  readonly yamlFilenamePattern = /\.yaml/;

  constructor(
    private fileReaderService: FileReaderService) { }

  ngOnInit() {
  }

  loadFile(event) {
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
      if (!file.name.match(this.yamlFilenamePattern)) {
        // TODO: Update message to include offending file
        alert(`You are trying to upload a non-YAML file (${file.name}). Please choose a YAML file.`);
        return;
      }
      console.log(file);

      this.fileReaderService.loadFile(file);
    });


  }

}
