import { Component, OnInit, Input } from '@angular/core';
import { SchemaObject } from 'openapi3-ts';

@Component({
  selector: 'app-schema-detail',
  templateUrl: './schema-detail.component.html',
  styleUrls: ['./schema-detail.component.scss']
})
export class SchemaDetailComponent implements OnInit {

  @Input() schema?: SchemaObject;

  constructor() { }

  ngOnInit() {
  }

}
