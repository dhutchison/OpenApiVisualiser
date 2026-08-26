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
    expect(assessment.dimensions.conditionality.units).toBe(9);
    expect(assessment.dimensions.conditionality.level).toBe('High');
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
    expect(report.capabilityManifest.knownContractAffectingExtensions).toContain('x-multi-segment');
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

  it('projects readOnly and writeOnly fields into the applicable consumer role', () => {
    const document = {
      openapi: '3.1.0',
      info: {title: 'Role projection', version: '1.0.0'},
      paths: {
        '/pets': {
          post: {
            requestBody: {content: {'application/json': {schema: {$ref: '#/components/schemas/Pet'}}}},
            responses: {'200': {content: {'application/json': {schema: {$ref: '#/components/schemas/Pet'}}}}}
          }
        }
      },
      components: {schemas: {Pet: {type: 'object', required: ['id', 'name'], properties: {
        id: {allOf: [{type: 'string', readOnly: true}]},
        secret: {type: 'string', writeOnly: true},
        name: {type: 'string', default: 'unknown'},
        nickname: {type: 'string'}
      }}}}
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];
    const fields = assessment.reasons.filter(reason => reason.code === 'field');
    const requiredness = assessment.reasons.filter(reason =>
      reason.code === 'requiredness-obligation' || reason.code === 'optionality-obligation');

    expect(fields.filter(reason => reason.consumerRole === 'request').map(reason => reason.source.pointer)).toEqual([
      '/components/schemas/Pet/properties/name',
      '/components/schemas/Pet/properties/nickname',
      '/components/schemas/Pet/properties/secret'
    ]);
    expect(fields.filter(reason => reason.consumerRole === 'response').map(reason => reason.source.pointer)).toEqual([
      '/components/schemas/Pet/properties/id',
      '/components/schemas/Pet/properties/name',
      '/components/schemas/Pet/properties/nickname'
    ]);
    expect(requiredness.some(reason => reason.consumerRole === 'request'
      && reason.source.pointer.endsWith('/properties/name')
      && reason.code === 'requiredness-obligation')).toBeTrue();
    expect(requiredness.some(reason => reason.consumerRole === 'response'
      && reason.source.pointer.endsWith('/properties/nickname')
      && reason.code === 'optionality-obligation')).toBeTrue();
  });

  it('reverses callback request and response roles for the original consumer', () => {
    const callbackOperation = {
      requestBody: {content: {'application/json': {
        schema: {type: 'object', properties: {callbackId: {type: 'string', readOnly: true}}}
      }}},
      responses: {'200': {content: {'application/json': {
        schema: {type: 'object', properties: {ack: {type: 'string', writeOnly: true}}}
      }}}}
    };
    const document = {
      openapi: '3.1.0',
      info: {title: 'Callback roles', version: '1.0.0'},
      paths: {'/pets': {post: {
        callbacks: {onPet: {'{$request.body#/callbackUrl}': {post: callbackOperation}}},
        responses: {'202': {description: 'Accepted'}}
      }}}
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];
    const fields = assessment.reasons.filter(reason => reason.code === 'field');

    expect(fields.some(reason => reason.consumerRole === 'response'
      && reason.source.pointer.endsWith('/callbackId'))).toBeTrue();
    expect(fields.some(reason => reason.consumerRole === 'request'
      && reason.source.pointer.endsWith('/ack'))).toBeTrue();
  });

  it('counts optional request bodies without allowing defaults to erase obligations', () => {
    const schema = {type: 'object', required: ['name'], properties: {name: {type: 'string', default: 'pet'}}};
    const document = {
      openapi: '3.1.0',
      info: {title: 'Defaults', version: '1.0.0'},
      paths: {'/pets': {post: {
        requestBody: {content: {'application/json': {schema}}},
        responses: {'204': {description: 'Accepted'}}
      }}}
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];

    expect(assessment.reasons.some(reason => reason.code === 'optionality-obligation'
      && reason.source.pointer.endsWith('/requestBody'))).toBeTrue();
    expect(assessment.reasons.some(reason => reason.code === 'requiredness-obligation'
      && reason.source.pointer.endsWith('/properties/name'))).toBeTrue();
  });

  it('assesses dependent rules and version-appropriate schema semantics', () => {
    const schema31 = {
      type: 'object',
      dependentRequired: {creditCard: ['billingAddress']},
      dependentSchemas: {shipping: {required: ['address'], properties: {address: {type: 'string'}}}},
      properties: {creditCard: {type: 'string'}, billingAddress: {type: 'string'}, shipping: {type: 'boolean'}}
    };
    const version31 = {
      openapi: '3.1.0',
      info: {title: 'Conditional schema', version: '1.0.0'},
      paths: {'/pets': {post: {
        requestBody: {content: {'application/json': {schema: schema31}}},
        responses: {'204': {description: 'Accepted'}}
      }}}
    };
    const schema30 = {
      type: 'object',
      dependencies: {creditCard: ['billingAddress']},
      properties: {creditCard: {type: 'string'}, billingAddress: {type: 'string'}}
    };
    const version30 = {
      openapi: '3.0.3',
      info: {title: 'Conditional schema', version: '1.0.0'},
      paths: {'/pets': {post: {
        requestBody: {content: {'application/json': {schema: schema30}}},
        responses: {'204': {description: 'Accepted'}}
      }}}
    };
    const report31 = assessLoadedDocument(scope(version31));
    const report30 = assessLoadedDocument(scope(version30));

    expect(report31.assessments[0].blockingFaults).toHaveSize(0);
    expect(report31.assessments[0].dimensions.conditionality.level).toBe('High');
    expect(report31.assessments[0].reasons.filter(reason => reason.code === 'dependent-conditional-rule')).toHaveSize(2);
    expect(report30.assessments[0].blockingFaults).toHaveSize(0);
    expect(report30.assessments[0].reasons.some(reason => reason.code === 'dependent-conditional-rule')).toBeTrue();
  });

  it('keeps discriminator alternatives and reports broken mappings at the right severity', () => {
    const schema = {
      oneOf: [{$ref: '#/components/schemas/Cat'}, {$ref: '#/components/schemas/Dog'}],
      discriminator: {propertyName: 'kind', mapping: {
        cat: '#/components/schemas/Cat', dog: '#/components/schemas/Missing'
      }}
    };
    const document = {
      openapi: '3.1.0',
      info: {title: 'Discriminator', version: '1.0.0'},
      paths: {'/pets': {post: {
        requestBody: {content: {'application/json': {schema}}},
        responses: {'204': {description: 'Accepted'}}
      }}},
      components: {schemas: {
        Cat: {type: 'object', properties: {kind: {const: 'cat'}}},
        Dog: {type: 'object', properties: {kind: {const: 'dog'}}}
      }}
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];

    expect(assessment.blockingFaults).toHaveSize(0);
    expect(assessment.warnings.some(reason => reason.code === 'broken-discriminator-mapping')).toBeTrue();
    expect(assessment.reasons.filter(reason => reason.code === 'alternative-branch')).toHaveSize(1);
    expect(assessment.reasons.some(reason => reason.code === 'discriminator-selector')).toBeTrue();
  });

  it('blocks contract-affecting keywords that belong to the wrong OpenAPI version', () => {
    const schema30 = {type: 'array', prefixItems: [{type: 'string'}]};
    const version30 = {
      openapi: '3.0.3',
      info: {title: 'Version boundary', version: '1.0.0'},
      paths: {'/pets': {get: {responses: {'200': {content: {'application/json': {schema: schema30}}}}}}}
    };
    const schema31 = {type: ['string', 'null'], const: 'pet'};
    const version31 = {
      openapi: '3.1.0',
      info: {title: 'Version boundary', version: '1.0.0'},
      paths: {'/pets': {get: {responses: {'200': {content: {'application/json': {schema: schema31}}}}}}}
    };
    const report30 = assessLoadedDocument(scope(version30));
    const report31 = assessLoadedDocument(scope(version31));

    expect(report30.assessments[0].finalBand).toBe('Unknown');
    expect(report30.assessments[0].blockingFaults.some(reason => reason.code === 'unsupported-schema-keyword'
      && reason.values.keyword === 'prefixItems')).toBeTrue();
    expect(report31.assessments[0].blockingFaults).toHaveSize(0);
    expect(report31.assessments[0].reasons.some(reason => reason.code === 'validation-rule-family'
      && reason.values.family === 'choice')).toBeTrue();
  });

  it('escalates eight alternatives and nested conditional layers', () => {
    const document = {
      openapi: '3.1.0',
      info: {title: 'Nested alternatives', version: '1.0.0'},
      paths: {'/pets': {post: {
        requestBody: {content: {'application/json': {schema: {oneOf: [
          {type: 'object', properties: {kind: {oneOf: [{type: 'string'}, {type: 'number'}]}}},
          {type: 'string'}, {type: 'integer'}, {type: 'number'}, {type: 'boolean'}, {type: 'null'},
          {type: 'array', items: {type: 'string'}}, {type: 'object'}
        ]}}}},
        responses: {'204': {description: 'Accepted'}}
      }}}
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];

    expect(assessment.blockingFaults).toHaveSize(0);
    expect(assessment.dimensions.conditionality.level).toBe('Very high');
    expect(assessment.dimensions.conditionality.escalations).toContain('eight-alternatives');
    expect(assessment.dimensions.conditionality.escalations).toContain('nested-interacting-conditional-layers');
  });

  it('handles recursive allOf materialization and boolean unevaluatedProperties safely', () => {
    const document = {
      openapi: '3.1.0',
      info: {title: 'Recursive composition', version: '1.0.0'},
      paths: {'/nodes': {get: {responses: {'200': {content: {'application/json': {schema: {
        allOf: [{$ref: '#/components/schemas/A'}], unevaluatedProperties: false
      }}}}}}}},
      components: {schemas: {
        A: {allOf: [{$ref: '#/components/schemas/B'}]},
        B: {allOf: [{$ref: '#/components/schemas/A'}]}
      }}
    };
    const assessment = assessLoadedDocument(scope(document)).assessments[0];

    expect(assessment.blockingFaults).toHaveSize(0);
    expect(assessment.reasons.filter(reason => reason.code === 'cycle-navigation')).toHaveSize(1);
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
            servers: [{}, {}],
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
            callbacks: {changed: {}}
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

  it('covers malformed discriminators, version-specific conditionals, and role references', () => {
    const report = assessLoadedDocument(scope({
      openapi: '3.0.3',
      info: {title: 'Malformed shapes', version: '1.0.0'},
      paths: {
        '/invalid-discriminator': {
          post: {
            requestBody: {content: {'application/json': {schema: {discriminator: {}}}}},
            responses: {'204': {description: 'Accepted'}}
          }
        },
        '/broken-discriminator': {
          post: {
            requestBody: {content: {'application/json': {schema: {
              discriminator: {propertyName: 'kind', mapping: {missing: '#/components/schemas/Missing'}}
            }}}},
            responses: {'204': {description: 'Accepted'}}
          }
        },
        '/invalid-response': {
          get: {responses: {'200': null, '201': {content: 'invalid'}}}
        },
        '/conditional': {
          post: {
            requestBody: {content: {'application/json': {schema: {
              type: ['string', 'null'],
              dependencies: {
                creditCard: ['billingAddress'],
                nested: {type: 'object', properties: {address: {type: 'string'}}}
              }
            }}}},
            responses: {'204': {description: 'Accepted'}}
          }
        },
        '/roles': {
          post: {
            requestBody: {content: {'application/json': {schema: {
              type: 'object', properties: {id: {$ref: '#/components/schemas/ReadOnly'}}
            }}}},
            responses: {'200': {content: {'application/json': {schema: {
              type: 'object', properties: {secret: {$ref: '#/components/schemas/WriteOnly'}}
            }}}}}
          }
        }
      },
      components: {schemas: {
        ReadOnly: {type: 'string', readOnly: true},
        WriteOnly: {type: 'string', writeOnly: true}
      }}
    }));

    const invalidDiscriminator = report.assessments.find(assessment => assessment.identity.path === '/invalid-discriminator');
    const brokenDiscriminator = report.assessments.find(assessment => assessment.identity.path === '/broken-discriminator');
    const invalidResponse = report.assessments.find(assessment => assessment.identity.path === '/invalid-response');
    const conditional = report.assessments.find(assessment => assessment.identity.path === '/conditional');
    const roles = report.assessments.find(assessment => assessment.identity.path === '/roles');
    expect(invalidDiscriminator?.blockingFaults.some(reason => reason.code === 'invalid-discriminator')).toBeTrue();
    expect(brokenDiscriminator?.blockingFaults.some(reason => reason.code === 'broken-discriminator-mapping')).toBeTrue();
    expect(invalidResponse?.blockingFaults.map(reason => reason.code)).toEqual(['invalid-response', 'invalid-content']);
    expect(conditional?.blockingFaults.some(reason => reason.code === 'unsupported-schema-keyword')).toBeTrue();
    expect(conditional?.reasons.some(reason => reason.code === 'dependent-conditional-rule')).toBeTrue();
    expect(roles?.reasons.some(reason => reason.source.pointer.endsWith('/properties/id'))).toBeFalse();
    expect(roles?.reasons.some(reason => reason.source.pointer.endsWith('/properties/secret'))).toBeFalse();
  });

  it('keeps malformed containers and nested composition paths diagnosable', () => {
    const emptyPathsReport = assessLoadedDocument(scope({
      openapi: '3.1.0',
      info: {title: 'Missing paths', version: '1.0.0'},
      paths: null as unknown as Record<string, unknown>
    }));
    expect(emptyPathsReport.assessments).toHaveSize(0);

    const report = assessLoadedDocument(scope({
      openapi: '3.1.0',
      info: {title: 'Malformed containers', version: '1.0.0'},
      paths: {
        '/ignored': null,
        '/invalid': {
          get: {
            parameters: [
              {$ref: '#/components/parameters/Missing'},
              {name: 'content', in: 'query', content: 'invalid'},
              {name: 'schema', in: 'query', schema: 'invalid'}
            ],
            requestBody: {content: 'invalid'},
            responses: null,
            servers: [{variables: {region: {default: 'uk'}}}, {}],
            callbacks: {missing: {$ref: '#/components/callbacks/Missing'}, broken: null}
          }
        },
        '/responses': {
          get: {
            responses: {
              '200': {$ref: '#/components/responses/Missing'},
              '201': {$ref: '%'},
              '202': {content: {'application/json': {$ref: '#/components/schemas/Missing'}}},
              '203': {content: {'application/json': null}},
              '204': {headers: {Trace: {$ref: '#/components/headers/Missing'}}}
            }
          }
        },
        '/composition': {
          post: {
            requestBody: {content: {'application/json': {schema: {
              allOf: [
                null,
                {$ref: '#/components/schemas/Alias'},
                {enum: [1]},
                {minItems: 5}
              ],
              oneOf: [{type: 'string'}],
              dependencies: [],
              if: {properties: {kind: {const: 'a'}}},
              then: {required: ['value']},
              unevaluatedProperties: {type: 'string'}
            }}}},
            responses: {'204': {description: 'Accepted'}}
          }
        },
        '/contradiction': {
          post: {
            requestBody: {content: {'application/json': {schema: {
              allOf: [{enum: [1]}, {enum: [2]}, {minItems: 5}, {maxItems: 2}]
            }}}},
            responses: {'204': {description: 'Accepted'}}
          }
        }
      },
      components: {
        schemas: {
          Alias: {$ref: '#/components/schemas/Text'},
          Text: {type: 'string'}
        }
      }
    }));

    const invalid = report.assessments.find(item => item.identity.path === '/invalid');
    const responses = report.assessments.find(item => item.identity.path === '/responses');
    const contradiction = report.assessments.find(item => item.identity.path === '/contradiction');
    const invalidCodes = invalid?.blockingFaults.map(fault => fault.code) ?? [];
    ['unavailable-reference', 'invalid-schema', 'unsupported-request-body', 'invalid-responses', 'unavailable-callback']
      .forEach(code => expect(invalidCodes).toContain(code));
    const responseCodes = responses?.blockingFaults.map(fault => fault.code) ?? [];
    ['unavailable-reference', 'invalid-media-type'].forEach(code => expect(responseCodes).toContain(code));
    expect(contradiction?.blockingFaults.some(fault => fault.code === 'contradictory-composition')).toBeTrue();
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
