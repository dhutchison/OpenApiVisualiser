import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SummaryComponent } from './summary.component';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiOperationNode, ApiPathNode } from '../../models/hierarchy.models';
import { OpenapiTreenodeConverterService } from '../../services/openapi-treenode-converter.service';

describe('SummaryComponent', () => {
  let component: SummaryComponent;
  let fixture: ComponentFixture<SummaryComponent>;
  let converterService: OpenapiTreenodeConverterService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        SummaryComponent
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SummaryComponent);
    component = fixture.componentInstance;
    converterService = TestBed.inject(OpenapiTreenodeConverterService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('flattens nested path nodes and counts operations by method', () => {
    const getNode = {kind: 'operation', label: 'GET', leaf: true, children: []} as any;
    const postNode = {kind: 'operation', label: 'POST', leaf: true, children: []} as any;
    const nested = {
      kind: 'path',
      label: '/pets',
      leaf: false,
      children: [getNode, {kind: 'path', label: '/{id}', leaf: false, children: [getNode, postNode]}]
    } as any;

    const flattened = component.flatten([nested]);

    expect(flattened).toEqual([getNode, getNode, postNode]);
    expect(component.flatten([])).toEqual([]);
  });

  it('should flatten API path nodes to operation nodes', () => {
    const operation: ApiOperationNode = {
      kind: 'operation',
      label: 'GET',
      leaf: true,
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
    };
    const path: ApiPathNode = {
      kind: 'path',
      label: '/pets',
      leaf: false,
      expanded: true,
      children: [operation]
    };

    expect(component.flatten([path])).toEqual([operation]);
  });

  it('aggregates repeated methods and renders the total', async () => {
    const getNode = {kind: 'operation', label: 'GET', leaf: true, children: []} as any;
    const postNode = {kind: 'operation', label: 'POST', leaf: true, children: []} as any;

    converterService.treeNodesChanged.next([{
      kind: 'path',
      label: '/',
      leaf: false,
      expanded: true,
      children: [getNode, getNode, postNode]
    } as any]);
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    const rows = [...fixture.nativeElement.querySelectorAll('#method-summary tbody tr')]
      .map((row: HTMLTableRowElement) => [row.querySelector('th')?.textContent?.trim(), row.querySelector('td')?.textContent?.trim()]);

    expect(component.methodSummary).toEqual(new Map([['GET', 2], ['POST', 1]]));
    expect(rows).toContain(['GET', '2']);
    expect(rows).toContain(['POST', '1']);
    expect(rows).toContain(['Total', '3']);

    converterService.treeNodesChanged.next([]);
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);
    expect(fixture.nativeElement.querySelector('#method-header-total + td')?.textContent?.trim()).toBe('0');
  });
});
