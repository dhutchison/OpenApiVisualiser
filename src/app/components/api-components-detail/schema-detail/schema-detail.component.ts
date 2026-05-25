import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, inject } from '@angular/core';
import { OpenAPIObject, SchemaObject } from 'openapi3-ts/oas31';
import { TreeNode } from 'primeng/api';
import { TreeTableModule } from 'primeng/treetable';
import { OpenapiTreenodeConverterService } from '../../../services/openapi-treenode-converter.service';
import { MarkdownifyPipe } from '../../../pipes/markdownify.pipe';
import { StringReplacePipe } from '../../../pipes/stringreplacepipe.pipe';

@Component({
  selector: 'app-schema-detail',
  imports: [
    CommonModule,
    MarkdownifyPipe,
    StringReplacePipe,
    TreeTableModule
  ],
  templateUrl: './schema-detail.component.html',
  styleUrls: ['./schema-detail.component.scss']
})
export class SchemaDetailComponent implements OnChanges {

  private readonly treeNodeService = inject(OpenapiTreenodeConverterService);

  @Input() apiSpec?: OpenAPIObject
  @Input() schema?: SchemaObject;
  treeModel: TreeNode[] = [];

  /**
   * Lifecycle hook triggered when @Input() changes.
   * Utilised to redraw the schema change rendering if the element swaps out underneath
   *
   * @param changes value of the property change event
   */
  ngOnChanges() {
    this.treeModel = [];
    if (this.schema && this.apiSpec) {
      this.treeModel = this.treeNodeService.createComponentSchemaPropertiesToTreeNodes(
          this.schema, this.apiSpec
      );
    }
  }

}
