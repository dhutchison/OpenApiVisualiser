import { TestBed } from '@angular/core/testing';
import { createLoadedDocument } from '../models/loaded-document.models';
import { ComplexityAssessmentService, COMPLEXITY_WORKER_FACTORY } from './complexity-assessment.service';

describe('ComplexityAssessmentService', () => {
  let service: ComplexityAssessmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {provide: COMPLEXITY_WORKER_FACTORY, useValue: () => undefined}
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
});

function waitForAsyncCompletion(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
