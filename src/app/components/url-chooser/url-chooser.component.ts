import { Component, OnInit } from '@angular/core';
import { FileReaderService } from '../../services/file-reader.service';

@Component({
  selector: 'app-url-chooser',
  templateUrl: './url-chooser.component.html'
})
export class UrlChooserComponent implements OnInit {

  url: string;
  display = false;

  constructor(
    private fileReaderService: FileReaderService) { }

  ngOnInit() {
  }

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
