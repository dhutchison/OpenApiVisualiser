import { Component, OnInit } from '@angular/core';
import { FileReaderService } from '../services/file-reader.service';
import { OpenapiTreenodeConverterService } from '../services/openapi-treenode-converter.service';

@Component({
  selector: 'app-file-chooser',
  templateUrl: './file-chooser.component.html',
  styleUrls: ['./file-chooser.component.scss']
})
export class FileChooserComponent implements OnInit {

  readonly yamlFilenamePattern = /\.yaml/;

  constructor(
    private fileReaderService: FileReaderService,
    private openApiConverterService: OpenapiTreenodeConverterService) { }

  ngOnInit() {
  }

  loadFile(event) {
    console.log(event);

    /* Reset back to having no files loaded */
    this.openApiConverterService.reset();

    /* Process all the selected files.
     * Note that a FileList isn't an array
     * so we need to make it one first */
    const files: FileList = event.target.files;
    Array.from(files).forEach(file => {


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
