import { assessLoadedDocument } from './complexity-engine';
import {
  AssessmentScopeInput,
  ComplexityAssessmentReport,
  COMPLEXITY_MODEL_VERSION
} from './complexity.models';

type Document = Record<string, any>;

export interface CalibrationFixture {
  readonly id: string;
  readonly family: string;
  readonly title: string;
  readonly provenance: string;
  readonly method: string;
  readonly path: string;
  readonly document: Document;
  readonly resourceSet?: AssessmentScopeInput['resourceSet'];
}

export interface CalibrationFamily {
  readonly id: `S${number}`;
  readonly title: string;
  readonly fixtures: readonly CalibrationFixture[];
}

const sourceRevisions = {
  petstore: 'sample_openapi/petstore3.json (repository fixture)',
  uspto: 'sample_openapi/uspto.yaml (repository fixture)',
  uber: 'Mermade/openapi3-examples@9c2997e1a25919a8182080cc43a4db06d2dc775d/3.0/pass/OAI/uber.yaml',
  github: 'github/rest-api-description@d77b7dde24f7b3a52b3532b1337d4be8a60fb34d, API version 2022-11-28'
} as const;

export const CALIBRATION_SOURCE_REVISIONS = sourceRevisions;

function document(operation: Document, path = '/calibration', method = 'post'): Document {
  return {
    openapi: '3.1.0',
    info: {title: 'Operation contract complexity calibration', version: '1.0.0'},
    paths: {[path]: {[method]: operation}}
  };
}

function fixture(
  family: string,
  id: string,
  title: string,
  operation: Document,
  provenance = 'Synthetic calibration fixture',
  path = '/calibration',
  method = 'post',
  resourceSet?: AssessmentScopeInput['resourceSet']
): CalibrationFixture {
  const currentDocument = document(operation, path, method);
  return {id, family, title, provenance, method, path, document: currentDocument, resourceSet};
}

const scalar = {type: 'string'};
const response = {responses: {'204': {description: 'Done'}}};

const S0: CalibrationFamily = {
  id: 'S0',
  title: 'Baseline and one-variable surface burden',
  fixtures: [
    fixture('S0', 'S0-baseline', 'Bodyless baseline', response),
    fixture('S0', 'S0-optional-scalar', 'Optional scalar input', {
      parameters: [{name: 'filter', in: 'query', schema: scalar}],
      ...response
    }),
    fixture('S0', 'S0-required-enum', 'Required enum input', {
      parameters: [{name: 'status', in: 'query', required: true, schema: {type: 'string', enum: ['open', 'closed']}}],
      ...response
    }),
    fixture('S0', 'S0-schema-error', 'Schema-bearing error outcome', {
      parameters: [{name: 'status', in: 'query', required: true, schema: {type: 'string', enum: ['open', 'closed']}}],
      responses: {
        '204': {description: 'Done'},
        '400': {content: {'application/json': {schema: {type: 'object', properties: {message: scalar}}}}}
      }
    })
  ]
};

const S1: CalibrationFamily = {
  id: 'S1',
  title: 'Effective interaction surface',
  fixtures: [
    fixture('S1', 'S1-operation-parameter', 'Operation parameter', {
      parameters: [{name: 'limit', in: 'query', schema: scalar}], ...response
    }),
    fixture('S1', 'S1-inherited-parameter', 'Inherited path parameter', {
      responses: {'204': {description: 'Done'}}
    }),
    fixture('S1', 'S1-four-outcomes', 'Four response cases', {
      responses: {
        '200': {description: 'OK'}, '400': {description: 'Bad request'},
        '404': {description: 'Missing'}, default: {description: 'Other'}
      }
    }),
    fixture('S1', 'S1-response-header', 'Response header', {
      responses: {'200': {headers: {requestId: {schema: scalar}}, description: 'OK'}}
    }),
    fixture('S1', 'S1-shared-representation', 'Shared-shape representation', {
      responses: {'200': {content: {
        'application/json': {schema: {type: 'object', properties: {id: scalar}}},
        'application/vnd.api+json': {schema: {type: 'object', properties: {id: scalar}}}
      }}}
    }),
    fixture('S1', 'S1-distinct-representation', 'Distinct-shape representation', {
      responses: {'200': {content: {
        'application/json': {schema: {type: 'object', properties: {id: scalar}}},
        'text/plain': {schema: {type: 'object', properties: {name: scalar}}}
      }}}
    })
  ]
};

