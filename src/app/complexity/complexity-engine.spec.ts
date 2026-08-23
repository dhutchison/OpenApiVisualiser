import { assessLoadedDocument } from './complexity-engine';
import { AssessmentScopeInput } from './complexity.models';

describe('assessLoadedDocument', () => {
  it('assesses a bodyless operation with a stable low profile', () => {
    const report = assessLoadedDocument(scope({
      openapi: '3.1.0',
      info: {title: 'Health', version: '1.0.0'},
      paths: {
        '/health': {
          get: {
            responses: {'204': {description: 'Healthy'}}
          }
        }
      }
    }));

    const assessment = report.assessments[0];
    expect(report.availability).toBe('Available');
    expect(assessment.finalBand).toBe('Low');
    expect(assessment.confidence).toBe('Complete');
    expect(assessment.dimensions.interactionSurface.units).toBe(1);
    expect(assessment.dimensions.dataShape.units).toBe(0);
    expect(assessment.identity.key).toBe('assessment-scope:test:get:/health');
  });

  it('counts parameters, representations, response cases, and inline fields', () => {
    const report = assessLoadedDocument(scope({
      openapi: '3.0.3',
      info: {title: 'Inline', version: '1.0.0'},
      paths: {
        '/records': {
          post: {
            parameters: [
              {name: 'limit', in: 'query', required: true, schema: {type: 'integer'}},
              {name: 'cursor', in: 'query', schema: {type: 'string'}}
            ],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: {type: 'string'},
                      name: {type: 'string'},
                      state: {type: 'string'},
                      owner: {type: 'string'},
                      created: {type: 'string'},
                      updated: {type: 'string'}
                    }
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Created',
                content: {
                  'application/json': {schema: {type: 'string'}},
                  'text/plain': {schema: {type: 'string'}}
                }
              },
              default: {description: 'Error'}
            }
          }
        }
      }
    }));

    const assessment = report.assessments[0];
    expect(assessment.dimensions.interactionSurface.units).toBe(7);
    expect(assessment.dimensions.interactionSurface.level).toBe('Moderate');
    expect(assessment.dimensions.dataShape.units).toBe(12);
    expect(assessment.dimensions.dataShape.level).toBe('Moderate');
    expect(assessment.dimensions.conditionality.units).toBe(8);
    expect(assessment.dimensions.conditionality.level).toBe('Moderate');
    expect(assessment.rawBand).toBe('High');
    expect(assessment.finalBand).toBe('High');
  });

  it('keeps unsupported reachable references explicit and unknown', () => {
    const report = assessLoadedDocument(scope({
      openapi: '3.1.0',
      info: {title: 'Referenced', version: '1.0.0'},
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                description: 'Pets',
                content: {'application/json': {schema: {$ref: '#/components/schemas/Pets'}}}
              }
            }
          }
        }
      },
      components: {schemas: {Pets: {type: 'array', items: {type: 'string'}}}}
    }));

    const assessment = report.assessments[0];
    expect(assessment.confidence).toBe('Incomplete');
    expect(assessment.rawBand).toBe('Unknown');
    expect(assessment.finalBand).toBe('Unknown');
    expect(assessment.blockingFaults[0].code).toBe('unsupported-reference');
    expect(report.needsAssessment[0].key).toBe(assessment.identity.key);
  });

  it('produces deterministic reports when path map order changes', () => {
    const first = scope({
      openapi: '3.1.0',
      info: {title: 'Order', version: '1.0.0'},
      paths: {
        '/z': {get: {responses: {'204': {description: 'No content'}}}},
        '/a': {post: {responses: {'201': {description: 'Created'}}}}
      }
    });
    const second = scope({
      openapi: '3.1.0',
      info: {title: 'Order', version: '1.0.0'},
      paths: {
        '/a': {post: {responses: {'201': {description: 'Created'}}}},
        '/z': {get: {responses: {'204': {description: 'No content'}}}}
      }
    });

    expect(JSON.stringify(assessLoadedDocument(first))).toBe(JSON.stringify(assessLoadedDocument(second)));
  });

  it('returns an unavailable report for an unsupported document version', () => {
    const report = assessLoadedDocument(scope({
      openapi: '2.0',
      info: {title: 'Old', version: '1.0.0'},
      paths: {}
    }));

    expect(report.availability).toBe('Unavailable');
    expect(report.failure?.code).toBe('unsupported-openapi-version');
  });

  it('reports known contract-affecting extensions as blocking faults', () => {
    const report = assessLoadedDocument(scope({
      openapi: '3.1.0',
      info: {title: 'Extension', version: '1.0.0'},
      paths: {
        '/search': {
          get: {
            'x-multi-segment': true,
            responses: {'200': {description: 'Results'}}
          }
        }
      }
    }));

    expect(report.assessments[0].finalBand).toBe('Unknown');
    expect(report.assessments[0].blockingFaults[0].code).toBe('known-contract-affecting-extension');
  });
});

function scope(document: Record<string, unknown>): AssessmentScopeInput {
  return {
    scopeId: 'assessment-scope:test',
    sourceId: 'file:///test/openapi.yaml',
    baseUri: 'file:///test/openapi.yaml',
    document,
    resourceSet: [{sourceId: 'file:///test/openapi.yaml', baseUri: 'file:///test/openapi.yaml', document}]
  };
}
