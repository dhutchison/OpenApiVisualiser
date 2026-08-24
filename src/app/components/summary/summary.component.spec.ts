import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SummaryComponent } from './summary.component';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiOperationNode, ApiPathNode } from '../../models/hierarchy.models';
import { OpenapiTreenodeConverterService } from '../../services/openapi-treenode-converter.service';
import { FileReaderService } from '../../services/file-reader.service';
import { ComplexityAssessmentService } from '../../services/complexity-assessment.service';
import { createLoadedDocument } from '../../models/loaded-document.models';
import { ComplexityAssessmentReport, OperationIdentity } from '../../complexity/complexity.models';

describe('SummaryComponent', () => {
  let component: SummaryComponent;
  let fixture: ComponentFixture<SummaryComponent>;
  let converterService: OpenapiTreenodeConverterService;
  let fileReaderService: FileReaderService;
  let assessmentService: ComplexityAssessmentService;

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
    fileReaderService = TestBed.inject(FileReaderService);
    assessmentService = TestBed.inject(ComplexityAssessmentService);
    fixture.detectChanges(false);
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

  it('keeps pending and available summaries independent for multiple scopes', () => {
    const petstore = createLoadedDocument({
      openapi: '3.1.0',
      info: {title: 'Petstore', version: '1.0.0'},
      paths: {}
    } as any, 'file:///petstore.yaml');
    const uspto = createLoadedDocument({
      openapi: '3.1.0',
      info: {title: 'USPTO', version: '1.0.0'},
      paths: {}
    } as any, 'file:///uspto.yaml');

    fileReaderService.apiChanged.next(petstore);
    fileReaderService.apiChanged.next(uspto);
    assessmentService.assessmentChanged.next({
      scopeId: petstore.scopeId,
      status: 'Available',
      report: createReport(petstore.scopeId, petstore.sourceId, [operation('/pets', 'get')])
    });
    fixture.componentRef.changeDetectorRef.markForCheck();

    expect(component.scopeSummaries.map(scope => [scope.title, scope.status])).toEqual([
      ['Petstore', 'Available'],
      ['USPTO', 'Pending']
    ]);
    fixture.detectChanges(false);
    expect(fixture.nativeElement.textContent).toContain('Petstore');
    expect(fixture.nativeElement.textContent).toContain('Assessing operation complexity…');
  });

  it('keeps incomplete operations out of hotspots and reports a separate needs-assessment group', () => {
    const document = createLoadedDocument({
      openapi: '3.1.0',
      info: {title: 'Incomplete API', version: '1.0.0'},
      paths: {}
    } as any, 'file:///incomplete.yaml');
    fileReaderService.apiChanged.next(document);
    assessmentService.assessmentChanged.next({
      scopeId: document.scopeId,
      status: 'Available',
      report: createReport(document.scopeId, document.sourceId, [], [operation('/broken', 'get')])
    });
    fixture.componentRef.changeDetectorRef.markForCheck();

    const summary = component.scopeSummaries[0];
    expect(summary.hotspots).toHaveSize(0);
    expect(summary.needsAssessment).toHaveSize(1);
    fixture.detectChanges(false);
    expect(fixture.nativeElement.textContent).toContain('Needs assessment');
    expect(fixture.nativeElement.textContent).toContain('GET /broken');
  });

  it('discloses a tie that crosses the ten-operation cutoff and can show all operations', () => {
    const document = createLoadedDocument({
      openapi: '3.1.0',
      info: {title: 'Large API', version: '1.0.0'},
      paths: {}
    } as any, 'file:///large.yaml');
    const operations = Array.from({length: 11}, (_, index) => operation(`/pets/${index}`, 'get'));
    fileReaderService.apiChanged.next(document);
    assessmentService.assessmentChanged.next({
      scopeId: document.scopeId,
      status: 'Available',
      report: createReport(document.scopeId, document.sourceId, operations)
    });
    fixture.componentRef.changeDetectorRef.markForCheck();

    const summary = component.scopeSummaries[0];
    expect(summary.visibleHotspots).toHaveSize(10);
    expect(summary.additionalTiedHotspots).toBe(1);
    fixture.detectChanges(false);
    expect(fixture.nativeElement.querySelector('.complexity-summary h2')?.textContent).toContain('Operation contract complexity');
    expect(fixture.nativeElement.querySelector('.complexity-distribution caption')?.textContent).toContain('Absolute final-band distribution');
    const showAllButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(showAllButton.textContent).toContain('Show all');
    expect(showAllButton.type).toBe('button');
    expect(showAllButton.getAttribute('aria-controls')).toContain('hotspot-list-');
    showAllButton.click();
    fixture.detectChanges(false);
    expect(fixture.nativeElement.querySelectorAll('[data-hotspot]').length).toBe(11);
    expect(fixture.nativeElement.textContent).toContain('1 additional operation shares hotspot tier 1');
  });

  it('renders the no-operations unavailable diagnostic while preserving the ordinary summary shell', () => {
    const document = createLoadedDocument({
      openapi: '3.1.0',
      info: {title: 'Unavailable API', version: '1.0.0'},
      paths: {}
    } as any, 'file:///unavailable.yaml');
    fileReaderService.apiChanged.next(document);
    assessmentService.assessmentChanged.next({
      scopeId: document.scopeId,
      status: 'Unavailable',
      report: createReport(document.scopeId, document.sourceId, [], [], 'Unavailable')
    });
    fixture.componentRef.changeDetectorRef.markForCheck();

    fixture.detectChanges(false);
    expect(fixture.nativeElement.textContent).toContain('Complexity assessment unavailable');
    expect(fixture.nativeElement.textContent).toContain('HTTP methods in use');
  });
});