const S2: CalibrationFamily = {
  id: 'S2',
  title: 'Data shape structure and recursion',
  fixtures: [
    fixture('S2', 'S2-flat-fields', 'Six flat fields', {
      requestBody: {content: {'application/json': {schema: {type: 'object', properties: Object.fromEntries(
        ['one', 'two', 'three', 'four', 'five', 'six'].map(name => [name, scalar])
      )}}}}, responses: {'204': {description: 'Done'}}
    }),
    fixture('S2', 'S2-nested-fields', 'Nested fields', {
      requestBody: {content: {'application/json': {schema: {type: 'object', properties: {
        first: {type: 'object', properties: {second: {type: 'object', properties: {third: scalar}}}}
      }}}}}, responses: {'204': {description: 'Done'}}
    }),
    fixture('S2', 'S2-collection-map', 'Collection and map', {
      responses: {'200': {content: {'application/json': {schema: {
        type: 'object', additionalProperties: {type: 'array', items: {type: 'object', properties: {id: scalar}}}
      }}}}}
    }),
    fixture('S2', 'S2-recursive-node', 'Recursive node', {
      responses: {'200': {content: {'application/json': {schema: {$ref: '#/components/schemas/Node'}}}}}
    })
  ].map(entry => entry.id === 'S2-recursive-node'
    ? {...entry, document: {...entry.document, components: {schemas: {
      Node: {type: 'object', properties: {value: scalar, next: {$ref: '#/components/schemas/Node'}}}
    }}}}
    : entry)
};

const S3: CalibrationFamily = {
  id: 'S3',
  title: 'Conditionality and alternatives',
  fixtures: [
    fixture('S3', 'S3-optional-scalar', 'Optional unconstrained scalar', {
      parameters: [{name: 'filter', in: 'query', schema: scalar}], ...response
    }),
    fixture('S3', 'S3-required-scalar', 'Required scalar', {
      parameters: [{name: 'filter', in: 'query', required: true, schema: scalar}], ...response
    }),
    fixture('S3', 'S3-independent-constraints', 'Independent validation constraints', {
      parameters: [{name: 'filter', in: 'query', required: true, schema: {
        type: 'string', minLength: 2, maxLength: 10, pattern: '^[a-z]+$'
      }}], ...response
    }),
    fixture('S3', 'S3-four-alternatives', 'Four alternatives', {
      requestBody: {content: {'application/json': {schema: {oneOf: [scalar, {type: 'integer'}, {type: 'boolean'}, {type: 'number'}]}}}},
      ...response
    }),
    fixture('S3', 'S3-discriminated-alternatives', 'Discriminated interacting alternatives', {
      requestBody: {content: {'application/json': {schema: {
        oneOf: [
          {type: 'object', required: ['kind'], properties: {kind: {const: 'cat'}, name: scalar}},
          {type: 'object', required: ['kind'], properties: {kind: {const: 'dog'}, age: {type: 'integer'}}}
        ], discriminator: {propertyName: 'kind'}
      }}}}, ...response
    })
  ]
};

