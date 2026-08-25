import { TestBed } from '@angular/core/testing';
import { createLoadedDocument } from '../models/loaded-document.models';
import {
  AssessmentWorker,
  ComplexityAssessmentService,
  COMPLEXITY_WORKER_FACTORY
} from './complexity-assessment.service';
import { ComplexityAssessmentReport } from '../complexity/complexity.models';

describe('ComplexityAssessmentService', () => {
  let service: ComplexityAssessmentService;
  let worker: AssessmentWorker | undefined;

  beforeEach(() => {
    worker = undefined;
    TestBed.configureTestingModule({
      providers: [
        {provide: COMPLEXITY_WORKER_FACTORY, useFactory: () => () => worker}
      ]
    });
    service = TestBed.inject(ComplexityAssessmentService);
  });

  it('publishes pending and available states through the asynchronous fallback', async () => {
    const states: string[] = [];
    service.assessmentChanged.subscribe(state => states.push(state.status));

    service.assess(createLoadedDocument({
      openapi: '3.1.0',
      info: {title: 'Health', version: '1.0.0'},
      paths: {'/health': {get: {responses: {'204': {description: 'Healthy'}}}}}
    } as any));
    await waitForAsyncCompletion();

    expect(states).toEqual(['Pending', 'Available']);
  });

  it('prevents a reset from publishing stale assessment results', async () => {
    const states: string[] = [];
    service.assessmentChanged.subscribe(state => states.push(state.status));

    service.assess(createLoadedDocument({
      openapi: '3.1.0',
      info: {title: 'Health', version: '1.0.0'},
      paths: {'/health': {get: {responses: {'204': {description: 'Healthy'}}}}}
    } as any));
    service.reset();
    await waitForAsyncCompletion();

    expect(states).toEqual(['Pending']);
  });

  it('publishes a completed worker report and terminates the worker', () => {
    worker = createWorker();
    const states: string[] = [];
    service.assessmentChanged.subscribe(state => states.push(state.status));
    const report = {availability: 'Available'} as ComplexityAssessmentReport;

    service.assess(createTestDocument());
    const requestId = getRequestId(worker);
    worker.onmessage?.({data: {type: 'complete', requestId, report}} as MessageEvent);

    expect(states).toEqual(['Pending', 'Available']);
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('publishes a worker failure when the worker returns an error response', () => {
    worker = createWorker();
    const states: string[] = [];
    service.assessmentChanged.subscribe(state => states.push(state.status));

    service.assess(createTestDocument());
    const requestId = getRequestId(worker);
    worker.onmessage?.({data: {type: 'failure', requestId, message: 'Worker failed'}} as MessageEvent);

    expect(states).toEqual(['Pending', 'Unavailable']);
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('ignores stale worker responses and terminates that worker', () => {
    const staleWorker = createWorker();
    worker = staleWorker;
    const states: string[] = [];
    service.assessmentChanged.subscribe(state => states.push(state.status));

    service.assess(createTestDocument());
    worker = createWorker();
    service.assess(createTestDocument());
    staleWorker.onmessage?.({data: {type: 'failure', requestId: 'stale', message: 'Stale'}} as MessageEvent);

    expect(states).toEqual(['Pending', 'Pending']);
    expect(staleWorker.terminate).toHaveBeenCalled();
  });

  it('terminates active workers when reset is called', () => {
    worker = createWorker();

    service.assess(createTestDocument());
    service.reset();

    expect(worker.terminate).toHaveBeenCalled();
  });

  it('serializes non-Error failures in the fallback path', async () => {
    const failure = {reason: 'unexpected'};
    const document = {
      get openapi(): never {
        throw failure;
      }
    } as any;
    const states: any[] = [];
    service.assessmentChanged.subscribe(state => states.push(state));

    service.assess(createLoadedDocument(document));
    await waitForAsyncCompletion();

    expect(states[1].status).toBe('Unavailable');
    expect(states[1].report.failure.values.message).toBe(JSON.stringify(failure));
  });
});

function createTestDocument() {
  return createLoadedDocument({
    openapi: '3.1.0',
    info: {title: 'Health', version: '1.0.0'},
    paths: {'/health': {get: {responses: {'204': {description: 'Healthy'}}}}}
  } as any);
}

function createWorker(): AssessmentWorker & {postMessage: jasmine.Spy; terminate: jasmine.Spy} {
  return {
    onmessage: null,
    onerror: null,
    postMessage: jasmine.createSpy('postMessage'),
    terminate: jasmine.createSpy('terminate')
  };
}

function getRequestId(worker: AssessmentWorker): string {
  const request = (worker.postMessage as jasmine.Spy).calls.mostRecent().args[0] as {requestId: string};
  return request.requestId;
}

function waitForAsyncCompletion(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
