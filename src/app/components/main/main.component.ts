import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, inject } from '@angular/core';
import { FileReaderService } from '../../services/file-reader.service';
import { ActivatedRoute } from '@angular/router';
import { ApiComponentsDetailComponent } from '../api-components-detail/api-components-detail.component';
import { ApiInformationComponent } from '../api-information/api-information.component';
import { ApiPathTreeComponent } from '../api-path-tree/api-path-tree.component';
import { ApiTagsComponent } from '../api-tags/api-tags.component';
import { ExportComponent } from '../export/export.component';
import { FileChooserComponent } from '../file-chooser/file-chooser.component';
import { SummaryComponent } from '../summary/summary.component';
import { UrlChooserComponent } from '../url-chooser/url-chooser.component';

interface MainSection {
  id: string;
  headerId: string;
  title: string;
}

@Component({
  selector: 'app-main',
  imports: [
    ApiComponentsDetailComponent,
    ApiInformationComponent,
    ApiPathTreeComponent,
    ApiTagsComponent,
    CommonModule,
    ExportComponent,
    FileChooserComponent,
    SummaryComponent,
    UrlChooserComponent
  ],
  templateUrl: './main.component.html'
})
export class MainComponent implements AfterViewInit {

  private readonly route = inject(ActivatedRoute);
  private readonly fileReaderService = inject(FileReaderService);

  activePanels: string[] = [];
  readonly sections: MainSection[] = [
    {id: '0', headerId: 'api-information-tab', title: 'API Information'},
    {id: '1', headerId: 'summary-tab', title: 'Summary'},
    {id: '2', headerId: 'api-path-tab', title: 'API Paths'},
    {id: '3', headerId: 'tags-tab', title: 'Tags'},
    {id: '4', headerId: 'components-tab', title: 'Components'}
  ];

  ngAfterViewInit() {
    /* Only process query parameters after the child components have been initialized */
    this.route.queryParams.subscribe((params) => {
      console.log('Params: ');
      console.log(params);

      if (params.url) {
        /* URL supplied as a query parameter, load it */
        setTimeout(() => this.fileReaderService.loadFileFromURL(params.url));
      }
    });
  }

  toggleSection(sectionId: string) {
    const sectionIndex = this.activePanels.indexOf(sectionId);

    if (sectionIndex >= 0) {
      this.activePanels = this.activePanels.filter(panelId => panelId !== sectionId);
      return;
    }

    this.activePanels = [...this.activePanels, sectionId];
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.activePanels.includes(sectionId);
  }
}
