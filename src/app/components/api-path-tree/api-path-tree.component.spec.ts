import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ApiOperationNode, ApiPathTreeNode } from '../../models/hierarchy.models';
import { FileReaderService } from '../../services/file-reader.service';
import { createLoadedDocument } from '../../models/loaded-document.models';

import { ApiPathTreeComponent } from './api-path-tree.component';
import { EndpointSwaggerComponent } from '../endpoint-swagger/endpoint-swagger.component';

import { PipesModule } from '../../pipes/pipes.module';


describe('ApiPathTreeComponent', () => {
  let component: ApiPathTreeComponent;
  let fixture: ComponentFixture<ApiPathTreeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ApiPathTreeComponent,
        EndpointSwaggerComponent,
        FormsModule,
        PipesModule
      ],
      providers: [
        provideHttpClient(withXhr()),
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

  it('migrates a loaded-document envelope into the existing path tree', async () => {
    const fileReaderService = TestBed.inject(FileReaderService);
    fileReaderService.apiChanged.next(createLoadedDocument({
      openapi: '3.1.0',
      info: {title: 'Pets', version: '1.0.0'},
      paths: {
        '/pets': {
          get: {
            summary: 'List pets',
            responses: {}
          }
        }
      }
    } as any));
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    expect(fixture.nativeElement.textContent).toContain('/pets');
  });

  it('renders the application-owned CDK tree contract', () => {
    const operationNode = {
      kind: 'operation',
      label: 'GET',
      leaf: true,
      children: [],
      tooltip: 'List pets',
      id: 'listPets',
      method: 'GET',
      path: '/pets',
      operation: {responses: {}},
      apiDefinition: {
        openapi: '3.1.0',
        info: {title: 'Pets', version: '1.0.0'},
        paths: {}
      },
      scopeId: 'assessment-scope:test',
      assessmentKey: 'assessment-scope:test:get:/pets',
      assessmentState: 'Pending'
    } as ApiOperationNode;
    const pathNode: ApiPathTreeNode = {
      kind: 'path',
      label: '/pets',
      leaf: false,
      expanded: true,
      children: [operationNode]
    };

    (component as any).apiPathNodesOrig = [pathNode];
    (component as any).setTreeNodes();
    fixture.componentRef.changeDetectorRef.detectChanges();

    expect(fixture.nativeElement.querySelector('cdk-tree')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.path-tree-node-content')).toHaveSize(2);
    expect(fixture.nativeElement.querySelector('#listPets-node')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-node-kind="operation"]')).toBeTruthy();
  });

  it('should render labelled radio segmented controls with decorative icons', () => {
    const options = fixture.nativeElement.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    const icons = fixture.nativeElement.querySelectorAll('[role="radiogroup"] svg') as NodeListOf<SVGElement>;
    const groups = fixture.nativeElement.querySelectorAll('[role="radiogroup"]') as NodeListOf<HTMLElement>;

    expect(options).toHaveSize(7);
    expect(groups).toHaveSize(3);
    expect(groups[0].getAttribute('aria-label')).toBe('View orientation');
    expect(groups[1].getAttribute('aria-label')).toBe('Path expansion');
    expect(groups[2].getAttribute('aria-label')).toBe('Path sorting');
    expect(options[0].checked).toBeTrue();
    expect(icons).toHaveSize(7);
    icons.forEach(icon => expect(icon.getAttribute('aria-hidden')).toBe('true'));
  });

  it('should allow view orientation to be set', () => {
    /* Check the default value */
    expect(component.horizontalView).toBeTruthy();

    /* Set the value and check it is still set */
    component.horizontalView = false;
    expect(component.horizontalView).toBeFalsy();


  });

  it('accepts view, compression, and sort control values', () => {
    component.setView('tree');
    expect(component.horizontalView).toBeTrue();
    component.setView('list');
    expect(component.horizontalView).toBeFalse();
    component.setView('unknown');
    expect(component.horizontalView).toBeFalse();

    component.setCompression('expanded');
    expect(component.joinNodesWithNoLeaves).toBeFalse();
    component.setCompression('compressed');
    expect(component.joinNodesWithNoLeaves).toBeTrue();
    component.setCompression('unknown');
    expect(component.joinNodesWithNoLeaves).toBeTrue();

    component.setSortOrder('default');
    expect(component.sortOrder).toBe('default');
    component.setSortOrder('asc');
    expect(component.sortOrder).toBe('asc');
    component.setSortOrder('desc');
    expect(component.sortOrder).toBe('desc');
    component.setSortOrder('unknown');
    expect(component.sortOrder).toBe('desc');
  });

  it('should open and close endpoint details in the application dialog', () => {
    const operationNode = {
      kind: 'operation',
      label: 'GET',
      leaf: true,
      expanded: false,
      children: [],
      method: 'GET',
      path: '/pets',
      operation: {responses: {}},
      apiDefinition: {
        openapi: '3.1.0',
        info: {title: 'Pets', version: '1.0.0'},
        paths: {}
      },
      scopeId: 'assessment-scope:test',
      assessmentKey: 'assessment-scope:test:get:/pets',
      assessmentState: 'Pending'
    } as ApiOperationNode;

    component.openEndpointDetail(operationNode);
    fixture.detectChanges(false);

    expect(component.endpointDialogVisible).toBeTrue();
    expect(component.selectedOperationNode).toBe(operationNode);

    component.openEndpointDetail();
    expect(component.endpointDialogVisible).toBeFalse();
    expect(component.selectedOperationNode).toBeUndefined();
  });

  it('should toggle path nodes', () => {
    const pathNode: ApiPathTreeNode = {
      kind: 'path',
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
      kind: 'operation',
      label: 'GET',
      leaf: true,
      expanded: false,
      children: [],
      tooltip: '',
      method: 'GET',
      path: '/pets',
      operation: {responses: {}},
      apiDefinition: {
        openapi: '3.1.0',
        info: {title: 'Pets', version: '1.0.0'},
        paths: {}
      },
      scopeId: 'assessment-scope:test',
      assessmentKey: 'assessment-scope:test:get:/pets',
      assessmentState: 'Pending'
    } as ApiOperationNode;
    const event = jasmine.createSpyObj<Event>('event', ['stopPropagation']);
    const scheduleMeasurementSpy = spyOn<any>(component, 'schedulePathTreeMeasurement');

    component.togglePathNode(operationNode, event);

    expect(operationNode.expanded).toBeFalse();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(scheduleMeasurementSpy).not.toHaveBeenCalled();
  });

  it('only opens endpoint details for operation nodes', () => {
    const pathNode = {
      kind: 'path',
      label: '/pets',
      leaf: false,
      children: []
    } as ApiPathTreeNode;

    component.endpointDialogVisible = true;
    component.selectedOperationNode = {} as ApiOperationNode;
    component.openEndpointDetail(pathNode);

    expect(component.endpointDialogVisible).toBeFalse();
    expect(component.selectedOperationNode).toBeUndefined();
  });

  it('clears endpoint state when files are reset', () => {
    const fileReaderService = TestBed.inject(FileReaderService);
    component.endpointDialogVisible = true;
    component.selectedOperationNode = {} as ApiOperationNode;

    fileReaderService.resetFiles.next();

    expect(component.endpointDialogVisible).toBeFalse();
    expect(component.selectedOperationNode).toBeUndefined();
  });

  it('expands only non-leaf nodes through the public expansion method', () => {
    const pathNode = {
      kind: 'path',
      label: '/pets',
      leaf: false,
      expanded: false,
      children: []
    } as ApiPathTreeNode;
    const operationNode = {
      kind: 'operation',
      label: 'GET',
      leaf: true,
      children: []
    } as unknown as ApiOperationNode;
    const scheduleMeasurementSpy = spyOn<any>(component, 'schedulePathTreeMeasurement');

    component.setNodeExpanded(pathNode, true);
    component.setNodeExpanded(operationNode, true);

    expect(pathNode.expanded).toBeTrue();
    expect(scheduleMeasurementSpy).toHaveBeenCalledTimes(1);
    expect(operationNode.expanded).toBeUndefined();
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
    const originalNodes: ApiPathTreeNode[] = [
      {
        kind: 'path',
        label: '/',
        leaf: false,
        expanded: true,
        children: [
          {
            kind: 'operation',
            label: 'GET',
            leaf: true,
            children: [],
            tooltip: '',
            apiDefinition,
            operation
          } as unknown as ApiOperationNode
        ]
      }
    ];

    const clonedNodes = (component as any).cloneTreeNodes(originalNodes) as ApiPathTreeNode[];
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
        kind: 'path',
        label: '/',
        leaf: false,
        children: [
          {
            kind: 'path',
            label: '/zebra',
            leaf: false,
            children: [
              {kind: 'operation', label: 'POST', leaf: true, children: []} as unknown as ApiOperationNode,
              {kind: 'operation', label: 'GET', leaf: true, children: []} as unknown as ApiOperationNode
            ]
          },
          {
            kind: 'path',
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
        kind: 'path',
        label: '/',
        leaf: false,
        children: [
          {
            kind: 'path',
            label: '/pets',
            leaf: false,
            children: [
              {
                kind: 'operation',
                label: 'GET',
                leaf: true,
                children: [],
                operation: {
                  tags: ['pets']
                }
              } as unknown as ApiOperationNode,
              {
                kind: 'operation',
                label: 'POST',
                leaf: true,
                children: [],
                operation: {
                  tags: ['admin']
                }
              } as unknown as ApiOperationNode
            ]
          },
          {
            kind: 'path',
            label: '/health',
            leaf: false,
            children: [
              {
                kind: 'operation',
                label: 'GET',
                leaf: true,
                children: [],
                operation: {}
              } as unknown as ApiOperationNode
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

  it('clears selected tag filters and restores the original tree', () => {
    const operation = {
      kind: 'operation',
      label: 'GET',
      leaf: true,
      children: [],
      operation: {tags: ['pets']}
    } as unknown as ApiOperationNode;
    (component as any).apiPathNodesOrig = [{
      kind: 'path',
      label: '/',
      leaf: false,
      children: [operation]
    }];
    component.selectedTagFilters = ['pets'];
    component.clearTagFilters();

    expect(component.selectedTagFilters).toEqual([]);
    expect(component.apiPathNodes[0].children).toHaveSize(1);
  });

  it('creates sorted tag options and includes untagged operations', () => {
    const options = (component as any).createTagFilterOptions([
      {
        kind: 'path',
        label: '/',
        leaf: false,
        children: [
          {kind: 'operation', label: 'GET', leaf: true, children: [], operation: {tags: ['zebra', 'alpha']}} as unknown as ApiOperationNode,
          {kind: 'operation', label: 'POST', leaf: true, children: [], operation: {}} as unknown as ApiOperationNode
        ]
      }
    ]);

    expect(options).toEqual([
      {label: 'alpha', value: 'alpha'},
      {label: 'zebra', value: 'zebra'},
      {label: 'Untagged', value: component.untaggedFilterValue}
    ]);
  });

  it('compresses paths with a single non-leaf child', () => {
    const nodes: ApiPathTreeNode[] = [{
      kind: 'path',
      label: '/',
      leaf: false,
      expanded: true,
      children: [{
        kind: 'path',
        label: '/pets',
        leaf: false,
        expanded: true,
        children: [{
          kind: 'operation',
          label: 'GET',
          leaf: true,
          children: []
        } as unknown as ApiOperationNode]
      }]
    }];

    const compressed = (component as any).cloneCompressedTreeNodes(nodes) as ApiPathTreeNode[];

    expect(compressed[0].label).toBe('/pets');
    expect(compressed[0].children?.map(node => node.label)).toEqual(['GET']);
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

  it('should include the open tag filter panel when measuring path tree min height', async () => {
    component.tagFilterOptions = [
      {label: 'audit', value: 'audit'}
    ];
    fixture.componentRef.changeDetectorRef.detectChanges();
    await fixture.whenStable();
    fixture.componentRef.changeDetectorRef.detectChanges();

    const layoutElement = fixture.nativeElement.querySelector('.api-path-tree-layout') as HTMLElement;
    const tagFilter = fixture.nativeElement.querySelector('.path-tree-tag-filter') as HTMLElement;
    const tagFilterPanel = fixture.nativeElement.querySelector('.path-tree-tag-filter__panel') as HTMLElement;

    tagFilter.setAttribute('open', '');
    Object.defineProperty(layoutElement, 'scrollHeight', {
      configurable: true,
      value: 100
    });
    spyOn(layoutElement, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 10, 0, 0));
    spyOn(tagFilterPanel, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 260, 0, 0));

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
