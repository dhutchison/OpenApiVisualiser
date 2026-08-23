import { Injectable, InjectionToken, inject } from '@angular/core';
import { LoadedDocument } from '../models/loaded-document.models';
import { assessLoadedDocument, createUnavailableReport } from '../complexity/complexity-engine';
import {
  AssessmentReason,
  AssessmentScopeInput,
  ComplexityAssessmentReport,
  ComplexityAssessmentState
} from '../complexity/complexity.models';
import { Subject } from 'rxjs';

export interface AssessmentWorker {
  onmessage: ((event: MessageEvent<AssessmentWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}

export type ComplexityWorkerFactory = () => AssessmentWorker | undefined;

export const COMPLEXITY_WORKER_FACTORY = new InjectionToken<ComplexityWorkerFactory>('COMPLEXITY_WORKER_FACTORY', {
  providedIn: 'root',
  factory: () => () => {
    if (typeof Worker === 'undefined') {
      return undefined;
    }
    return new Worker(new URL('../workers/complexity-assessment.worker', import.meta.url), {type: 'module'}) as unknown as AssessmentWorker;
  }
});

interface AssessmentWorkerResponse {
  readonly type: 'complete' | 'failure';
  readonly requestId: string;
  readonly report?: ComplexityAssessmentReport;
  readonly message?: string;
}

@Injectable({providedIn: 'root'})
export class ComplexityAssessmentService {
  readonly assessmentChanged = new Subject<ComplexityAssessmentState>();

  private readonly createWorker = inject(COMPLEXITY_WORKER_FACTORY);
  private readonly workers = new Map<string, AssessmentWorker>();
  private readonly currentRequests = new Map<string, string>();
  private requestSequence = 0;

  assess(loadedDocument: LoadedDocument): void {
    this.cancel(loadedDocument.scopeId);
    const requestId = `${loadedDocument.scopeId}:${++this.requestSequence}`;
    this.currentRequests.set(loadedDocument.scopeId, requestId);
    const scope = toAssessmentScope(loadedDocument);

    this.assessmentChanged.next({scopeId: loadedDocument.scopeId, status: 'Pending'});

    const worker = this.createWorker();
    if (!worker) {
      Promise.resolve().then(() => {
        if (!this.isCurrent(loadedDocument.scopeId, requestId)) {
          return;
        }
        this.publish({
          scopeId: loadedDocument.scopeId,
          status: 'Available',
          report: assessLoadedDocument(scope)
        });
      }).catch(error => this.publishFailure(loadedDocument, requestId, error));
      return;
    }

    this.workers.set(loadedDocument.scopeId, worker);
    worker.onmessage = event => {
      if (!this.isCurrent(loadedDocument.scopeId, requestId)) {
        worker.terminate();
        return;
      }
      this.workers.delete(loadedDocument.scopeId);
      worker.terminate();
      if (event.data.type === 'complete' && event.data.report) {
        this.publish({scopeId: loadedDocument.scopeId, status: event.data.report.availability, report: event.data.report});
      } else {
        this.publishFailure(loadedDocument, requestId, event.data.message ?? 'The complexity assessment failed.');
      }
    };
    worker.onerror = event => {
      if (this.isCurrent(loadedDocument.scopeId, requestId)) {
        this.workers.delete(loadedDocument.scopeId);
        worker.terminate();
        this.publishFailure(loadedDocument, requestId, event.message);
      }
    };
    worker.postMessage({type: 'assess', requestId, scope});
  }

  reset(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
    this.currentRequests.clear();
    this.requestSequence++;
  }

  private cancel(scopeId: string): void {
    const worker = this.workers.get(scopeId);
    if (worker) {
      worker.terminate();
      this.workers.delete(scopeId);
    }
  }

  private isCurrent(scopeId: string, requestId: string): boolean {
    return this.currentRequests.get(scopeId) === requestId;
  }

  private publish(state: ComplexityAssessmentState): void {
    this.assessmentChanged.next(state);
  }

  private publishFailure(loadedDocument: LoadedDocument, requestId: string, error: unknown): void {
    if (!this.isCurrent(loadedDocument.scopeId, requestId)) {
      return;
    }
    this.publish({
      scopeId: loadedDocument.scopeId,
      status: 'Unavailable',
      report: createUnavailableReport(toAssessmentScope(loadedDocument), createFailureReason(loadedDocument, error))
    });
  }
}

function toAssessmentScope(loadedDocument: LoadedDocument): AssessmentScopeInput {
  return {
    scopeId: loadedDocument.scopeId,
    sourceId: loadedDocument.sourceId,
    baseUri: loadedDocument.baseUri,
    document: loadedDocument.document as unknown as Readonly<Record<string, unknown>>,
    resourceSet: loadedDocument.resourceSet.entries.map(resource => ({
      sourceId: resource.sourceId,
      baseUri: resource.baseUri,
      document: resource.document as unknown as Readonly<Record<string, unknown>>
    }))
  };
}

function createFailureReason(loadedDocument: LoadedDocument, error: unknown): AssessmentReason {
  return {
    code: 'assessment-failed',
    category: 'assessment',
    source: {sourceId: loadedDocument.sourceId, pointer: '/'},
    values: {message: error instanceof Error ? error.message : String(error)}
  };
}