const S4: CalibrationFamily = {
  id: 'S4',
  title: 'Reference indirection and cycles',
  fixtures: [
    fixture('S4', 'S4-inline', 'Inline schema', {
      responses: {'200': {content: {'application/json': {schema: {type: 'object', properties: {id: scalar}}}}}}
    }),
    fixture('S4', 'S4-local-reference', 'Equivalent local reference', {
      responses: {'200': {content: {'application/json': {schema: {$ref: '#/components/schemas/Payload'}}}}}
    }),
    fixture('S4', 'S4-reference-chain', 'Two-step local reference', {
      responses: {'200': {content: {'application/json': {schema: {$ref: '#/components/schemas/First'}}}}}
    }),
    fixture('S4', 'S4-external-reference', 'Equivalent external reference', {
      responses: {'200': {content: {'application/json': {schema: {$ref: 'schemas.yaml#/components/schemas/Payload'}}}}}
    }, 'Synthetic calibration fixture with supplied external resource', '/calibration', 'post', [
      {sourceId: 'file:///calibration/openapi.yaml', baseUri: 'file:///calibration/openapi.yaml', document: {}}
    ]),
    fixture('S4', 'S4-recursive-cycle', 'Recursive cycle', {
      responses: {'200': {content: {'application/json': {schema: {$ref: '#/components/schemas/Node'}}}}}
    })
  ].map(entry => {
    const schemas = entry.id === 'S4-reference-chain'
      ? {First: {$ref: '#/components/schemas/Second'}, Second: {type: 'object', properties: {id: scalar}}}
      : entry.id === 'S4-recursive-cycle'
        ? {Node: {type: 'object', properties: {next: {$ref: '#/components/schemas/Node'}}}}
        : {Payload: {type: 'object', properties: {id: scalar}}};
    const current = entry.id === 'S4-external-reference'
      ? {...entry, resourceSet: [
        {sourceId: 'file:///calibration/openapi.yaml', baseUri: 'file:///calibration/openapi.yaml', document: entry.document},
        {sourceId: 'file:///calibration/schemas.yaml', baseUri: 'file:///calibration/schemas.yaml', document: {components: {schemas}}
        }
      ]}
      : entry;
    return {...current, document: {...current.document, components: {schemas}}};
  })
};

const S5: CalibrationFamily = {
  id: 'S5',
  title: 'Protocol obligations',
  fixtures: [
    fixture('S5', 'S5-no-security', 'No security', response),
    fixture('S5', 'S5-api-key', 'One API key', {
      security: [{apiKey: []}], ...response
    }),
    fixture('S5', 'S5-oauth-scope', 'OAuth scope and flow', {
      security: [{oauth: ['read']}], ...response
    }),
    fixture('S5', 'S5-security-or', 'Security alternatives', {
      security: [{apiKey: []}, {oauth: ['read']}], ...response
    }),
    fixture('S5', 'S5-security-and', 'Combined schemes', {
      security: [{apiKey: [], oauth: ['read']}], ...response
    }),
    fixture('S5', 'S5-callback', 'Callback obligation', {
      callbacks: {onEvent: {'{$request.body#/callbackUrl}': {post: response}}}, ...response
    })
  ].map(entry => ({...entry, document: {...entry.document, components: {
    securitySchemes: {
      apiKey: {type: 'apiKey', in: 'header', name: 'X-API-Key'},
      oauth: {type: 'oauth2', flows: {clientCredentials: {tokenUrl: 'https://example.test/token', scopes: {read: 'Read'}}}}
    }
  }}}))
};

const S6: CalibrationFamily = {
  id: 'S6',
  title: 'Documentation support',
  fixtures: [
    fixture('S6', 'S6-none', 'No guidance', {
      requestBody: {content: {'application/json': {schema: {type: 'object', properties: {id: scalar}}}}},
      responses: {'200': {content: {'application/json': {schema: {type: 'object', properties: {id: scalar}}}}}, '400': {}}
    }),
    fixture('S6', 'S6-descriptions', 'Descriptions only', {
      description: 'Send the identifier and handle failures.',
      requestBody: {description: 'The request payload', content: {'application/json': {schema: {type: 'object', properties: {id: scalar}}}}},
      responses: {'200': {description: 'Success', content: {'application/json': {schema: {type: 'object', properties: {id: scalar}}}}}, '400': {description: 'Bad'}}
    }),
    fixture('S6', 'S6-strong', 'Representative request, success, and error examples', {
      requestBody: {content: {'application/json': {schema: {type: 'object', properties: {id: scalar}}, example: {id: 'one'}}}},
      responses: {
        '200': {content: {'application/json': {schema: {type: 'object', properties: {id: scalar}}, example: {id: 'one'}}}},
        '400': {content: {'application/json': {schema: {type: 'string'}, example: 'bad'}}}
      }
    }),
    fixture('S6', 'S6-duplicate-examples', 'Duplicate examples do not add support', {
      requestBody: {content: {'application/json': {schema: {type: 'object', properties: {id: scalar}}, examples: {
        first: {value: {id: 'one'}}, duplicate: {value: {id: 'one'}}
      }}}},
      responses: {'200': {content: {'application/json': {schema: {type: 'object', properties: {id: scalar}}, example: {id: 'one'}}}}, '400': {description: 'Bad'}}
    })
  ]
};

