import {AssessmentScopeInput} from '../complexity/complexity.models';
import {handleAssessmentMessage} from './complexity-assessment.worker';

describe('complexity assessment worker message handling', () => {
  const scope: AssessmentScopeInput = {
    scopeId: 'test-scope',
    sourceId: 'file:///test/openapi.yaml',
    baseUri: 'file:///test/openapi.yaml',
    document: {
      openapi: '3.1.0',
      info: {title: 'Test', version: '1.0.0'},
      paths: {}
    },
    resourceSet: []
  };

  it('ignores assessment messages from a different origin', () => {
    const messages: unknown[] = [];

    handleAssessmentMessage(
      {origin: 'https://attacker.example', data: {type: 'assess', requestId: 'request-1', scope}} as MessageEvent,
      message => messages.push(message),
      'https://app.example'
    );

    expect(messages).toEqual([]);
  });

  it('processes assessment messages from the worker origin', () => {
    const messages: unknown[] = [];

    handleAssessmentMessage(
      {origin: 'https://app.example', data: {type: 'assess', requestId: 'request-2', scope}} as MessageEvent,
      message => messages.push(message),
      'https://app.example'
    );

    expect(messages).toHaveSize(1);
    expect(messages[0]).toEqual(jasmine.objectContaining({type: 'complete', requestId: 'request-2'}));
  });

  it('processes worker messages without an origin', () => {
    const messages: unknown[] = [];

    handleAssessmentMessage(
      {origin: '', data: {type: 'assess', requestId: 'request-3', scope}} as MessageEvent,
      message => messages.push(message),
      'https://app.example'
    );

    expect(messages).toHaveSize(1);
    expect(messages[0]).toEqual(jasmine.objectContaining({type: 'complete', requestId: 'request-3'}));
  });
});
