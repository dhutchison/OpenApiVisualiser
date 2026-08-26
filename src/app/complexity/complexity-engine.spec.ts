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

  it('resolves reachable local references without multiplying structural burden', () => {
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
    expect(assessment.confidence).toBe('Complete');
    expect(assessment.rawBand).toBe('Low');
    expect(assessment.finalBand).toBe('Low');
    expect(assessment.blockingFaults).toHaveSize(0);
    expect(assessment.dimensions.indirection.units).toBe(1);
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

  it('resolves escaped JSON pointers and supplied external resources without fetching', () => {
    const root = {
      openapi: '3.1.0',
      info: {title: 'External', version: '1.0.0'},
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {content: {'application/json': {schema: {$ref: 'schemas.yaml#/components/schemas/a~1b'}}}}
            }
          }
        }
      }
    };
    const external = {
      openapi: '3.1.0',
      info: {title: 'Schemas', version: '1.0.0'},
      components: {schemas: {'a/b': {type: 'object', properties: {id: {type: 'string'}}}}}
    };
    const report = assessLoadedDocument(scope(root, [
      {sourceId: 'file:///test/openapi.yaml', baseUri: 'file:///test/openapi.yaml', document: root},
      {sourceId: 'file:///test/schemas.yaml', baseUri: 'file:///test/schemas.yaml', document: external}
    ]));
    const assessment = report.assessments[0];

    expect(assessment.confidence).toBe('Complete');
    expect(assessment.blockingFaults).toHaveSize(0);
    expect(assessment.dimensions.indirection.units).toBe(3);
    expect(assessment.reasons.some(reason => reason.source.sourceId === 'file:///test/schemas.yaml'
      && reason.source.pointer === '/components/schemas/a~1b/properties/id')).toBeTrue();
  });

  it('deduplicates reused targets within a role while keeping request and response roles distinct', () => {
    const document = {
      openapi: '3.1.0',
      info: {title: 'Reuse', version: '1.0.0'},
      paths: {
        '/pets': {
          post: {
            requestBody: {content: {
              'application/json': {schema: {$ref: '#/components/schemas/Pet'}},
              'application/vnd.pet+json': {schema: {$ref: '#/components/schemas/Pet'}}
            }},
            responses: {'200': {content: {'application/json': {schema: {$ref: '#/components/schemas/Pet'}}}}}
          }
        }
      },
      components: {schemas: {Pet: {type: 'object', properties: {id: {type: 'string'}}}}}
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];

    expect(assessment.dimensions.dataShape.units).toBe(4);
    expect(assessment.dimensions.indirection.units).toBe(2);
    expect(assessment.reasons.filter(reason => reason.code === 'field')).toHaveSize(2);
    expect(assessment.reasons.filter(reason => reason.code === 'field' && reason.consumerRole === 'request')).toHaveSize(1);
    expect(assessment.reasons.filter(reason => reason.code === 'field' && reason.consumerRole === 'response')).toHaveSize(1);
  });

  it('combines allOf fields and retains composition indirection without duplicate fields', () => {
    const document = {
      openapi: '3.1.0',
      info: {title: 'Composition', version: '1.0.0'},
      paths: {
        '/pets': {
          post: {
            requestBody: {content: {'application/json': {schema: {allOf: [
              {type: 'object', properties: {id: {type: 'string'}}},
              {type: 'object', properties: {id: {type: 'string'}, name: {type: 'string'}}}
            ]}}}},
            responses: {'204': {description: 'Updated'}}
          }
        }
      }
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];

    expect(assessment.blockingFaults).toHaveSize(0);
    expect(assessment.dimensions.dataShape.units).toBe(4);
    expect(assessment.reasons.filter(reason => reason.code === 'field')).toHaveSize(2);
    expect(assessment.reasons.filter(reason => reason.code === 'composition-edge')).toHaveSize(2);
    expect(assessment.dimensions.indirection.units).toBe(2);
  });

  it('keeps contradictory allOf evidence but marks the operation incomplete', () => {
    const document = {
      openapi: '3.1.0',
      info: {title: 'Contradiction', version: '1.0.0'},
      paths: {
        '/pets': {post: {requestBody: {content: {'application/json': {schema: {allOf: [
          {type: 'object', properties: {id: {type: 'string'}}},
          {type: 'object', properties: {id: {type: 'integer'}}}
        ]}}}}, responses: {'204': {description: 'Updated'}}}}
      }
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];

    expect(assessment.confidence).toBe('Incomplete');
    expect(assessment.finalBand).toBe('Unknown');
    expect(assessment.blockingFaults[0].code).toBe('contradictory-composition');
  });

  it('merges referenced allOf branches into one effective shape', () => {
    const document = {
      openapi: '3.1.0',
      info: {title: 'Referenced composition', version: '1.0.0'},
      paths: {
        '/pets': {post: {requestBody: {content: {'application/json': {schema: {$ref: '#/components/schemas/Pet'}}}}, responses: {'204': {description: 'Updated'}}}}
      },
      components: {schemas: {
        Pet: {allOf: [{$ref: '#/components/schemas/Identity'}, {$ref: '#/components/schemas/Named'}]},
        Identity: {type: 'object', properties: {id: {type: 'string'}}},
        Named: {type: 'object', properties: {id: {type: 'string'}, name: {type: 'string'}}}
      }}
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];

    expect(assessment.blockingFaults).toHaveSize(0);
    expect(assessment.reasons.filter(reason => reason.code === 'field')).toHaveSize(2);
    expect(assessment.reasons.filter(reason => reason.code === 'composition-edge')).toHaveSize(2);
  });

  it('assesses recursive strongly connected schemas once with one recursion and cycle signal', () => {
    const document = {
      openapi: '3.1.0',
      info: {title: 'Recursive', version: '1.0.0'},
      paths: {
        '/nodes': {
          get: {responses: {'200': {content: {'application/json': {schema: {$ref: '#/components/schemas/Node'}}}}}}
        }
      },
      components: {schemas: {Node: {type: 'object', properties: {
        value: {type: 'string'},
        next: {$ref: '#/components/schemas/Node'}
      }}}}
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];

    expect(assessment.blockingFaults).toHaveSize(0);
    expect(assessment.dimensions.dataShape.level).toBe('High');
    expect(assessment.reasons.filter(reason => reason.code === 'recursive-structure')).toHaveSize(1);
    expect(assessment.reasons.filter(reason => reason.code === 'cycle-navigation')).toHaveSize(1);
  });

  it('collapses multiple cycles in one recursive SCC into one signal pair', () => {
    const document = {
      openapi: '3.1.0',
      info: {title: 'Multi-cycle', version: '1.0.0'},
      paths: {'/nodes': {get: {responses: {'200': {content: {'application/json': {schema: {$ref: '#/components/schemas/A'}}}}}}}},
      components: {schemas: {
        A: {type: 'object', properties: {b: {$ref: '#/components/schemas/B'}}},
        B: {type: 'object', properties: {
          a: {$ref: '#/components/schemas/A'},
          c: {$ref: '#/components/schemas/C'}
        }},
        C: {type: 'object', properties: {a: {$ref: '#/components/schemas/A'}}}
      }}
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];

    expect(assessment.reasons.filter(reason => reason.code === 'recursive-structure')).toHaveSize(1);
    expect(assessment.reasons.filter(reason => reason.code === 'cycle-navigation')).toHaveSize(1);
  });

  it('escalates structural and reference-chain depth at the version-one thresholds', () => {
    const nested = (levels: number): Record<string, unknown> => levels === 0
      ? {type: 'string'}
      : {type: 'object', properties: {[`level${levels}`]: nested(levels - 1)}};
    const schemas: Record<string, unknown> = {};
    for (let index = 0; index < 10; index++) {
      schemas[`S${index}`] = index === 9 ? {type: 'string'} : {$ref: `#/components/schemas/S${index + 1}`};
    }
    const document = {
      openapi: '3.1.0',
      info: {title: 'Depth', version: '1.0.0'},
      paths: {
        '/nested': {get: {responses: {'200': {content: {'application/json': {schema: nested(8)}}}}}},
        '/chain': {get: {responses: {'200': {content: {'application/json': {schema: {$ref: '#/components/schemas/S0'}}}}}}}
      },
      components: {schemas}
    };
    const assessments = assessLoadedDocument(scope(document)).assessments;

    expect(assessments.find(assessment => assessment.identity.path === '/nested')?.dimensions.dataShape.level).toBe('High');
    expect(assessments.find(assessment => assessment.identity.path === '/chain')?.dimensions.indirection.level).toBe('Very high');
  });

  it('retains depth escalation when an equivalent target was already assessed shallowly', () => {
    const nested = (levels: number): Record<string, unknown> => levels === 0
      ? {$ref: '#/components/schemas/Leaf'}
      : {type: 'object', properties: {[`level${levels}`]: nested(levels - 1)}};
    const document = {
      openapi: '3.1.0',
      info: {title: 'Repeated depth', version: '1.0.0'},
      paths: {'/nested': {get: {responses: {'200': {content: {'application/json': {schema: {
        type: 'object', properties: {shallow: {$ref: '#/components/schemas/Leaf'}, deep: nested(8)}
      }}}}}}}},
      components: {schemas: {Leaf: {type: 'string'}}}
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];

    expect(assessment.dimensions.dataShape.level).toBe('High');
  });

  it('keeps an unreachable broken component out of independent operations', () => {
    const document = {
      openapi: '3.1.0',
      info: {title: 'Reachability', version: '1.0.0'},
      paths: {
        '/good': {get: {responses: {'204': {description: 'Good'}}}},
        '/bad': {get: {responses: {'200': {content: {'application/json': {schema: {$ref: '#/components/schemas/Missing'}}}}}}}
      },
      components: {schemas: {Broken: {$ref: '#/components/schemas/Missing'}}}
    };
    const report = assessLoadedDocument(scope(document));

    expect(report.assessments.find(assessment => assessment.identity.path === '/good')?.confidence).toBe('Complete');
    expect(report.assessments.find(assessment => assessment.identity.path === '/bad')?.finalBand).toBe('Unknown');
    expect(report.assessments.find(assessment => assessment.identity.path === '/bad')?.blockingFaults[0].code).toBe('unavailable-reference');
  });

  it('assesses alternatives and callback protocol obligations instead of treating them as unknown', () => {
    const document = {
      openapi: '3.1.0',
      info: {title: 'Protocol', version: '1.0.0'},
      security: [{oauth: ['pets:read'], apiKey: []}, {}],
      components: {securitySchemes: {
        oauth: {type: 'oauth2', flows: {clientCredentials: {tokenUrl: 'https://example.test/token', scopes: {'pets:read': 'Read pets'}}}},
        apiKey: {type: 'apiKey', in: 'header', name: 'X-API-Key'}
      }},
      paths: {
        '/pets': {
          post: {
            requestBody: {content: {'application/json': {schema: {oneOf: [
              {type: 'string'}, {type: 'integer'}, {type: 'boolean'}, {type: 'number'}
            ]}}}},
            callbacks: {
              onPet: {'{$request.body#/callbackUrl}': {
                post: {responses: {'204': {description: 'Accepted'}}}
              }}
            },
            responses: {'204': {description: 'Accepted'}}
          }
        }
      }
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];

    expect(assessment.blockingFaults).toHaveSize(0);
    expect(assessment.dimensions.conditionality.level).toBe('High');
    expect(assessment.dimensions.protocolObligations.level).toBe('High');
    expect(assessment.reasons.some(reason => reason.code === 'callback-operation')).toBeTrue();
    expect(assessment.reasons.some(reason => reason.code === 'security-scope')).toBeTrue();
  });

  it('reports invalid request, response, parameter, and protocol shapes', () => {
    const report = assessLoadedDocument(scope({
      openapi: '3.1.0',
      info: {title: 'Invalid shapes', version: '1.0.0'},
      security: [{}, {}],
      paths: {
        '/invalid': {
          servers: [{}, {}],
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

    const assessment = report.assessments.find(item => item.identity.path === '/invalid');
    const blockingCodes = report.assessments.flatMap(item => item.blockingFaults.map(fault => fault.code));
    const evidenceCodes = assessment?.reasons.map(reason => reason.code) ?? [];
    expect(blockingCodes).toContain('unavailable-reference');
    expect(blockingCodes).toContain('invalid-parameter');
    expect(blockingCodes).toContain('unsupported-parameter-shape');
    expect(blockingCodes).toContain('unsupported-request-body');
    expect(blockingCodes).toContain('missing-media-schema');
    expect(evidenceCodes).toContain('response-link');
    expect(evidenceCodes).toContain('anonymous-auth-choice');
    expect(evidenceCodes).toContain('server-alternative');
    expect(evidenceCodes).toContain('callback-operation');
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
    expect(assessment.reasons.map(reason => reason.code)).toContain('composition-edge');
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

function scope(document: Record<string, unknown>, resourceSet?: AssessmentScopeInput['resourceSet']): AssessmentScopeInput {
  return {
    scopeId: 'assessment-scope:test',
    sourceId: 'file:///test/openapi.yaml',
    baseUri: 'file:///test/openapi.yaml',
    document,
    resourceSet: resourceSet ?? [{sourceId: 'file:///test/openapi.yaml', baseUri: 'file:///test/openapi.yaml', document}]
  };
}