const S7: CalibrationFamily = {
  id: 'S7',
  title: 'Assessment confidence',
  fixtures: [
    fixture('S7', 'S7-complete', 'Complete schema', {
      responses: {'200': {content: {'application/json': {schema: {type: 'object', properties: {id: scalar}}}}}}
    }),
    fixture('S7', 'S7-missing-schema', 'Missing representation schema', {
      responses: {'200': {content: {'application/json': {}}}}
    }),
    fixture('S7', 'S7-unresolved-reference', 'Unresolved local reference', {
      responses: {'200': {content: {'application/json': {schema: {$ref: '#/components/schemas/Missing'}}}}}
    }),
    fixture('S7', 'S7-unsupported-keyword', 'Unsupported schema keyword', {
      responses: {'200': {content: {'application/json': {schema: {type: 'string', unevaluatedItems: false}}}}}
    }),
    fixture('S7', 'S7-invalid-shape', 'Invalid shape', {
      responses: {'200': {content: {'application/json': {schema: {type: 12}}}}}
    })
  ]
};

const sharedRoleSchema = {type: 'object', properties: {id: scalar, name: scalar}};
const S8: CalibrationFamily = {
  id: 'S8',
  title: 'Role identity and reuse',
  fixtures: [
    fixture('S8', 'S8-response-reuse', 'Same schema reused in responses', {
      responses: {
        '200': {content: {'application/json': {schema: sharedRoleSchema}}},
        '206': {content: {'application/json': {schema: sharedRoleSchema}}}
      }
    }),
    fixture('S8', 'S8-request-response-reuse', 'Schema reused across roles', {
      requestBody: {content: {'application/json': {schema: sharedRoleSchema}}},
      responses: {'200': {content: {'application/json': {schema: sharedRoleSchema}}}}
    }),
    fixture('S8', 'S8-representations', 'Two representations share a shape', {
      responses: {'200': {content: {
        'application/json': {schema: sharedRoleSchema}, 'application/xml': {schema: sharedRoleSchema}
      }}}
    }),
    fixture('S8', 'S8-distinct-shapes', 'Two representations use distinct shapes', {
      responses: {'200': {content: {
        'application/json': {schema: sharedRoleSchema}, 'text/plain': {schema: scalar}
      }}}
    })
  ]
};

