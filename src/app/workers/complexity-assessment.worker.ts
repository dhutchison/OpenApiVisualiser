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
  origin: string;
};

export function handleAssessmentMessage(
  event: MessageEvent<AssessmentWorkerRequest>,
  postMessage: (message: unknown) => void,
  workerOrigin: string
) {
  if (event.origin !== workerOrigin) {
    return;
  }
  if (event.data.type !== 'assess') {
    return;
  }

  try {
    postMessage({
      type: 'complete',
      requestId: event.data.requestId,
      report: assessLoadedDocument(event.data.scope)
    });
  } catch (error) {
    postMessage({
      type: 'failure',
      requestId: event.data.requestId,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

workerScope.addEventListener('message', event => {
  if (event.origin !== workerScope.origin) {
    return;
  }
  handleAssessmentMessage(event, message => workerScope.postMessage(message), workerScope.origin);
});
