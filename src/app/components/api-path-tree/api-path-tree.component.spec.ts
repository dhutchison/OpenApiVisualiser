import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TreeNode } from 'primeng/api';

import { ApiPathTreeComponent } from './api-path-tree.component';
import { EndpointSwaggerComponent } from '../endpoint-swagger/endpoint-swagger.component';

import { PipesModule } from '../../pipes/pipes.module';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FieldsetModule } from 'primeng/fieldset';
import { PanelModule } from 'primeng/panel';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';

describe('ApiPathTreeComponent', () => {
  let component: ApiPathTreeComponent;
  let fixture: ComponentFixture<ApiPathTreeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ApiPathTreeComponent,
        ButtonModule,
        DialogModule,
        EndpointSwaggerComponent,
        FieldsetModule,
        FormsModule,
        PanelModule,
        PipesModule,
        SelectButtonModule,
        TooltipModule,
        TreeModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApiPathTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should allow view orientation to be set', () => {
    /* Check the default value */
    expect(component.horizontalView).toBeTruthy();

    /* Set the value and check it is still set */
    component.horizontalView = false;
    expect(component.horizontalView).toBeFalsy();


  });

  it('should toggle path nodes', () => {
    const pathNode: TreeNode = {
      label: '/pets',
      leaf: false,
      expanded: true,
      children: []
    };
    const event = jasmine.createSpyObj<Event>('event', ['stopPropagation']);
    const scheduleMeasurementSpy = spyOn<any>(component, 'schedulePathTreeMeasurement');

    component.togglePathNode(pathNode, event);

    expect(pathNode.expanded).toBeFalse();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(scheduleMeasurementSpy).toHaveBeenCalled();
  });

  it('should not toggle operation leaf nodes', () => {
    const operationNode = {
      label: 'GET',
      leaf: true,
      expanded: false,
      type: 'operation'
    } as TreeNode;
    const event = jasmine.createSpyObj<Event>('event', ['stopPropagation']);
    const scheduleMeasurementSpy = spyOn<any>(component, 'schedulePathTreeMeasurement');

    component.togglePathNode(operationNode, event);

    expect(operationNode.expanded).toBeFalse();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(scheduleMeasurementSpy).not.toHaveBeenCalled();
  });

  it('should clone tree structure without duplicating operation payloads', () => {
    const apiDefinition = {
      openapi: '3.1.0',
      info: {
        title: 'Large API',
        version: '1.0.0'
      },
      paths: {}
    };
    const operation = {
      responses: {
        '200': {
          description: 'OK'
        }
      }
    };
    const originalNodes: TreeNode[] = [
      {
        label: '/',
        leaf: false,
        children: [
          {
            label: 'GET',
            leaf: true,
            type: 'operation',
            apiDefinition,
            operation
          } as TreeNode
        ]
      }
    ];

    const clonedNodes = (component as any).cloneTreeNodes(originalNodes) as TreeNode[];
    const clonedOperationNode = clonedNodes[0].children?.[0] as any;

    expect(clonedNodes).not.toBe(originalNodes);
    expect(clonedNodes[0]).not.toBe(originalNodes[0]);
    expect(clonedNodes[0].children).not.toBe(originalNodes[0].children);
    expect(clonedOperationNode.apiDefinition).toBe(apiDefinition);
    expect(clonedOperationNode.operation).toBe(operation);
  });

  it('should export a generated SVG blob', async () => {
    const saveAsSpy = jasmine.createSpy('saveAs');
    const createImageBlobSpy = spyOn<any>(component, 'createImageBlob').and.resolveTo(new Blob(['<svg></svg>'], {
      type: 'image/svg+xml'
    }));

    (globalThis as any).saveAs = saveAsSpy;

    await component.downloadImage();

    expect(createImageBlobSpy).toHaveBeenCalled();
    expect(saveAsSpy).toHaveBeenCalledWith(jasmine.any(Blob), 'API.svg');
  });

});