const S9: CalibrationFamily = {
  id: 'S9',
  title: 'Cross-dimension boundaries',
  fixtures: [
    fixture('S9', 'S9-broad-shallow', 'Broad but shallow surface', {
      parameters: Array.from({length: 8}, (_, index) => ({name: `param${index}`, in: 'query', schema: scalar})), ...response
    }),
    fixture('S9', 'S9-narrow-deep', 'Narrow but recursive shape', {
      responses: {'200': {content: {'application/json': {schema: {$ref: '#/components/schemas/Node'}}}}}
    }),
    fixture('S9', 'S9-protocol', 'Simple structure with protocol burden', {
      security: [{one: [], two: [], three: []}],
      callbacks: {onEvent: {'{$request.body#/callbackUrl}': {post: response}}}, ...response
    }),
    fixture('S9', 'S9-all-high', 'All five dimensions high', {
      parameters: Array.from({length: 8}, (_, index) => ({name: `param${index}`, in: 'query', required: true, schema: scalar})),
      requestBody: {required: true, content: {'application/json': {schema: {type: 'object', required: Array.from({length: 16}, (_, index) => `field${index}`), properties: Object.fromEntries(
        Array.from({length: 16}, (_, index) => [`field${index}`, {$ref: `#/components/schemas/Scalar${index}`}])
      )}}}},
      security: [{one: [], two: [], three: []}],
      responses: Object.fromEntries(Array.from({length: 8}, (_, index) => [String(200 + index), {description: 'Outcome'}]))
    }),
    fixture('S9', 'S9-all-high-strong-docs', 'All-high with strong support', {
      parameters: Array.from({length: 8}, (_, index) => ({name: `param${index}`, in: 'query', required: true, schema: scalar})),
      requestBody: {required: true, content: {'application/json': {schema: {type: 'object', required: Array.from({length: 16}, (_, index) => `field${index}`), properties: Object.fromEntries(
        Array.from({length: 16}, (_, index) => [`field${index}`, {$ref: `#/components/schemas/Scalar${index}`}])
      )}, example: Object.fromEntries(Array.from({length: 16}, (_, index) => [`field${index}`, `value-${index}`]))}}},
      security: [{one: [], two: [], three: []}],
      responses: {
        '200': {content: {'application/json': {schema: {type: 'object', properties: {id: scalar}}, example: {id: 'ok'}}}},
        '400': {content: {'text/plain': {schema: scalar, example: 'bad'}}},
        '404': {description: 'Missing'}
      }
    })
  ].map(entry => entry.id.startsWith('S9-narrow')
    ? {...entry, document: {...entry.document, components: {schemas: {
      Node: {type: 'object', properties: {value: scalar, next: {$ref: '#/components/schemas/Node'}}}
    }}}}
    : entry).map(entry => entry.id === 'S9-protocol' || entry.id.startsWith('S9-all-high')
    ? {...entry, document: {...entry.document, components: {securitySchemes: {
      one: {type: 'apiKey', in: 'header', name: 'X-One'}, two: {type: 'apiKey', in: 'header', name: 'X-Two'}, three: {type: 'apiKey', in: 'header', name: 'X-Three'}
    }, ...(entry.document.components ?? {})}}}
    : entry).map(entry => entry.id.startsWith('S9-all-high')
    ? {...entry, document: {...entry.document, components: {
      ...(entry.document.components ?? {}),
      schemas: Object.fromEntries(Array.from({length: 16}, (_, index) => [`Scalar${index}`, scalar]))
    }}}
    : entry)
};

export const CALIBRATION_FAMILIES: readonly CalibrationFamily[] = [S0, S1, S2, S3, S4, S5, S6, S7, S8, S9];

function realFixture(
  id: string,
  title: string,
  operation: Document,
  path: string,
  provenance: string,
  method = 'get'
): CalibrationFixture {
  return fixture('real', id, title, operation, provenance, path, method);
}

