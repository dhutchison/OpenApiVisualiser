import { Component, OnInit, Input } from '@angular/core';
import { TreeNode } from 'primeng/api';

@Component({
  selector: 'app-node-method-detail',
  templateUrl: './node-method-detail.component.html',
  styleUrls: ['./node-method-detail.component.scss']
})
export class NodeMethodDetailComponent implements OnInit {

    @Input() method: string;
    @Input() path;
    @Input() node: TreeNode;

    constructor() { }

    ngOnInit() {
    }

}
