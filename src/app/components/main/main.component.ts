import { Component, AfterViewInit, inject } from '@angular/core';
import { FileReaderService } from '../../services/file-reader.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  standalone: false,
  selector: 'app-main',
  templateUrl: './main.component.html'
})
export class MainComponent implements AfterViewInit {

  private route = inject(ActivatedRoute);
  private fileReaderService = inject(FileReaderService);

  activePanels: string[] = [];

  ngAfterViewInit() {
    /* Only process query parameters after the child components have been initialized */
    this.route.queryParams.subscribe((params) => {
      console.log('Params: ');
      console.log(params);

      if (params.url) {
        /* URL supplied as a query parameter, load it */
        this.fileReaderService.loadFileFromURL(params.url);
      }
    });
  }

}