export const CALIBRATION_REAL_ANCHORS: readonly CalibrationFixture[] = [
  realFixture('R1', 'Petstore logout', {responses: {'200': {description: 'Logged out'}, default: {description: 'Unexpected'}}}, '/user/logout', sourceRevisions.petstore),
  realFixture('R2', 'Petstore inventory', {responses: {'200': {content: {'application/json': {schema: {type: 'object', additionalProperties: {type: 'integer'}}}}}, default: {description: 'Unexpected'}}, security: [{apiKey: []}]}, '/store/inventory', sourceRevisions.petstore),
  realFixture('R3', 'USPTO root', {
    responses: {
      '200': {content: {'application/json': {schema: {type: 'object', properties: {
        datasets: {type: 'array', items: {type: 'string'}}
      }}}}},
      default: {description: 'Unexpected'}
    }
  }, '/', sourceRevisions.uspto),
  realFixture('R4', 'USPTO fields', {parameters: [
    {name: 'dataset', in: 'path', required: true, schema: scalar}, {name: 'version', in: 'path', required: true, schema: scalar}
  ], responses: {'200': {content: {'application/json': {schema: {type: 'array', items: {type: 'string'}}}}}, '404': {description: 'Missing'}}}, '/{dataset}/{version}/fields', sourceRevisions.uspto),
  realFixture('R5', 'Petstore find by status', {parameters: [{name: 'status', in: 'query', required: true, schema: {type: 'string', enum: ['available', 'pending', 'sold']}}], responses: {
    '200': {content: {'application/json': {schema: {type: 'array', items: {type: 'object', properties: {id: scalar, name: scalar}}}}, 'application/xml': {schema: {type: 'array', items: {type: 'object', properties: {id: scalar, name: scalar}}}}}},
    '400': {description: 'Invalid'}, default: {description: 'Unexpected'}
  }, security: [{apiKey: []}]}, '/pet/findByStatus', sourceRevisions.petstore),
  realFixture('R6', 'Petstore place order', {requestBody: {content: {
    'application/json': {schema: {type: 'object', properties: {id: scalar, petId: scalar, quantity: scalar}}},
    'application/xml': {schema: {type: 'object', properties: {id: scalar, petId: scalar, quantity: scalar}}},
    'application/x-www-form-urlencoded': {schema: {type: 'object', properties: {id: scalar, petId: scalar, quantity: scalar}}}
  }}, responses: {'200': {content: {'application/json': {schema: {type: 'object', properties: {id: scalar, status: scalar}}}}}, '400': {description: 'Invalid'}, '422': {description: 'Unprocessable'}, default: {description: 'Unexpected'}}}, '/store/order', sourceRevisions.petstore, 'post'),
  realFixture('R7', 'Petstore upload image', {parameters: [
    {name: 'petId', in: 'path', required: true, schema: {type: 'integer'}}, {name: 'additionalMetadata', in: 'query', schema: scalar}
  ], requestBody: {content: {'application/octet-stream': {schema: {type: 'string', format: 'binary'}}}}, responses: {
    '200': {content: {'application/json': {schema: {type: 'object', properties: {code: scalar, message: scalar}}}}}, '400': {description: 'Invalid'}, '404': {description: 'Missing'}, default: {description: 'Unexpected'}
  }, security: [{apiKey: []}]}, '/pet/{petId}/uploadImage', sourceRevisions.petstore, 'post'),
  realFixture('R8', 'Petstore update pet', {requestBody: {required: true, content: {
    'application/json': {schema: {type: 'object', properties: {id: scalar, name: scalar, status: scalar}}},
    'application/xml': {schema: {type: 'object', properties: {id: scalar, name: scalar, status: scalar}}},
    'application/x-www-form-urlencoded': {schema: {type: 'object', properties: {id: scalar, name: scalar, status: scalar}}}
  }}, responses: {'200': {content: {'application/json': {schema: {type: 'object', properties: {id: scalar, name: scalar, status: scalar}}}, 'application/xml': {schema: {type: 'object', properties: {id: scalar, name: scalar, status: scalar}}}}}, '400': {description: 'Invalid'}, '404': {description: 'Missing'}, '422': {description: 'Invalid'}, default: {description: 'Unexpected'}}, security: [{apiKey: []}]}, '/pet', sourceRevisions.petstore, 'put'),
  realFixture('R9', 'USPTO records with prose query language', {
    'x-prose-defined-language': 'Lucene mini-language',
    parameters: [
      {name: 'dataset', in: 'path', required: true, schema: scalar}, {name: 'version', in: 'path', required: true, schema: scalar}
    ],
    requestBody: {content: {'application/x-www-form-urlencoded': {schema: {type: 'object', properties: {q: scalar, range: scalar}}}}},
    responses: {'200': {content: {'application/json': {schema: {type: 'object', additionalProperties: {type: 'array', items: scalar}}}}}, '400': {description: 'Invalid'}, default: {description: 'Unexpected'}}
  }, '/{dataset}/{version}/records', sourceRevisions.uspto, 'post')
];

