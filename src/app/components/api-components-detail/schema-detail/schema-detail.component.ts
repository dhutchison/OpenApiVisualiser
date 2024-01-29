import { Component, Input, SimpleChanges, OnChanges } from '@angular/core';
import { OpenAPIObject, SchemaObject } from 'openapi3-ts/oas31';
import { TreeNode } from 'primeng/api';
import { OpenapiTreenodeConverterService } from '../../../services/openapi-treenode-converter.service';

@Component({
  selector: 'app-schema-detail',
  templateUrl: './schema-detail.component.html',
  styleUrls: ['./schema-detail.component.scss']
})
export class SchemaDetailComponent implements OnChanges {

  @Input() apiSpec?: OpenAPIObject
  @Input() schema?: SchemaObject;
  treeModel: TreeNode[] = [];

  constructor(private treeNodeService: OpenapiTreenodeConverterService) { }

  /**
   * Lifecycle hook triggered when @Input() changes.
   * Utilised to redraw the schema change rendering if the element swaps out underneath
   *
   * @param changes value of the property change event
   */
  ngOnChanges(changes: SimpleChanges) {
    this.treeModel = [];
    if (changes.schema.currentValue) {
      this.treeModel = this.treeNodeService.createComponentSchemaPropertiesToTreeNodes(
          changes.schema.currentValue, changes.apiSpec.currentValue
      );
    }
  }

}