function operation(path: string, method: string): OperationIdentity {
  return {
    key: `assessment-scope:test:${method}:${path}`,
    scopeId: 'assessment-scope:test',
    sourceId: 'file:///test/openapi.yaml',
    path,
    method,
    operationId: `${method}-${path.replaceAll('/', '-')}`
  };
}

function createReport(
  scopeId: string,
  sourceId: string,
  known: OperationIdentity[],
  incomplete: OperationIdentity[] = [],
  availability: 'Available' | 'Unavailable' = 'Available'
): ComplexityAssessmentReport {
  const assessments = [...known, ...incomplete].map(identity => ({
    identity: {...identity, scopeId, sourceId, key: `${scopeId}:${identity.method}:${identity.path}`},
    modelVersion: 'operation-contract-complexity/1.0.0',
    confidence: identity === incomplete[0] ? 'Incomplete' : 'Complete',
    dimensions: {},
    rawBand: identity === incomplete[0] ? 'Unknown' : 'High',
    documentationSupport: {level: 'None', coveredRoles: [], missingCoverage: [], reasons: []},
    finalBand: identity === incomplete[0] ? 'Unknown' : 'High',
    supportingDimensions: [],
    reasons: [],
    blockingFaults: [],
    warnings: []
  } as any));

  return {
    modelVersion: 'operation-contract-complexity/1.0.0',
    capabilityManifest: {} as any,
    availability,
    scopeId,
    sourceId,
    baseUri: sourceId,
    assessments,
    distribution: {
      Low: 0,
      Moderate: 0,
      High: known.length,
      'Very high': 0,
      Unknown: incomplete.length
    },
    coverage: {
      totalOperations: known.length + incomplete.length,
      knownOperations: known.length,
      incompleteOperations: incomplete.length
    },
    hotspots: known.map((identity, index) => ({
      identity: {...identity, scopeId, sourceId, key: `${scopeId}:${identity.method}:${identity.path}`},
      finalBand: 'High',
      rawBand: 'High',
      tier: index < 11 ? 1 : index + 1
    })) as any,
    needsAssessment: incomplete.map(identity => ({...identity, scopeId, sourceId, key: `${scopeId}:${identity.method}:${identity.path}`})),
    ...(availability === 'Unavailable' ? {failure: {code: 'assessment-failed', category: 'assessment', source: {sourceId, pointer: '/'}, values: {message: 'Unsupported document'}}} : {})
  };
}