export const CALIBRATION_UBER_ANCHORS: readonly CalibrationFixture[] = [
  realFixture('U1', 'Uber profile', {responses: {'200': {content: {'application/json': {schema: {type: 'object', properties: {id: scalar}}}}}, 'default': {description: 'Error'}}}, '/me', sourceRevisions.uber),
  realFixture('U2', 'Uber products', {parameters: [{name: 'latitude', in: 'query', required: true, schema: {type: 'number'}}, {name: 'longitude', in: 'query', required: true, schema: {type: 'number'}}], responses: {'200': {content: {'application/json': {schema: {type: 'array', items: {type: 'object', properties: {displayName: scalar, price: scalar}}}}}}, 'default': {description: 'Error'}}, security: [{apiKey: []}]}, '/products', sourceRevisions.uber),
  realFixture('U3', 'Uber price estimates', {parameters: [
    {name: 'start_latitude', in: 'query', required: true, schema: {type: 'number'}}, {name: 'start_longitude', in: 'query', required: true, schema: {type: 'number'}},
    {name: 'end_latitude', in: 'query', required: true, schema: {type: 'number'}}, {name: 'end_longitude', in: 'query', required: true, schema: {type: 'number'}}
  ], responses: {'200': {content: {'application/json': {schema: {type: 'array', items: {type: 'object', properties: {price: scalar, duration: scalar, distance: scalar}}}}}}, 'default': {description: 'Error'}}}, '/estimates/price', sourceRevisions.uber)
];

