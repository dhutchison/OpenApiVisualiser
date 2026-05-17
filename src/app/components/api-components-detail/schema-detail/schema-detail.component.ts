import { Component, Input, SimpleChanges, OnChanges, inject } from '@angular/core';
import { OpenAPIObject, SchemaObject } from 'openapi3-ts/oas31';
import { TreeNode } from 'primeng/api';
import { OpenapiTreenodeConverterService } from '../../../services/openapi-treenode-converter.service';

@Component({
  standalone: false,
  selector: 'app-schema-detail',
  templateUrl: './schema-detail.component.html',
  styleUrls: ['./schema-detail.component.scss']
})
export class SchemaDetailComponent implements OnChanges {

  private treeNodeService = inject(OpenapiTreenodeConverterService);

  @Input() apiSpec?: OpenAPIObject
  @Input() schema?: SchemaObject;
  treeModel: TreeNode[] = [];

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
