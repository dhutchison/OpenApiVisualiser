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

  it('reports invalid request, response, parameter, and protocol shapes', () => {
    const report = assessLoadedDocument(scope({
      openapi: '3.1.0',
      info: {title: 'Invalid shapes', version: '1.0.0'},
      security: [{}],
      paths: {
        '/invalid': {
          servers: [{}],
          get: {
            parameters: [
              {$ref: '#/components/parameters/Id'},
              {},
              {name: 'query', in: 'query'},
              {name: 'content', in: 'query', content: {'application/json': {schema: {type: 'string'}}}},
              {name: 'schema', in: 'query', schema: {type: 'string'}}
            ],
            requestBody: {$ref: '#/components/requestBodies/Body'},
            responses: {
              '200': {
                headers: {
                  Link: {$ref: '#/components/headers/Link'},
                  Trace: {schema: {type: 'string'}}
                },
                content: {
                  'application/json': {},
                  'text/plain': {$ref: '#/components/schemas/Text'}
                },
                links: {next: {}}
              }
            },
            callbacks: {changed: {}},
            servers: [{}]
          }
        },
        '/invalid-body': {
          get: {
            requestBody: {},
            responses: {'204': {description: 'No content'}}
          }
        }
      }
    }));

    const codes = report.assessments.flatMap(assessment => assessment.blockingFaults.map(fault => fault.code));
    expect(codes).toContain('unsupported-reference');
    expect(codes).toContain('invalid-parameter');
    expect(codes).toContain('unsupported-parameter-shape');
    expect(codes).toContain('unsupported-request-body');
    expect(codes).toContain('missing-media-schema');
    expect(codes).toContain('unsupported-link');
    expect(codes).toContain('unsupported-protocol-obligations');
    expect(codes).toContain('unsupported-callback');
  });

  it('covers schema validation, collections, maps, roles, and structural depth', () => {
    const readOnly = {type: 'string', readOnly: true};
    const writeOnly = {type: 'string', writeOnly: true};
    const report = assessLoadedDocument(scope({
      openapi: '3.1.0',
      info: {title: 'Schema shapes', version: '1.0.0'},
      paths: {
        '/schema': {
          post: {
            requestBody: {
              required: true,
              content: {'application/json': {schema: {
                type: ['object', 'null'],
                nullable: true,
                minimum: 1,
                multipleOf: 2,
                minLength: 1,
                pattern: 'x',
                minItems: 1,
                minProperties: 1,
                enum: ['one'],
                properties: {
                  readOnly,
                  nested: {type: 'array', prefixItems: [{type: 'string'}, {type: 'number'}]},
                  map: {type: 'object', additionalProperties: {type: 'string'}},
                  unknownMap: {type: 'object', additionalProperties: true},
                  composed: {allOf: [{type: 'string'}]},
                  extension: {'x-multi-segment': true},
                  deep: deepSchema()
                },
                required: ['nested']
              }}}
            },
            responses: {
              '200': {
                content: {'application/json': {schema: {
                  type: 'object',
                  properties: {writeOnly, array: {type: 'array', items: {type: 'string'}}}
                }}}
              }
            }
          }
        }
      }
    }));

    const assessment = report.assessments[0];
    const codes = assessment.blockingFaults.map(fault => fault.code);
    expect(codes).toContain('unsupported-untyped-map');
    expect(codes).toContain('unsupported-schema-composition');
    expect(codes).toContain('known-contract-affecting-extension');
    expect(assessment.dimensions.dataShape.escalations).toContain('structural-depth-very-high');
    expect(assessment.dimensions.conditionality.units).toBeGreaterThan(0);
  });

  it('creates stable hotspot tiers for equal and different assessments', () => {
    const report = assessLoadedDocument(scope({
      openapi: '3.1.0',
      info: {title: 'Hotspots', version: '1.0.0'},
      paths: {
        '/a': {get: {responses: {'200': {description: 'A'}}}},
        '/b': {get: {responses: {'200': {description: 'B'}}}},
        '/c': {post: {
          requestBody: {content: {'application/json': {schema: {type: 'string'}}}},
          responses: {
            '200': {description: 'C'},
            '201': {description: 'Created'},
            '202': {description: 'Accepted'},
            default: {description: 'Error'}
          }
        }}
      }
    }));

    expect(report.hotspots).toHaveSize(3);
    const equalHotspots = report.hotspots.filter(hotspot => hotspot.identity.path === '/a' || hotspot.identity.path === '/b');
    const differentHotspot = report.hotspots.find(hotspot => hotspot.identity.path === '/c');
    expect(equalHotspots[0].tier).toBe(equalHotspots[1].tier);
    expect(differentHotspot?.tier).not.toBe(equalHotspots[0].tier);
  });
});

function deepSchema(): Record<string, unknown> {
  let schema: Record<string, unknown> = {type: 'string'};
  for (let depth = 0; depth < 13; depth++) {
    schema = {type: 'object', properties: {next: schema}};
  }
  return schema;
}

function scope(document: Record<string, unknown>): AssessmentScopeInput {
  return {
    scopeId: 'assessment-scope:test',
    sourceId: 'file:///test/openapi.yaml',
    baseUri: 'file:///test/openapi.yaml',
    document,
    resourceSet: [{sourceId: 'file:///test/openapi.yaml', baseUri: 'file:///test/openapi.yaml', document}]
  };
}