export const CALIBRATION_GITHUB_ANCHORS: readonly CalibrationFixture[] = [
  realFixture('G1', 'GitHub meta', {responses: {'200': {content: {'application/json': {schema: {type: 'object', properties: {verifiable_password_authentication: {type: 'boolean'}}}}}}, '404': {description: 'Missing'}}}, '/meta', sourceRevisions.github),
  realFixture('G2', 'GitHub repository', {parameters: [{name: 'owner', in: 'path', required: true, schema: scalar}, {name: 'repo', in: 'path', required: true, schema: scalar}], responses: {'200': {content: {'application/json': {schema: {type: 'object', properties: {id: scalar, name: scalar, owner: {type: 'object', properties: {login: scalar}}}}}}}, '301': {description: 'Moved'}, '403': {description: 'Forbidden'}, '404': {description: 'Missing'}}}, '/repos/{owner}/{repo}', sourceRevisions.github),
  realFixture('G3', 'GitHub workflow dispatch', {parameters: [{name: 'owner', in: 'path', required: true, schema: scalar}, {name: 'repo', in: 'path', required: true, schema: scalar}, {name: 'workflow_id', in: 'path', required: true, schema: scalar}], requestBody: {content: {'application/json': {schema: {type: 'object', required: ['ref'], properties: {ref: scalar, inputs: {type: 'object', additionalProperties: scalar}}}}}}, responses: {'204': {description: 'Dispatched'}, '422': {description: 'Invalid'}}}, '/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', sourceRevisions.github, 'post'),
  realFixture('G4', 'GitHub create pull request', {parameters: [{name: 'owner', in: 'path', required: true, schema: scalar}, {name: 'repo', in: 'path', required: true, schema: scalar}], requestBody: {content: {'application/json': {schema: {type: 'object', required: ['title', 'head', 'base'], properties: {title: scalar, head: scalar, base: scalar, body: scalar}}}}}, responses: {'201': {headers: {location: {schema: scalar}}, content: {'application/json': {schema: {type: 'object', properties: {id: scalar, title: scalar}}}}}, '403': {description: 'Forbidden'}, '422': {description: 'Invalid'}}}, '/repos/{owner}/{repo}/pulls', sourceRevisions.github, 'post'),
  realFixture('G5', 'GitHub get content', {parameters: [{name: 'owner', in: 'path', required: true, schema: scalar}, {name: 'repo', in: 'path', required: true, schema: scalar}, {name: 'path', in: 'path', required: true, schema: scalar}], responses: {'200': {content: {'application/json': {schema: {oneOf: [{type: 'object', properties: {name: scalar}}, {type: 'array', items: {type: 'object', properties: {name: scalar}}}]}}}}, '302': {description: 'Redirect'}, '404': {description: 'Missing'}, '500': {description: 'Error'}}}, '/repos/{owner}/{repo}/contents/{path}', sourceRevisions.github),
  realFixture('G6', 'GitHub list issues', {parameters: Array.from({length: 15}, (_, index) => ({name: `parameter${index}`, in: 'query', schema: scalar})), responses: {'200': {headers: {link: {schema: scalar}}, content: {'application/json': {schema: {type: 'array', items: {type: 'object', properties: {id: scalar, title: scalar}}}}}}, '301': {description: 'Moved'}, '400': {description: 'Invalid'}, '422': {description: 'Invalid'}}}, '/repos/{owner}/{repo}/issues', sourceRevisions.github),
  realFixture('G7', 'GitHub create repository', {
    parameters: [
      {name: 'name', in: 'query', required: true, schema: scalar},
      {name: 'private', in: 'query', schema: {type: 'boolean'}}
    ],
    requestBody: {content: {'application/json': {schema: {type: 'object', properties: {
      name: scalar, description: scalar, homepage: scalar,
      has_issues: {type: 'boolean'}, has_projects: {type: 'boolean'}, has_wiki: {type: 'boolean'}
    }}}}},
    responses: {
      '201': {content: {'application/json': {schema: {type: 'object', properties: {
        id: scalar, name: scalar, owner: {type: 'object', properties: {login: scalar}}
      }}}}},
      '400': {description: 'Invalid'}, '401': {description: 'Unauthorised'},
      '403': {description: 'Forbidden'}, '422': {description: 'Invalid'}, default: {description: 'Error'}
    }
  }, '/user/repos', sourceRevisions.github, 'post'),
  realFixture('G8', 'GitHub list Dependabot alerts', {parameters: Array.from({length: 19}, (_, index) => ({name: `parameter${index}`, in: 'query', schema: scalar})), responses: Object.fromEntries(['200', '304', '400', '401', '403', '404'].map(status => [status, {description: status}]))}, '/orgs/{org}/dependabot/alerts', sourceRevisions.github)
].map(entry => entry.id === 'G5'
  ? {...entry, document: {...entry.document, paths: {...entry.document.paths, [entry.path]: {
    [entry.method]: {...entry.document.paths[entry.path][entry.method], 'x-multi-segment': true}
  }}}}
  : entry);

export const ALL_CALIBRATION_FIXTURES: readonly CalibrationFixture[] = [
  ...CALIBRATION_FAMILIES.flatMap(family => family.fixtures),
  ...CALIBRATION_REAL_ANCHORS,
  ...CALIBRATION_UBER_ANCHORS,
  ...CALIBRATION_GITHUB_ANCHORS
];

export function assessmentScope(fixture: CalibrationFixture, scopeId = `calibration:${fixture.id}`): AssessmentScopeInput {
  const sourceId = `file:///calibration/${fixture.id}.json`;
  const resources = fixture.resourceSet ?? [{sourceId, baseUri: sourceId, document: fixture.document}];
  return {
    scopeId,
    sourceId,
    baseUri: sourceId,
    document: fixture.document,
    resourceSet: resources.length === 0 ? [{sourceId, baseUri: sourceId, document: fixture.document}] : resources
  };
}

export function assessCalibrationFixture(fixture: CalibrationFixture): ComplexityAssessmentReport {
  return assessLoadedDocument(assessmentScope(fixture));
}

export function serializeComplexityReport(report: ComplexityAssessmentReport): string {
  const canonicalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((result, key) => {
      result[key] = canonicalize((value as Record<string, unknown>)[key]);
      return result;
    }, {});
  };
  return JSON.stringify(canonicalize(report));
}

export const CALIBRATION_MODEL = COMPLEXITY_MODEL_VERSION;
