import { Component, OnInit } from '@angular/core';
import { FileReaderService } from '../services/file-reader.service';

@Component({
  selector: 'app-url-chooser',
  templateUrl: './url-chooser.component.html',
  styleUrls: ['./url-chooser.component.scss']
})
export class UrlChooserComponent implements OnInit {

  url: string;

  constructor(
    private fileReaderService: FileReaderService) { }

  ngOnInit() {
  }

  onSubmit() { 
    console.log(this.url);

    /* Reset back to having no files loaded */
    this.fileReaderService.resetFiles.next();

    /* Process the supplied URL */
    this.fileReaderService.loadFileFromURL(this.url);
  }

}
