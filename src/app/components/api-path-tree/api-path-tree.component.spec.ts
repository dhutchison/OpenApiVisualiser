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

  it('should sort nodes within their parent alphabetically', () => {
    (component as any).apiPathNodesOrig = [
      {
        label: '/',
        leaf: false,
        children: [
          {
            label: '/zebra',
            leaf: false,
            children: [
              {label: 'POST', leaf: true, type: 'operation'} as TreeNode,
              {label: 'GET', leaf: true, type: 'operation'} as TreeNode
            ]
          },
          {
            label: '/alpha',
            leaf: false,
            children: []
          }
        ]
      }
    ];
    component.joinNodesWithNoLeaves = false;

    component.sortOrder = 'asc';

    expect(component.apiPathNodes[0].children?.map(node => node.label)).toEqual(['/alpha', '/zebra']);
    expect(component.apiPathNodes[0].children?.[1].children?.map(node => node.label)).toEqual(['GET', 'POST']);

    component.sortOrder = 'desc';

    expect(component.apiPathNodes[0].children?.map(node => node.label)).toEqual(['/zebra', '/alpha']);
    expect(component.apiPathNodes[0].children?.[0].children?.map(node => node.label)).toEqual(['POST', 'GET']);
  });

  it('should filter operations by selected tags and prune empty branches', () => {
    (component as any).apiPathNodesOrig = [
      {
        label: '/',
        leaf: false,
        children: [
          {
            label: '/pets',
            leaf: false,
            children: [
              {
                label: 'GET',
                leaf: true,
                type: 'operation',
                operation: {
                  tags: ['pets']
                }
              } as TreeNode,
              {
                label: 'POST',
                leaf: true,
                type: 'operation',
                operation: {
                  tags: ['admin']
                }
              } as TreeNode
            ]
          },
          {
            label: '/health',
            leaf: false,
            children: [
              {
                label: 'GET',
                leaf: true,
                type: 'operation',
                operation: {}
              } as TreeNode
            ]
          }
        ]
      }
    ];
    component.joinNodesWithNoLeaves = false;
    component.tagFilterOptions = (component as any).createTagFilterOptions((component as any).apiPathNodesOrig);

    component.toggleTagFilter('pets');

    expect(component.apiPathNodes[0].children?.map(node => node.label)).toEqual(['/pets']);
    expect(component.apiPathNodes[0].children?.[0].children?.map(node => node.label)).toEqual(['GET']);

    component.toggleTagFilter(component.untaggedFilterValue);

    expect(component.apiPathNodes[0].children?.map(node => node.label)).toEqual(['/pets', '/health']);
  });

  it('should include sort and tag filter details in generated SVG metadata', () => {
    component.tagFilterOptions = [
      {label: 'pets', value: 'pets'},
      {label: 'Untagged', value: component.untaggedFilterValue}
    ];
    component.selectedTagFilters = ['pets', component.untaggedFilterValue];
    component.sortOrder = 'asc';

    const metadata = (component as any).createSvgMetadata();

    expect(metadata).toEqual(['Sort: A-Z', 'Tags: pets, Untagged']);
  });

  it('should clear the previous path tree min height before measuring', () => {
    const layoutElement = fixture.nativeElement.querySelector('.api-path-tree-layout') as HTMLElement;
    const removePropertySpy = spyOn(layoutElement.style, 'removeProperty').and.callThrough();

    component.pathTreeMinHeight = 500;

    (component as any).updatePathTreeMinHeight();

    expect(removePropertySpy).toHaveBeenCalledWith('min-height');
    expect(component.pathTreeMinHeight).not.toBe(500);
  });

  it('should include the open tag filter panel when measuring path tree min height', () => {
    component.tagFilterOptions = [
      {label: 'audit', value: 'audit'}
    ];
    fixture.detectChanges();

    const layoutElement = fixture.nativeElement.querySelector('.api-path-tree-layout') as HTMLElement;
    const tagFilter = fixture.nativeElement.querySelector('.path-tree-tag-filter') as HTMLElement;
    const tagFilterPanel = fixture.nativeElement.querySelector('.path-tree-tag-filter__panel') as HTMLElement;

    tagFilter.setAttribute('open', '');
    Object.defineProperty(layoutElement, 'scrollHeight', {
      configurable: true,
      value: 100
    });
    spyOn(layoutElement, 'getBoundingClientRect').and.returnValue({
      top: 10
    } as DOMRect);
    spyOn(tagFilterPanel, 'getBoundingClientRect').and.returnValue({
      bottom: 260
    } as DOMRect);

    (component as any).updatePathTreeMinHeight();

    expect(component.pathTreeMinHeight).toBe(250);
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
