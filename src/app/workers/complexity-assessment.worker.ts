import { assessLoadedDocument } from '../complexity/complexity-engine';
import { AssessmentScopeInput } from '../complexity/complexity.models';

interface AssessmentWorkerRequest {
  readonly type: 'assess';
  readonly requestId: string;
  readonly scope: AssessmentScopeInput;
}

const workerScope = globalThis as typeof globalThis & {
  postMessage: (message: unknown) => void;
  addEventListener: (type: string, listener: (event: MessageEvent<AssessmentWorkerRequest>) => void) => void;
};

workerScope.addEventListener('message', (event) => {
  if (event.data.type !== 'assess') {
    return;
  }

  try {
    workerScope.postMessage({
      type: 'complete',
      requestId: event.data.requestId,
      report: assessLoadedDocument(event.data.scope)
    });
  } catch (error) {
    workerScope.postMessage({
      type: 'failure',
      requestId: event.data.requestId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
});
