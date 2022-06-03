import { Component, Input } from '@angular/core';

import { OperationObject } from '@loopback/openapi-v3-types';

@Component({
  selector: 'app-node-method-detail',
  templateUrl: './node-method-detail.component.html',
  styleUrls: ['./node-method-detail.component.scss']
})
export class NodeMethodDetailComponent {

    @Input() method: string;
    @Input() path;
    @Input() node: OperationObject;

}
