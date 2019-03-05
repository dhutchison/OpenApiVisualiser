import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { OpenApiSpec, PathsObject, getPath, PathItemObject, OperationObject } from '@loopback/openapi-v3-types';
import { TreeNode } from 'primeng/api';

import * as jsyaml from 'js-yaml';
import { stringify } from '@angular/core/src/render3/util';
import { FileReaderService } from '../services/file-reader.service';

@Component({
  selector: 'app-file-chooser',
  templateUrl: './file-chooser.component.html',
  styleUrls: ['./file-chooser.component.scss']
})
export class FileChooserComponent implements OnInit {

  constructor(private fileReaderService: FileReaderService) { }

  ngOnInit() {
  }

  loadFile(event) {
    console.log(event);
    const file = event.target.files[0];

    const pattern = /\.yaml/;

    if (!file.name.match(pattern)) {
      alert('You are trying to upload a non-YAML file. Please choose a YAML file.');
      return;
    }
    console.log(file);

    this.fileReaderService.loadFile(file);
  }

}
