import {
  AssessmentReason,
  AssessmentScopeInput,
  ComplexityAssessmentReport,
  ComplexityBand,
  ComplexityDimension,
  ComplexityDistribution,
  COMPLEXITY_CAPABILITY_MANIFEST,
  COMPLEXITY_MODEL_VERSION,
  ConsumerRole,
  DimensionAssessment,
  DocumentationSupport,
  OperationAssessment,
  OperationIdentity
} from './complexity.models';

type AnyRecord = Record<string, any>;
type DimensionLevel = Exclude<ComplexityBand, 'Unknown'>;
type AssessmentValue = boolean | number | string | readonly string[];
type OpenApiSchemaVersion = '3.0' | '3.1';

const HTTP_METHODS = ['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace'];
const DIMENSIONS: ComplexityDimension[] = [
  'interactionSurface',
  'dataShape',
  'conditionality',
  'indirection',
  'protocolObligations'
];

const BAND_ORDER: DimensionLevel[] = ['Low', 'Moderate', 'High', 'Very high'];

const LEVEL_THRESHOLDS: Record<ComplexityDimension, {moderate: number; high: number; veryHigh: number}> = {
  interactionSurface: {moderate: 4, high: 8, veryHigh: 15},
  dataShape: {moderate: 6, high: 16, veryHigh: 40},
  conditionality: {moderate: 4, high: 9, veryHigh: 20},
  indirection: {moderate: 3, high: 7, veryHigh: 15},
  protocolObligations: {moderate: 3, high: 7, veryHigh: 13}
};

const CATEGORY_ORDER: Record<string, number> = {
  interactionSurface: 0,
  dataShape: 1,
  conditionality: 2,
  indirection: 3,
  protocolObligations: 4,
  assessment: 5
};

const COMMON_SUPPORTED_SCHEMA_KEYS = [
  'type', 'title', 'description', 'format', 'default', 'example', 'examples',
  'deprecated', 'readOnly', 'writeOnly', 'enum', 'properties', 'required', 'items',
  'additionalProperties', 'minProperties', 'maxProperties', 'minItems', 'maxItems',
  'uniqueItems', 'minLength', 'maxLength', 'pattern', 'minimum', 'maximum',
  'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'xml', 'externalDocs',
  'discriminator'
];
const SUPPORTED_SCHEMA_KEYS: Record<OpenApiSchemaVersion, Set<string>> = {
  '3.0': new Set([...COMMON_SUPPORTED_SCHEMA_KEYS, 'nullable', 'dependencies']),
  '3.1': new Set([
    ...COMMON_SUPPORTED_SCHEMA_KEYS,
    '$schema', 'const', 'prefixItems', 'contentMediaType', 'contentEncoding',
    'dependentRequired', 'dependentSchemas', 'unevaluatedProperties'
  ])
};

export function assessLoadedDocument(scope: AssessmentScopeInput): ComplexityAssessmentReport {
  const document = scope.document as AnyRecord;
  const version = typeof document.openapi === 'string' ? document.openapi : '';

  if (!/^3\.[01](?:\.\d+)?$/.test(version)) {
    return createUnavailableReport(scope, reason(
      'unsupported-openapi-version',
      'assessment',
      scope,
      '/',
      {version}
    ));
  }

  const operations = listOperations(document.paths);
  if (operations.length === 0) {
    return createUnavailableReport(scope, reason(
      'no-identifiable-operations',
      'assessment',
      scope,
      '/paths',
      {}
    ));
  }

  const assessments = operations.map(operation => assessOperation(scope, document, operation));
  const distribution = createDistribution(assessments);
  const knownAssessments = assessments.filter(assessment => assessment.finalBand !== 'Unknown');
  const needsAssessment = assessments
    .filter(assessment => assessment.finalBand === 'Unknown')
    .map(assessment => assessment.identity);

  const hotspots = createHotspots(knownAssessments);

  return {
    modelVersion: COMPLEXITY_MODEL_VERSION,
    capabilityManifest: COMPLEXITY_CAPABILITY_MANIFEST,
    availability: 'Available',
    scopeId: scope.scopeId,
    sourceId: scope.sourceId,
    baseUri: scope.baseUri,
    assessments,
    distribution,
    coverage: {
      totalOperations: assessments.length,
      knownOperations: knownAssessments.length,
      incompleteOperations: needsAssessment.length
    },
    hotspots,
    needsAssessment
  };
}

function assessOperation(
  scope: AssessmentScopeInput,
  document: AnyRecord,
  operationInfo: OperationInfo
): OperationAssessment {
  const dimensions = createCollectors();
  const blockingFaults: AssessmentReason[] = [];
  const warnings: AssessmentReason[] = [];
  const operationPointer = `/paths/${escapeJsonPointer(operationInfo.path)}/${operationInfo.method}`;
  const operation = operationInfo.operation;
  const identity: OperationIdentity = {
    key: `${scope.scopeId}:${operationInfo.method}:${operationInfo.path}`,
    scopeId: scope.scopeId,
    sourceId: scope.sourceId,
    path: operationInfo.path,
    method: operationInfo.method,
    ...(typeof operation.operationId === 'string' ? {operationId: operation.operationId} : {})
  };
  const context: AssessmentContext = {
    scope,
    dimensions,
    blockingFaults,
    warnings,
    roles: {
      request: createRoleState(),
      response: createRoleState()
    },
    protocolEvidence: new Set<string>(),
    callbackTargets: new Set<string>(),
    openApiVersion: typeof document.openapi === 'string' && document.openapi.startsWith('3.1') ? '3.1' : '3.0',
    conditionalNesting: 0,
    maximumConditionalNesting: 0
  };

  if (operation['x-multi-segment'] !== undefined) {
    addBlocking(context, 'known-contract-affecting-extension', 'assessment', `${operationPointer}/x-multi-segment`, undefined, {extension: 'x-multi-segment'});
  }

  collectParameters(
    context,
    operationInfo.pathItem,
    operation,
    operationPointer,
    scope.sourceId
  );
  collectRequestBody(context, operation.requestBody, `${operationPointer}/requestBody`, scope.sourceId);
  collectResponses(context, operation.responses, `${operationPointer}/responses`, scope.sourceId);
  collectProtocol(context, document, operation, operationPointer, scope.sourceId);
  if (context.maximumConditionalNesting >= 2) {
    setMinimum(context, 'conditionality', 'Very high', 'nested-interacting-conditional-layers');
  }
  emitCycleSignals(context);

  const dimensionAssessments = Object.fromEntries(DIMENSIONS.map(dimension => {
    const collector = dimensions[dimension];
    return [dimension, {
      units: collector.units,
      level: classifyDimension(dimension, collector.units, collector.minimum),
      reasons: sortReasons(collector.reasons),
      escalations: [...collector.escalations].sort((left, right) => left.localeCompare(right))
    } satisfies DimensionAssessment];
  })) as unknown as Record<ComplexityDimension, DimensionAssessment>;

  const allReasons = sortReasons(DIMENSIONS.flatMap(dimension => dimensionAssessments[dimension].reasons)
    .concat(blockingFaults.filter(fault => fault.category === 'assessment'), warnings));
  const incomplete = blockingFaults.length > 0;
  const rawBand = incomplete ? 'Unknown' : aggregateRawBand(dimensionAssessments);
  const documentationSupport = createDocumentationSupport();
  const finalBand = rawBand;
  const dominantDimension = incomplete ? undefined : findDominantDimension(dimensionAssessments);

  let confidence: OperationAssessment['confidence'] = 'Complete';
  if (incomplete) {
    confidence = 'Incomplete';
  } else if (warnings.length > 0) {
    confidence = 'Qualified';
  }

  return {
    identity,
    modelVersion: COMPLEXITY_MODEL_VERSION,
    confidence,
    dimensions: dimensionAssessments,
    rawBand,
    documentationSupport,
    finalBand,
    dominantDimension,
    supportingDimensions: dominantDimension
      ? DIMENSIONS.filter(dimension => dimension !== dominantDimension && dimensionAssessments[dimension].level !== 'Low')
      : [],
    reasons: allReasons,
    blockingFaults: sortReasons(blockingFaults),
    warnings: sortReasons(warnings)
  };
}

interface OperationInfo {
  readonly path: string;
  readonly method: string;
  readonly pathItem: AnyRecord;
  readonly operation: AnyRecord;
}

function listOperations(paths: unknown): OperationInfo[] {
  if (!paths || typeof paths !== 'object') {
    return [];
  }

  const pathEntries = Object.entries(paths as AnyRecord).sort(([left], [right]) => left.localeCompare(right));
  return pathEntries.flatMap(([path, pathItem]) => {
    if (!pathItem || typeof pathItem !== 'object') {
      return [];
    }

    return HTTP_METHODS
      .filter(method => pathItem[method] && typeof pathItem[method] === 'object')
      .map(method => ({path, method, pathItem: pathItem as AnyRecord, operation: pathItem[method] as AnyRecord}));
  });
}

interface DimensionCollector {
  units: number;
  minimum: DimensionLevel;
  reasons: AssessmentReason[];
  escalations: Set<string>;
  evidenceKeys: Set<string>;
}

type Collectors = Record<ComplexityDimension, DimensionCollector>;

interface AssessmentContext {
  readonly scope: AssessmentScopeInput;
  readonly dimensions: Collectors;
  readonly blockingFaults: AssessmentReason[];
  readonly warnings: AssessmentReason[];
  readonly roles: Record<ConsumerRole, RoleState>;
  readonly protocolEvidence: Set<string>;
  readonly callbackTargets: Set<string>;
  readonly openApiVersion: OpenApiSchemaVersion;
  conditionalNesting: number;
  maximumConditionalNesting: number;
}

interface RoleState {
  readonly seenSchemaKeys: Set<string>;
  readonly activeReferences: string[];
  readonly cycleGroups: Set<string>;
  readonly seenReferenceTargets: Set<string>;
  readonly seenExternalBoundaries: Set<string>;
  readonly referenceGraph: Map<string, Set<string>>;
  readonly cycleEdges: CycleEdge[];
  readonly activeCompositionReferences: Set<string>;
}

interface CycleEdge {
  readonly source: string;
  readonly target: string;
  readonly pointer: string;
  readonly sourceId: string;
}

interface ResolvedReference {
  readonly target: AnyRecord;
  readonly sourceId: string;
  readonly pointer: string;
  readonly canonicalKey: string;
  readonly externalBoundary: boolean;
}

function createRoleState(): RoleState {
  return {
    seenSchemaKeys: new Set<string>(),
    activeReferences: [],
    cycleGroups: new Set<string>(),
    seenReferenceTargets: new Set<string>(),
    seenExternalBoundaries: new Set<string>(),
    referenceGraph: new Map<string, Set<string>>(),
    cycleEdges: [],
    activeCompositionReferences: new Set<string>()
  };
}

function createCollectors(): Collectors {
  return Object.fromEntries(DIMENSIONS.map(dimension => [dimension, {
    units: 0,
    minimum: 'Low',
    reasons: [],
    escalations: new Set<string>(),
    evidenceKeys: new Set<string>()
  }])) as Collectors;
}

function collectParameters(
  context: AssessmentContext,
  pathItem: AnyRecord,
  operation: AnyRecord,
  pointer: string,
  sourceId: string,
  role: ConsumerRole = 'request'
) {
  const parameters = new Map<string, {parameter: AnyRecord; pointer: string; sourceId: string}>();
  const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
  const operationParameters = Array.isArray(operation.parameters) ? operation.parameters : [];

  [...pathParameters, ...operationParameters].forEach((parameter, index) => {
    const parameterPointer = `${pointer}/parameters/${index}`;
    let parameterSourceId = sourceId;
    if (isReference(parameter)) {
      const resolved = resolveReference(context, parameter.$ref, parameterSourceId, parameterPointer, role, 0);
      if (!resolved) return;
      parameter = resolved.target;
      parameterSourceId = resolved.sourceId;
    }
    if (!parameter || typeof parameter !== 'object' || typeof parameter.name !== 'string' || typeof parameter.in !== 'string') {
      addBlocking(context, 'invalid-parameter', 'assessment', parameterPointer, 'request', {});
      return;
    }
    parameters.set(`${parameter.in}:${parameter.name}`, {parameter, pointer: parameterPointer, sourceId: parameterSourceId});
  });

  [...parameters.values()]
    .sort((left, right) => `${left.parameter.in}:${left.parameter.name}`.localeCompare(`${right.parameter.in}:${right.parameter.name}`))
    .forEach(({parameter, pointer: parameterPointer, sourceId: parameterSourceId}) => {
      addUnit(context, 'interactionSurface', 1, 'parameter', role, parameterPointer, {name: parameter.name, in: parameter.in}, parameterSourceId);
      addUnit(context, 'conditionality', 1, parameter.required ? 'requiredness-obligation' : 'optionality-obligation', role, parameterPointer, {required: !!parameter.required}, parameterSourceId);
      if (isNonDefaultSerialization(parameter)) {
        addUnit(context, 'conditionality', 1, 'non-default-serialization', role, parameterPointer, {style: parameter.style ?? '', explode: !!parameter.explode}, parameterSourceId);
      }

      if (parameter.content) {
        collectContent(context, parameter.content, `${parameterPointer}/content`, role, parameterSourceId);
        return;
      }
      if (parameter.schema) {
        collectSchema(context, parameter.schema, `${parameterPointer}/schema`, role, 0, parameterSourceId);
        return;
      }
      addBlocking(context, 'unsupported-parameter-shape', 'assessment', parameterPointer, 'request', {name: parameter.name});
    });

}

function collectRequestBody(
  context: AssessmentContext,
  requestBody: unknown,
  pointer: string,
  sourceId: string,
  role: ConsumerRole = 'request'
) {
  if (!requestBody) {
    return;
  }
  if (isReference(requestBody)) {
    const resolved = resolveReference(context, requestBody.$ref, sourceId, pointer, role, 0);
    if (!resolved) return;
    requestBody = resolved.target;
    sourceId = resolved.sourceId;
  }
  const requestBodyObject = requestBody as AnyRecord;
  if (typeof requestBody !== 'object' || !requestBodyObject.content || typeof requestBodyObject.content !== 'object') {
    addBlocking(context, 'unsupported-request-body', 'assessment', pointer, role, {});
    return;
  }

  collectContent(context, requestBodyObject.content, `${pointer}/content`, role, sourceId);
  addUnit(
    context,
    'conditionality',
    1,
    requestBodyObject.required ? 'requiredness-obligation' : 'optionality-obligation',
    role,
    pointer,
    {required: !!requestBodyObject.required},
    sourceId
  );
}

function collectResponses(
  context: AssessmentContext,
  responses: unknown,
  pointer: string,
  sourceId: string,
  role: ConsumerRole = 'response'
) {
  if (!responses || typeof responses !== 'object') {
    addBlocking(context, 'invalid-responses', 'assessment', pointer, role, {});
    return;
  }

  Object.entries(responses as AnyRecord)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([status, response], index) => {
      const responsePointer = `${pointer}/${escapeJsonPointer(status)}`;
      addUnit(context, 'interactionSurface', 1, 'response-case', role, responsePointer, {status}, sourceId);
      let responseSourceId = sourceId;
      if (isReference(response)) {
        const resolved = resolveReference(context, response.$ref, responseSourceId, responsePointer, role, 0);
        if (!resolved) return;
        response = resolved.target;
        responseSourceId = resolved.sourceId;
      }
      if (!response || typeof response !== 'object') {
        addBlocking(context, 'invalid-response', 'assessment', responsePointer, role, {status});
        return;
      }

      Object.keys(response.headers ?? {}).sort((left, right) => left.localeCompare(right)).forEach(header => {
        const headerPointer = `${responsePointer}/headers/${escapeJsonPointer(header)}`;
        addUnit(context, 'interactionSurface', 1, 'response-header', role, headerPointer, {name: header}, responseSourceId);
        if (isReference(response.headers[header])) {
          const resolved = resolveReference(context, response.headers[header].$ref, responseSourceId, headerPointer, role, 0);
          if (resolved?.target.schema) {
            collectSchema(context, resolved.target.schema, `${headerPointer}/schema`, role, 0, resolved.sourceId);
          } else if (resolved) {
            collectSchema(context, resolved.target, `${headerPointer}/schema`, role, 0, resolved.sourceId);
          }
        } else if (response.headers[header]?.schema) {
          collectSchema(context, response.headers[header].schema, `${headerPointer}/schema`, role, 0, responseSourceId);
        }
      });

      if (response.content) {
        collectContent(context, response.content, `${responsePointer}/content`, role, responseSourceId);
      }
      if (response.links) {
      Object.keys(response.links).sort((left, right) => left.localeCompare(right)).forEach(link => {
          addUnit(context, 'protocolObligations', 1, 'response-link', role, `${responsePointer}/links/${escapeJsonPointer(link)}`, {name: link}, sourceId);
        });
      }
    });
}

function collectContent(context: AssessmentContext, content: unknown, pointer: string, role: ConsumerRole, sourceId: string) {
  if (!content || typeof content !== 'object') {
    addBlocking(context, 'invalid-content', 'assessment', pointer, role, {});
    return;
  }

  Object.entries(content as AnyRecord)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([mediaType, media]) => {
      const mediaPointer = `${pointer}/${escapeJsonPointer(mediaType)}`;
      let mediaSourceId = sourceId;
      addUnit(context, 'interactionSurface', 1, role === 'request' ? 'request-representation' : 'response-representation', role, mediaPointer, {mediaType}, sourceId);
      if (isReference(media)) {
        const resolved = resolveReference(context, media.$ref, mediaSourceId, mediaPointer, role, 0);
        if (!resolved) return;
        media = resolved.target;
        mediaSourceId = resolved.sourceId;
      }
      if (!media || typeof media !== 'object') {
        addBlocking(context, 'invalid-media-type', 'assessment', mediaPointer, role, {mediaType});
        return;
      }
      if (media.schema) {
        collectSchema(context, media.schema, `${mediaPointer}/schema`, role, 0, mediaSourceId);
      } else {
        addBlocking(context, 'missing-media-schema', 'assessment', mediaPointer, role, {mediaType});
      }
    });
}

function collectSchema(
  context: AssessmentContext,
  schema: unknown,
  pointer: string,
  role: ConsumerRole,
  depth: number,
  sourceId: string,
  referenceDepth = 0
) {
  if (!schema || typeof schema !== 'object') {
    addBlocking(context, 'invalid-schema', 'assessment', pointer, role, {});
    return;
  }
  if (isReference(schema)) {
    const resolved = resolveReference(context, schema.$ref, sourceId, pointer, role, referenceDepth);
    if (!resolved) return;
    const state = context.roles[role];
    if (state.activeReferences.includes(resolved.canonicalKey)) {
      recordStructuralDepth(context, depth);
    } else if (!state.seenSchemaKeys.has(`ref:${resolved.canonicalKey}`)) {
      state.seenSchemaKeys.add(`ref:${resolved.canonicalKey}`);
      state.activeReferences.push(resolved.canonicalKey);
      if (isReference(resolved.target)) {
        collectSchema(context, resolved.target, resolved.pointer, role, depth, resolved.sourceId, referenceDepth + 1);
      } else {
        collectSchemaNode(context, resolved.target, resolved.pointer, role, depth, resolved.sourceId, referenceDepth + 1, resolved.canonicalKey);
      }
      state.activeReferences.pop();
    } else {
      recordStructuralDepth(context, depth);
    }
    return;
  }
  const schemaObject = schema as AnyRecord;
  const inlineKey = `inline:${stableValue(schemaObject)}`;
  if (context.roles[role].seenSchemaKeys.has(inlineKey)) {
    recordStructuralDepth(context, depth);
    return;
  }
  context.roles[role].seenSchemaKeys.add(inlineKey);
  collectSchemaNode(context, schemaObject, pointer, role, depth, sourceId, referenceDepth);
}

function collectSchemaNode(
  context: AssessmentContext,
  schemaObject: AnyRecord,
  pointer: string,
  role: ConsumerRole,
  depth: number,
  sourceId: string,
  referenceDepth: number,
  canonicalKey?: string
) {
  const ownerKey = canonicalKey ?? `inline:${stableValue(schemaObject)}`;

  Object.keys(schemaObject)
    .filter(key => !isSupportedSchemaKey(context.openApiVersion, key) && !key.startsWith('x-'))
    .sort((left, right) => left.localeCompare(right))
    .forEach(key => addBlocking(context, 'unsupported-schema-keyword', 'assessment', `${pointer}/${escapeJsonPointer(key)}`, role, {keyword: key}, sourceId));

  const effectiveSchema = collectComposition(context, schemaObject, pointer, role, depth, sourceId, referenceDepth);
  const effective = effectiveSchema ?? schemaObject;

  if (context.openApiVersion === '3.0' && Array.isArray(schemaObject.type)) {
    addBlocking(context, 'unsupported-schema-keyword', 'assessment', `${pointer}/type`, role, {keyword: 'type'}, sourceId);
  }

  if (effective.readOnly && role === 'request' || effective.writeOnly && role === 'response') {
    return;
  }

  if (effective['x-multi-segment'] !== undefined) {
    addBlocking(context, 'known-contract-affecting-extension', 'assessment', `${pointer}/x-multi-segment`, role, {extension: 'x-multi-segment'}, sourceId);
  }

  if (effective.nullable || (Array.isArray(effective.type) && effective.type.includes('null'))) {
    addUnit(context, 'conditionality', 1, 'nullable-value', role, pointer, {}, sourceId);
  }

  if (effective.discriminator) {
    addUnit(context, 'conditionality', 1, 'discriminator-selector', role, `${pointer}/discriminator`, {}, sourceId);
    assessDiscriminator(context, effective.discriminator, pointer, role, sourceId, schemaObject, effective);
  }

  const validationFamilies = new Set<string>();
  if (effective.minimum !== undefined || effective.maximum !== undefined || effective.exclusiveMinimum !== undefined || effective.exclusiveMaximum !== undefined) {
    validationFamilies.add('range');
  }
  if (effective.multipleOf !== undefined) validationFamilies.add('multiple');
  if (effective.minLength !== undefined || effective.maxLength !== undefined) validationFamilies.add('length');
  if (effective.pattern !== undefined) validationFamilies.add('pattern');
  if (effective.minItems !== undefined || effective.maxItems !== undefined || effective.uniqueItems !== undefined) validationFamilies.add('items');
  if (effective.minProperties !== undefined || effective.maxProperties !== undefined) validationFamilies.add('properties');
  if (effective.enum !== undefined || effective.const !== undefined) validationFamilies.add('choice');
  validationFamilies.forEach(family => addUnit(
    context,
    'conditionality',
    1,
    'validation-rule-family',
    role,
    pointer,
    {family},
    sourceId,
    `${ownerKey}|validation|${family}`
  ));

  const type = Array.isArray(effective.type) ? effective.type.find((value: unknown) => value !== 'null') : effective.type;
  if (type === 'object' || effective.properties || effective.additionalProperties !== undefined) {
    const properties = effective.properties && typeof effective.properties === 'object' ? effective.properties : {};
    const required = new Set<string>(Array.isArray(effective.required) ? effective.required : []);
    Object.keys(properties).sort((left, right) => left.localeCompare(right)).forEach(property => {
      const propertySchema = properties[property];
      if (isReadOnlyForRole(context, propertySchema, role, sourceId)) {
        return;
      }
      const propertyPointer = `${pointer}/properties/${escapeJsonPointer(property)}`;
      addUnit(context, 'dataShape', 1, 'field', role, propertyPointer, {name: property}, sourceId, `${ownerKey}|field|${property}`);
      addUnit(context, 'dataShape', 1, 'nesting-transition', role, propertyPointer, {depth: depth + 1}, sourceId, `${ownerKey}|nesting|${property}`);
      addUnit(context, 'conditionality', 1, required.has(property) ? 'requiredness-obligation' : 'optionality-obligation', role, propertyPointer, {required: required.has(property)}, sourceId, `${ownerKey}|requiredness|${property}`);
      collectSchema(context, propertySchema, propertyPointer, role, depth + 1, sourceId, referenceDepth);
    });
    if (effective.additionalProperties && typeof effective.additionalProperties === 'object') {
      addUnit(context, 'dataShape', 2, 'map-boundary', role, `${pointer}/additionalProperties`, {}, sourceId, `${ownerKey}|map`);
      addUnit(context, 'dataShape', 1, 'nesting-transition', role, `${pointer}/additionalProperties`, {depth: depth + 1}, sourceId, `${ownerKey}|map-nesting`);
      collectSchema(context, effective.additionalProperties, `${pointer}/additionalProperties`, role, depth + 1, sourceId, referenceDepth);
    } else if (effective.additionalProperties === true) {
      addBlocking(context, 'unsupported-untyped-map', 'assessment', `${pointer}/additionalProperties`, role, {}, sourceId);
    }
  }

  if (type === 'array' || effective.items !== undefined || effective.prefixItems !== undefined) {
    addUnit(context, 'dataShape', 2, 'collection-boundary', role, pointer, {kind: 'array'}, sourceId, `${ownerKey}|array`);
    if (Array.isArray(effective.prefixItems)) {
      effective.prefixItems.forEach((item: unknown, index: number) => {
        addUnit(context, 'dataShape', 1, 'tuple-position', role, `${pointer}/prefixItems/${index}`, {index}, sourceId, `${ownerKey}|tuple|${index}`);
        addUnit(context, 'dataShape', 1, 'nesting-transition', role, `${pointer}/prefixItems/${index}`, {depth: depth + 1}, sourceId, `${ownerKey}|tuple-nesting|${index}`);
        collectSchema(context, item, `${pointer}/prefixItems/${index}`, role, depth + 1, sourceId, referenceDepth);
      });
    } else if (effective.items) {
      addUnit(context, 'dataShape', 1, 'nesting-transition', role, `${pointer}/items`, {depth: depth + 1}, sourceId, `${ownerKey}|items`);
      collectSchema(context, effective.items, `${pointer}/items`, role, depth + 1, sourceId, referenceDepth);
    }
  }

  if (depth >= 8) {
    setMinimum(context, 'dataShape', 'High', 'structural-depth-high');
  }
  if (depth >= 12) {
    setMinimum(context, 'dataShape', 'Very high', 'structural-depth-very-high');
  }
}

function recordStructuralDepth(context: AssessmentContext, depth: number) {
  if (depth >= 8) setMinimum(context, 'dataShape', 'High', 'structural-depth-high');
  if (depth >= 12) setMinimum(context, 'dataShape', 'Very high', 'structural-depth-very-high');
}

function emitCycleSignals(context: AssessmentContext) {
  (Object.keys(context.roles) as ConsumerRole[]).forEach(role => {
    const state = context.roles[role];
    const components = stronglyConnectedComponents(state.referenceGraph);
    components.forEach(component => {
      const members = new Set(component);
      const cycle = component.length > 1 || state.cycleEdges.some(edge => edge.source === edge.target && edge.source === component[0]);
      if (!cycle) return;
      const group = [...component].sort((left, right) => left.localeCompare(right)).join('|');
      if (state.cycleGroups.has(group)) return;
      const edge = state.cycleEdges
        .filter(candidate => members.has(candidate.source) && members.has(candidate.target))
        .sort((left, right) => left.pointer.localeCompare(right.pointer))[0];
      if (!edge) return;
      state.cycleGroups.add(group);
      addUnit(context, 'dataShape', 1, 'recursive-structure', role, edge.pointer, {group}, edge.sourceId);
      setMinimum(context, 'dataShape', 'High', 'recursive-structure');
      addUnit(context, 'indirection', 3, 'cycle-navigation', role, edge.pointer, {group}, edge.sourceId);
      setMinimum(context, 'indirection', 'High', 'recursive-cycle');
    });
  });
}

function stronglyConnectedComponents(graph: Map<string, Set<string>>): string[][] {
  let index = 0;
  const indexes = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  const visit = (node: string) => {
    indexes.set(node, index);
    lowLinks.set(node, index);
    index++;
    stack.push(node);
    onStack.add(node);
    [...(graph.get(node) ?? [])].sort((left, right) => left.localeCompare(right)).forEach(next => {
      if (!indexes.has(next)) {
        visit(next);
        lowLinks.set(node, Math.min(lowLinks.get(node)!, lowLinks.get(next)!));
      } else if (onStack.has(next)) {
        lowLinks.set(node, Math.min(lowLinks.get(node)!, indexes.get(next)!));
      }
    });
    if (lowLinks.get(node) !== indexes.get(node)) return;
    const component: string[] = [];
    let current: string;
    do {
      current = stack.pop()!;
      onStack.delete(current);
      component.push(current);
    } while (current !== node);
    components.push(component.sort((left, right) => left.localeCompare(right)));
  };

  [...graph.keys()].sort((left, right) => left.localeCompare(right)).forEach(node => {
    if (!indexes.has(node)) visit(node);
  });
  return components;
}

function isSupportedSchemaKey(version: OpenApiSchemaVersion, key: string): boolean {
  if (SUPPORTED_SCHEMA_KEYS[version].has(key)) return true;
  if (['allOf', 'oneOf', 'anyOf'].includes(key)) return true;
  return version === '3.1' && ['not', 'if', 'then', 'else'].includes(key);
}

function assessDiscriminator(
  context: AssessmentContext,
  discriminator: unknown,
  pointer: string,
  role: ConsumerRole,
  sourceId: string,
  originalSchema: AnyRecord,
  effectiveSchema: AnyRecord
) {
  if (!discriminator || typeof discriminator !== 'object' || typeof (discriminator as AnyRecord).propertyName !== 'string') {
    addBlocking(context, 'invalid-discriminator', 'assessment', `${pointer}/discriminator`, role, {}, sourceId);
    return;
  }
  const mapping = (discriminator as AnyRecord).mapping;
  if (mapping === undefined) return;
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    addBlocking(context, 'invalid-discriminator-mapping', 'assessment', `${pointer}/discriminator/mapping`, role, {}, sourceId);
    return;
  }

  const alternatives = [
    ...(Array.isArray(originalSchema.oneOf) ? originalSchema.oneOf : []),
    ...(Array.isArray(originalSchema.anyOf) ? originalSchema.anyOf : []),
    ...(Array.isArray(effectiveSchema.oneOf) ? effectiveSchema.oneOf : []),
    ...(Array.isArray(effectiveSchema.anyOf) ? effectiveSchema.anyOf : [])
  ];
  const hasViableAlternative = alternatives.some(value => isViableAlternative(context, value, sourceId));
  Object.entries(mapping as AnyRecord).sort(([left], [right]) => left.localeCompare(right)).forEach(([key, target]) => {
    const mappingPointer = `${pointer}/discriminator/mapping/${escapeJsonPointer(key)}`;
    const targetAvailable = typeof target === 'string' && !!resolveRawSchemaReference(context, target, sourceId);
    if (targetAvailable) return;
    const values = {key, target: typeof target === 'string' ? target : ''};
    if (hasViableAlternative) {
      addWarning(context, 'broken-discriminator-mapping', 'assessment', mappingPointer, role, values, sourceId);
    } else {
      addBlocking(context, 'broken-discriminator-mapping', 'assessment', mappingPointer, role, values, sourceId);
    }
  });
}

function isViableAlternative(context: AssessmentContext, value: unknown, sourceId: string): boolean {
  if (!value || typeof value !== 'object') return false;
  if (isReference(value)) return !!resolveRawSchemaReference(context, value.$ref, sourceId);
  return true;
}

function collectComposition(
  context: AssessmentContext,
  schema: AnyRecord,
  pointer: string,
  role: ConsumerRole,
  depth: number,
  sourceId: string,
  referenceDepth: number
): AnyRecord | undefined {
  let effective: AnyRecord | undefined;
  if (Array.isArray(schema.allOf)) {
    effective = {...schema};
    delete effective.allOf;
    schema.allOf.forEach((branch: unknown, index: number) => {
      const branchPointer = `${pointer}/allOf/${index}`;
      addUnit(context, 'indirection', 1, 'composition-edge', role, branchPointer, {kind: 'allOf', index}, sourceId);
      const merged = materializeCompositionBranch(context, branch, branchPointer, role, depth, sourceId, referenceDepth);
      if (merged) {
        if (schemasContradict(effective as AnyRecord, merged)) {
          addBlocking(context, 'contradictory-composition', 'assessment', branchPointer, role, {kind: 'allOf'}, sourceId);
        }
        effective = mergeSchemas(effective as AnyRecord, merged);
      } else {
        collectSchema(context, branch, branchPointer, role, depth, sourceId, referenceDepth);
      }
    });
  }

  const current = effective ?? schema;
  ['oneOf', 'anyOf'].forEach(keyword => {
    if (!Array.isArray(current[keyword])) return;
    const branches = current[keyword] as unknown[];
    const extraUnits = keyword === 'oneOf' ? 2 : 3;
    context.conditionalNesting++;
    context.maximumConditionalNesting = Math.max(context.maximumConditionalNesting, context.conditionalNesting);
    branches.forEach((branch, branchIndex) => {
      if (branchIndex > 0) {
        addUnit(context, 'conditionality', extraUnits, 'alternative-branch', role, `${pointer}/${keyword}/${branchIndex}`, {kind: keyword, index: branchIndex}, sourceId);
        addUnit(context, 'indirection', 1, 'composition-edge', role, `${pointer}/${keyword}/${branchIndex}`, {kind: keyword, index: branchIndex}, sourceId);
      }
      collectSchema(context, branch, `${pointer}/${keyword}/${branchIndex}`, role, depth, sourceId, referenceDepth);
    });
    context.conditionalNesting--;
    if (branches.length > 0) {
      setMinimum(context, 'conditionality', 'Moderate', `${keyword}-alternative`);
      if (branches.length >= 4) setMinimum(context, 'conditionality', 'High', 'four-alternatives');
      if (branches.length >= 8) setMinimum(context, 'conditionality', 'Very high', 'eight-alternatives');
    }
  });

  ['not', 'if', 'then', 'else', 'dependencies', 'dependentRequired', 'dependentSchemas', 'unevaluatedProperties'].forEach(keyword => {
    if (current[keyword] === undefined) return;
    if (!isSupportedSchemaKey(context.openApiVersion, keyword)) return;
    context.conditionalNesting++;
    context.maximumConditionalNesting = Math.max(context.maximumConditionalNesting, context.conditionalNesting);
    if (keyword === 'dependencies' || keyword === 'dependentRequired' || keyword === 'dependentSchemas') {
      if (current[keyword] && typeof current[keyword] === 'object' && !Array.isArray(current[keyword])) {
        Object.keys(current[keyword]).sort((left, right) => left.localeCompare(right)).forEach(key => {
          const dependentPointer = `${pointer}/${keyword}/${escapeJsonPointer(key)}`;
          addUnit(context, 'conditionality', 3, 'dependent-conditional-rule', role, dependentPointer, {keyword, property: key}, sourceId);
          if (keyword === 'dependentSchemas' || (keyword === 'dependencies' && current[keyword][key] && typeof current[keyword][key] === 'object' && !Array.isArray(current[keyword][key]))) {
            collectSchema(context, current[keyword][key], dependentPointer, role, depth, sourceId, referenceDepth);
          }
        });
      } else {
        addUnit(context, 'conditionality', 3, 'dependent-conditional-rule', role, `${pointer}/${keyword}`, {keyword}, sourceId);
      }
    } else {
      addUnit(context, 'conditionality', 3, 'dependent-conditional-rule', role, `${pointer}/${keyword}`, {keyword}, sourceId);
      if (keyword === 'unevaluatedProperties') {
        if (current[keyword] && typeof current[keyword] === 'object') {
          collectSchema(context, current[keyword], `${pointer}/${keyword}`, role, depth, sourceId, referenceDepth);
        }
      } else if (keyword === 'if' || keyword === 'then' || keyword === 'else' || keyword === 'not') {
        collectSchema(context, current[keyword], `${pointer}/${keyword}`, role, depth, sourceId, referenceDepth);
      } else if (current[keyword] && typeof current[keyword] === 'object') {
      Object.keys(current[keyword]).sort((left, right) => left.localeCompare(right)).forEach(key => collectSchema(context, current[keyword][key], `${pointer}/${keyword}/${escapeJsonPointer(key)}`, role, depth, sourceId, referenceDepth));
      }
    }
    context.conditionalNesting--;
    setMinimum(context, 'conditionality', 'High', 'dependent-conditional-rule');
  });

  if (effective) {
    ['oneOf', 'anyOf', 'not', 'if', 'then', 'else', 'dependentSchemas', 'unevaluatedProperties'].forEach(key => delete effective![key]);
    return effective;
  }
  return undefined;
}

function mergeInlineObject(value: unknown): AnyRecord | undefined {
  if (!value || typeof value !== 'object' || isReference(value)) return undefined;
  const object = value as AnyRecord;
  if (object.oneOf !== undefined || object.anyOf !== undefined) return undefined;
  if (!object.properties || typeof object.properties !== 'object') return {...object};
  return {...object, properties: {...object.properties}};
}

function materializeCompositionBranch(
  context: AssessmentContext,
  value: unknown,
  pointer: string,
  role: ConsumerRole,
  depth: number,
  sourceId: string,
  referenceDepth: number
): AnyRecord | undefined {
  if (isReference(value)) {
    const resolved = resolveReference(context, value.$ref, sourceId, pointer, role, referenceDepth);
    if (!resolved) return undefined;
    const active = context.roles[role].activeCompositionReferences;
    if (active.has(resolved.canonicalKey)) return undefined;
    active.add(resolved.canonicalKey);
    const referenceStack = context.roles[role].activeReferences;
    referenceStack.push(resolved.canonicalKey);
    try {
      if (isReference(resolved.target)) {
        return materializeCompositionBranch(context, resolved.target, resolved.pointer, role, depth, resolved.sourceId, referenceDepth + 1);
      }
      return materializeCompositionObject(context, resolved.target, resolved.pointer, role, depth, resolved.sourceId, referenceDepth + 1);
    } finally {
      referenceStack.pop();
      active.delete(resolved.canonicalKey);
    }
  }
  return materializeCompositionObject(context, value, pointer, role, depth, sourceId, referenceDepth);
}

function materializeCompositionObject(
  context: AssessmentContext,
  value: unknown,
  pointer: string,
  role: ConsumerRole,
  depth: number,
  sourceId: string,
  referenceDepth: number
): AnyRecord | undefined {
  const object = mergeInlineObject(value);
  if (!object) return undefined;
  if (!Array.isArray(object.allOf)) return object;
  const effective = {...object};
  delete effective.allOf;
  object.allOf.forEach((branch: unknown, index: number) => {
    const branchPointer = `${pointer}/allOf/${index}`;
    addUnit(context, 'indirection', 1, 'composition-edge', role, branchPointer, {kind: 'allOf', index}, sourceId);
    const merged = materializeCompositionBranch(context, branch, branchPointer, role, depth, sourceId, referenceDepth);
    if (merged) Object.assign(effective, mergeSchemas(effective, merged));
  });
  return effective;
}

function mergeSchemas(left: AnyRecord, right: AnyRecord): AnyRecord {
  const properties = {...(left.properties ?? {}), ...(right.properties ?? {})};
  const required = [...new Set([...(Array.isArray(left.required) ? left.required : []), ...(Array.isArray(right.required) ? right.required : [])])].sort((a, b) => a.localeCompare(b));
  return {
    ...left,
    ...right,
    ...(Object.keys(properties).length > 0 ? {properties} : {}),
    ...(required.length > 0 ? {required} : {})
  };
}

function schemasContradict(left: AnyRecord, right: AnyRecord): boolean {
  const leftTypes = schemaTypes(left);
  const rightTypes = schemaTypes(right);
  if (leftTypes && rightTypes && ![...leftTypes].some(type => rightTypes.has(type))) return true;
  if (left.const !== undefined && right.const !== undefined && !Object.is(left.const, right.const)) return true;
  if (left.const !== undefined && Array.isArray(right.enum) && !right.enum.some((value: unknown) => Object.is(value, left.const))) return true;
  if (right.const !== undefined && Array.isArray(left.enum) && !left.enum.some((value: unknown) => Object.is(value, right.const))) return true;
  if (Array.isArray(left.enum) && Array.isArray(right.enum)
    && !left.enum.some((value: unknown) => right.enum.some((candidate: unknown) => Object.is(candidate, value)))) return true;
  if (boundsContradict(left, right, 'minimum', 'maximum')
    || boundsContradict(left, right, 'minLength', 'maxLength')
    || boundsContradict(left, right, 'minItems', 'maxItems')
    || boundsContradict(left, right, 'minProperties', 'maxProperties')) return true;
  const leftProperties = left.properties && typeof left.properties === 'object' ? left.properties : {};
  const rightProperties = right.properties && typeof right.properties === 'object' ? right.properties : {};
  return Object.keys(leftProperties).some(property => {
    const leftProperty = leftProperties[property] as AnyRecord;
    const rightProperty = rightProperties[property] as AnyRecord | undefined;
    if (!rightProperty || typeof leftProperty !== 'object' || typeof rightProperty !== 'object') return false;
    return schemasContradict(leftProperty, rightProperty);
  });
}

function boundsContradict(left: AnyRecord, right: AnyRecord, minimum: string, maximum: string): boolean {
  const lower = Math.max(
    typeof left[minimum] === 'number' ? left[minimum] : Number.NEGATIVE_INFINITY,
    typeof right[minimum] === 'number' ? right[minimum] : Number.NEGATIVE_INFINITY
  );
  const upper = Math.min(
    typeof left[maximum] === 'number' ? left[maximum] : Number.POSITIVE_INFINITY,
    typeof right[maximum] === 'number' ? right[maximum] : Number.POSITIVE_INFINITY
  );
  return lower > upper;
}

function schemaTypes(schema: AnyRecord): Set<string> | undefined {
  if (schema.type === undefined) return undefined;
  const values = Array.isArray(schema.type) ? schema.type : [schema.type];
  return new Set(values.filter((value): value is string => typeof value === 'string' && value !== 'null'));
}

function collectProtocol(context: AssessmentContext, document: AnyRecord, operation: AnyRecord, pointer: string, sourceId: string) {
  const security = operation.security === undefined ? document.security : operation.security;
  if (Array.isArray(security)) {
    security.forEach((requirement: unknown, alternative: number) => {
      if (!requirement || typeof requirement !== 'object') return;
      const schemes = Object.entries(requirement as AnyRecord).sort(([left], [right]) => left.localeCompare(right));
      if (schemes.length === 0 && security.length > 1) {
        addProtocolUnit(context, 1, 'anonymous-auth-choice', `${pointer}/security/${alternative}`, {alternative}, sourceId);
      }
      if (alternative > 0) addProtocolUnit(context, 1, 'security-or-alternative', `${pointer}/security/${alternative}`, {alternative}, sourceId);
      if (schemes.length >= 3) setMinimum(context, 'protocolObligations', 'High', 'three-required-security-schemes');
      schemes.forEach(([name, scopes], index) => {
        addProtocolUnit(context, 1, 'security-scheme', `${pointer}/security/${alternative}/${escapeJsonPointer(name)}`, {name}, sourceId, `scheme:${name}`);
        if (index > 0) addProtocolUnit(context, 1, 'security-and-scheme', `${pointer}/security/${alternative}/${escapeJsonPointer(name)}`, {name}, sourceId);
        const scopeValues = Array.isArray(scopes) ? scopes : [];
        scopeValues.forEach(scopeName => addProtocolUnit(context, 1, 'security-scope', `${pointer}/security/${alternative}/${escapeJsonPointer(name)}`, {name, scope: String(scopeName)}, sourceId, `scope:${name}:${String(scopeName)}`));
        const securityScheme = document.components && typeof document.components === 'object'
          ? (document.components as AnyRecord).securitySchemes?.[name] as AnyRecord | undefined
          : undefined;
        if (securityScheme?.flows && typeof securityScheme.flows === 'object') {
          Object.keys(securityScheme.flows).sort((left, right) => left.localeCompare(right)).forEach(flow => addProtocolUnit(context, 1, 'security-flow', `${pointer}/security/${alternative}/${escapeJsonPointer(name)}`, {name, flow}, sourceId, `flow:${name}:${flow}`));
        }
      });
    });
  }

  if (Array.isArray(operation.servers)) {
    operation.servers.forEach((server: unknown, index: number) => {
      if (index > 0) addProtocolUnit(context, 1, 'server-alternative', `${pointer}/servers/${index}`, {index}, sourceId);
      const serverObject = server as AnyRecord;
      if (server && typeof server === 'object' && serverObject.variables) {
        Object.keys(serverObject.variables).sort((left, right) => left.localeCompare(right)).forEach(variable => addProtocolUnit(context, 1, 'server-variable', `${pointer}/servers/${index}/variables/${escapeJsonPointer(variable)}`, {variable}, sourceId));
      }
    });
  }
  if (operation.callbacks) {
    Object.keys(operation.callbacks).sort((left, right) => left.localeCompare(right)).forEach(callback => {
      const callbackPointer = `${pointer}/callbacks/${escapeJsonPointer(callback)}`;
      const callbackValue = operation.callbacks[callback];
      if (isReference(callbackValue)) {
        const resolved = resolveReference(context, callbackValue.$ref, sourceId, callbackPointer, 'request', 0);
        if (!resolved) return;
        collectCallback(context, resolved.target, resolved.canonicalKey, callbackPointer, resolved.sourceId);
      } else {
        collectCallback(context, callbackValue, `inline-callback:${callbackPointer}`, callbackPointer, sourceId);
      }
    });
  }
}

function collectCallback(
  context: AssessmentContext,
  callback: unknown,
  callbackKey: string,
  pointer: string,
  sourceId: string
) {
  if (context.callbackTargets.has(callbackKey)) return;
  context.callbackTargets.add(callbackKey);
  addProtocolUnit(context, 4, 'callback-operation', pointer, {target: callbackKey}, sourceId, `callback:${callbackKey}`);
  setMinimum(context, 'protocolObligations', 'High', 'callback-obligation');
  if (!callback || typeof callback !== 'object') {
    addBlocking(context, 'unavailable-callback', 'assessment', pointer, undefined, {target: callbackKey}, sourceId);
    return;
  }

  Object.entries(callback as AnyRecord).sort(([left], [right]) => left.localeCompare(right)).forEach(([expression, pathItem]) => {
    if (!pathItem || typeof pathItem !== 'object') {
      addBlocking(context, 'invalid-callback', 'assessment', `${pointer}/${escapeJsonPointer(expression)}`, undefined, {}, sourceId);
      return;
    }
    const callbackPath = `${pointer}/${escapeJsonPointer(expression)}`;
    HTTP_METHODS.filter(method => pathItem[method] && typeof pathItem[method] === 'object').forEach(method => {
      const operation = pathItem[method] as AnyRecord;
      const operationPointer = `${callbackPath}/${method}`;
      collectParameters(context, pathItem as AnyRecord, operation, operationPointer, sourceId, 'response');
      collectRequestBody(context, operation.requestBody, `${operationPointer}/requestBody`, sourceId, 'response');
      collectResponses(context, operation.responses, `${operationPointer}/responses`, sourceId, 'request');
      collectProtocol(context, {}, operation, operationPointer, sourceId);
    });
  });
}

function addProtocolUnit(
  context: AssessmentContext,
  units: number,
  code: string,
  pointer: string,
  values: Record<string, AssessmentValue>,
  sourceId: string,
  evidenceKey?: string
) {
  const key = evidenceKey ? `${code}:${evidenceKey}` : undefined;
  if (key && context.protocolEvidence.has(key)) return;
  if (key) context.protocolEvidence.add(key);
  addUnit(context, 'protocolObligations', units, code, undefined, pointer, values, sourceId);
}

function resolveReference(
  context: AssessmentContext,
  reference: string,
  fromSourceId: string,
  pointer: string,
  role: ConsumerRole,
  referenceDepth: number
): ResolvedReference | undefined {
  const fromResource = context.scope.resourceSet.find(entry => entry.sourceId === fromSourceId);
  const fromUri = canonicalDocumentUri(fromResource?.baseUri ?? fromSourceId, context.scope.baseUri);
  const hashIndex = reference.indexOf('#');
  const uriPart = hashIndex >= 0 ? reference.slice(0, hashIndex) : reference;
  const fragment = hashIndex >= 0 ? reference.slice(hashIndex + 1) : '';
  let targetUri: string;
  try {
    targetUri = canonicalDocumentUri(uriPart || fromUri, fromUri);
  } catch {
    addBlocking(context, 'unavailable-reference', 'assessment', pointer, role, {reference}, fromSourceId);
    return undefined;
  }
  const resource = context.scope.resourceSet.find(entry => {
    try {
      return canonicalDocumentUri(entry.sourceId, entry.baseUri) === targetUri
        || canonicalDocumentUri(entry.baseUri, entry.baseUri) === targetUri;
    } catch {
      return entry.sourceId === targetUri || entry.baseUri === targetUri;
    }
  });
  if (!resource) {
    addBlocking(context, 'unavailable-reference', 'assessment', pointer, role, {reference, target: targetUri}, fromSourceId);
    return undefined;
  }

  const pointerTokens = decodeReferencePointer(fragment);
  const target = pointerTokens.reduce<unknown>((current, token) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as AnyRecord)[token];
  }, resource.document);
  if (!target || typeof target !== 'object') {
    addBlocking(context, 'unavailable-reference', 'assessment', pointer, role, {reference, target: targetUri, jsonPointer: fragment}, fromSourceId);
    return undefined;
  }

  const normalizedPointer = pointerTokens.length === 0 ? '' : `/${pointerTokens.map(escapeJsonPointer).join('/')}`;
  const canonicalKey = `${targetUri}#${normalizedPointer}`;
  const state = context.roles[role];
  const sourceKey = state.activeReferences[state.activeReferences.length - 1];
  if (sourceKey) {
    if (!state.referenceGraph.has(sourceKey)) state.referenceGraph.set(sourceKey, new Set<string>());
    state.referenceGraph.get(sourceKey)!.add(canonicalKey);
    if (!state.referenceGraph.has(canonicalKey)) state.referenceGraph.set(canonicalKey, new Set<string>());
    state.cycleEdges.push({source: sourceKey, target: canonicalKey, pointer, sourceId: fromSourceId});
  }
  const externalBoundary = targetUri !== fromUri;
  if (externalBoundary) {
    const boundaryKey = `${fromUri}->${targetUri}`;
    if (!state.seenExternalBoundaries.has(boundaryKey)) {
      state.seenExternalBoundaries.add(boundaryKey);
      addUnit(context, 'indirection', 2, 'external-document-boundary', role, pointer, {from: fromUri, to: targetUri}, fromSourceId);
    }
  }
  if (!state.seenReferenceTargets.has(canonicalKey)) {
    state.seenReferenceTargets.add(canonicalKey);
    addUnit(context, 'indirection', 1, 'reference-target', role, pointer, {target: canonicalKey}, fromSourceId);
    if (referenceDepth + 1 > 1) {
      addUnit(context, 'indirection', 1, 'reference-chain-hop', role, pointer, {depth: referenceDepth + 1, target: canonicalKey}, fromSourceId);
    }
  }
  if (referenceDepth + 1 >= 6) setMinimum(context, 'indirection', 'High', 'reference-chain-depth-high');
  if (referenceDepth + 1 >= 10) setMinimum(context, 'indirection', 'Very high', 'reference-chain-depth-very-high');

  return {
    target: target as AnyRecord,
    sourceId: resource.sourceId,
    pointer: normalizedPointer || '/',
    canonicalKey,
    externalBoundary: targetUri !== fromUri
  };
}

function canonicalDocumentUri(value: string, baseUri: string): string {
  const uri = new URL(value, baseUri).href;
  const normalized = new URL(uri);
  normalized.hash = '';
  return normalized.href;
}

function decodeReferencePointer(fragment: string): string[] {
  if (!fragment) return [];
  let decoded: string;
  try {
    decoded = decodeURIComponent(fragment);
  } catch {
    return ['\u0000invalid-pointer'];
  }
  if (!decoded.startsWith('/')) return ['\u0000invalid-pointer'];
  return decoded.slice(1).split('/').map(token => token.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function stableValue(value: unknown): string {
  const normalize = (current: unknown): unknown => {
    if (Array.isArray(current)) return current.map(normalize);
    if (!current || typeof current !== 'object') return current;
    const ignored = new Set(['description', 'title', 'example', 'examples', 'externalDocs', 'xml', '$schema']);
    return Object.keys(current as AnyRecord).sort((left, right) => left.localeCompare(right))
      .filter(key => !ignored.has(key))
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = normalize((current as AnyRecord)[key]);
        return result;
      }, {});
  };
  return JSON.stringify(normalize(value));
}

function isReadOnlyForRole(
  context: AssessmentContext,
  schema: unknown,
  role: ConsumerRole,
  sourceId: string
): boolean {
  const inspect = (current: unknown, visited: Set<string>): boolean => {
    if (!current || typeof current !== 'object') return false;
    const object = current as AnyRecord;
    if ((object.readOnly && role === 'request') || (object.writeOnly && role === 'response')) return true;
    if (isReference(current)) {
      if (visited.has(current.$ref)) return false;
      const nextVisited = new Set(visited).add(current.$ref);
      return inspect(resolveRawSchemaReference(context, current.$ref, sourceId), nextVisited);
    }
    return ['allOf', 'oneOf', 'anyOf'].some(keyword =>
      Array.isArray(object[keyword]) && object[keyword].some((branch: unknown) => inspect(branch, new Set(visited))));
  };
  return inspect(schema, new Set<string>());
}

function resolveRawSchemaReference(
  context: AssessmentContext,
  reference: string,
  fromSourceId: string
): AnyRecord | undefined {
  const fromResource = context.scope.resourceSet.find(entry => entry.sourceId === fromSourceId);
  const fromUri = canonicalDocumentUri(fromResource?.baseUri ?? fromSourceId, context.scope.baseUri);
  const hashIndex = reference.indexOf('#');
  const uriPart = hashIndex >= 0 ? reference.slice(0, hashIndex) : reference;
  const fragment = hashIndex >= 0 ? reference.slice(hashIndex + 1) : '';
  let targetUri: string;
  try {
    targetUri = canonicalDocumentUri(uriPart || fromUri, fromUri);
  } catch {
    return undefined;
  }
  const resource = context.scope.resourceSet.find(entry => {
    try {
      return canonicalDocumentUri(entry.sourceId, entry.baseUri) === targetUri
        || canonicalDocumentUri(entry.baseUri, entry.baseUri) === targetUri;
    } catch {
      return entry.sourceId === targetUri || entry.baseUri === targetUri;
    }
  });
  if (!resource) return undefined;
  const target = decodeReferencePointer(fragment).reduce<unknown>((current, token) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as AnyRecord)[token];
  }, resource.document);
  return target && typeof target === 'object' ? target as AnyRecord : undefined;
}

function isNonDefaultSerialization(parameter: AnyRecord): boolean {
  const defaults: Record<string, {style: string; explode: boolean}> = {
    path: {style: 'simple', explode: false},
    query: {style: 'form', explode: true},
    header: {style: 'simple', explode: false},
    cookie: {style: 'form', explode: true}
  };
  const defaultValue = defaults[parameter.in];
  if (!defaultValue) return true;
  return (parameter.style !== undefined && parameter.style !== defaultValue.style)
    || (parameter.explode !== undefined && parameter.explode !== defaultValue.explode);
}

function addUnit(
  context: AssessmentContext,
  dimension: ComplexityDimension,
  units: number,
  code: string,
  role: ConsumerRole | undefined,
  pointer: string,
  values: Record<string, AssessmentValue>,
  sourceId = context.scope.sourceId,
  dedupeKey?: string
) {
  const collector = context.dimensions[dimension];
  const evidence = dedupeKey ? `${dimension}:${role ?? 'operation'}:${dedupeKey}` : undefined;
  if (evidence && collector.evidenceKeys.has(evidence)) return;
  if (evidence) collector.evidenceKeys.add(evidence);
  collector.units += units;
  collector.reasons.push(reason(code, dimension, context.scope, pointer, values, role, sourceId));
}

function setMinimum(context: AssessmentContext, dimension: ComplexityDimension, minimum: DimensionLevel, escalation: string) {
  const collector = context.dimensions[dimension];
  if (BAND_ORDER.indexOf(minimum) > BAND_ORDER.indexOf(collector.minimum)) {
    collector.minimum = minimum;
  }
  collector.escalations.add(escalation);
}

function addBlocking(
  context: AssessmentContext,
  code: string,
  category: ComplexityDimension | 'assessment',
  pointer: string,
  role: ConsumerRole | undefined,
  values: Record<string, AssessmentValue>,
  sourceId = context.scope.sourceId
) {
  const fault = reason(code, category, context.scope, pointer, values, role, sourceId);
  context.blockingFaults.push(fault);
  if (category !== 'assessment' && category in context.dimensions) {
    context.dimensions[category as ComplexityDimension].reasons.push(fault);
  }
}

function addWarning(
  context: AssessmentContext,
  code: string,
  category: ComplexityDimension | 'assessment',
  pointer: string,
  role: ConsumerRole | undefined,
  values: Record<string, AssessmentValue>,
  sourceId = context.scope.sourceId
) {
  const warning = reason(code, category, context.scope, pointer, values, role, sourceId);
  context.warnings.push(warning);
  if (category !== 'assessment' && category in context.dimensions) {
    context.dimensions[category as ComplexityDimension].reasons.push(warning);
  }
}

function reason(
  code: string,
  category: AssessmentReason['category'],
  scope: AssessmentScopeInput,
  pointer: string,
  values: Record<string, AssessmentValue>,
  consumerRole?: ConsumerRole,
  sourceId = scope.sourceId
): AssessmentReason {
  return {
    code,
    category,
    ...(consumerRole ? {consumerRole} : {}),
    source: {sourceId, pointer},
    values
  };
}

function classifyDimension(dimension: ComplexityDimension, units: number, minimum: DimensionLevel): DimensionLevel {
  const threshold = LEVEL_THRESHOLDS[dimension];
  let level: DimensionLevel = 'Low';
  if (units >= threshold.veryHigh) {
    level = 'Very high';
  } else if (units >= threshold.high) {
    level = 'High';
  } else if (units >= threshold.moderate) {
    level = 'Moderate';
  }
  return BAND_ORDER.indexOf(level) >= BAND_ORDER.indexOf(minimum) ? level : minimum;
}

function aggregateRawBand(dimensions: Record<ComplexityDimension, DimensionAssessment>): DimensionLevel {
  const dominantLevel = DIMENSIONS.reduce<DimensionLevel>((highest, dimension) => {
    return BAND_ORDER.indexOf(dimensions[dimension].level) > BAND_ORDER.indexOf(highest) ? dimensions[dimension].level : highest;
  }, 'Low');
  if (dominantLevel === 'Moderate' || dominantLevel === 'High') {
    const atDominant = DIMENSIONS.filter(dimension => dimensions[dimension].level === dominantLevel).length;
    if (atDominant >= 3) {
      return BAND_ORDER[BAND_ORDER.indexOf(dominantLevel) + 1];
    }
  }
  return dominantLevel;
}

function findDominantDimension(dimensions: Record<ComplexityDimension, DimensionAssessment>): ComplexityDimension | undefined {
  return DIMENSIONS
    .filter(dimension => dimensions[dimension].level !== 'Low')
    .sort((left, right) => BAND_ORDER.indexOf(dimensions[right].level) - BAND_ORDER.indexOf(dimensions[left].level))[0];
}

function createDocumentationSupport(): DocumentationSupport {
  return {
    level: 'None',
    coveredRoles: [],
    missingCoverage: ['request or input guidance', 'primary success outcome', 'alternative or error outcome'],
    reasons: []
  };
}

function createDistribution(assessments: readonly OperationAssessment[]): ComplexityDistribution {
  const distribution = {Low: 0, Moderate: 0, High: 0, 'Very high': 0, Unknown: 0};
  assessments.forEach(assessment => distribution[assessment.finalBand]++);
  return distribution;
}

function createHotspots(assessments: readonly OperationAssessment[]) {
  const ordered = [...assessments].sort((left, right) => {
    const finalDifference = BAND_ORDER.indexOf(right.finalBand as DimensionLevel) - BAND_ORDER.indexOf(left.finalBand as DimensionLevel);
    if (finalDifference) return finalDifference;
    const rawDifference = BAND_ORDER.indexOf(right.rawBand as DimensionLevel) - BAND_ORDER.indexOf(left.rawBand as DimensionLevel);
    if (rawDifference) return rawDifference;
    const rightCounts = dimensionCounts(right);
    const leftCounts = dimensionCounts(left);
    for (let index = 0; index < rightCounts.length; index++) {
      if (rightCounts[index] !== leftCounts[index]) {
        return rightCounts[index] - leftCounts[index];
      }
    }
    return `${left.identity.path}:${left.identity.method}`.localeCompare(`${right.identity.path}:${right.identity.method}`);
  });

  let tier = 0;
  let previousTuple = '';
  return ordered.map(assessment => {
    const counts = dimensionCounts(assessment);
    const tuple = `${assessment.finalBand}|${assessment.rawBand}|${counts.join('|')}`;
    if (tuple !== previousTuple) {
      tier++;
      previousTuple = tuple;
    }
    return {identity: assessment.identity, finalBand: assessment.finalBand as DimensionLevel, rawBand: assessment.rawBand as DimensionLevel, tier};
  });
}

function dimensionCounts(assessment: OperationAssessment): [number, number, number] {
  return DIMENSIONS.reduce<[number, number, number]>((counts, dimension) => {
    const level = assessment.dimensions[dimension].level;
    if (level === 'Very high') counts[0]++;
    if (level === 'High') counts[1]++;
    if (level === 'Moderate') counts[2]++;
    return counts;
  }, [0, 0, 0]);
}

export function createUnavailableReport(scope: AssessmentScopeInput, failure: AssessmentReason): ComplexityAssessmentReport {
  return {
    modelVersion: COMPLEXITY_MODEL_VERSION,
    capabilityManifest: COMPLEXITY_CAPABILITY_MANIFEST,
    availability: 'Unavailable',
    scopeId: scope.scopeId,
    sourceId: scope.sourceId,
    baseUri: scope.baseUri,
    assessments: [],
    distribution: {Low: 0, Moderate: 0, High: 0, 'Very high': 0, Unknown: 0},
    coverage: {totalOperations: 0, knownOperations: 0, incompleteOperations: 0},
    hotspots: [],
    needsAssessment: [],
    failure
  };
}

function sortReasons(reasons: readonly AssessmentReason[]): AssessmentReason[] {
  return [...reasons].sort((left, right) => {
    const categoryDifference = CATEGORY_ORDER[left.category] - CATEGORY_ORDER[right.category];
    if (categoryDifference) return categoryDifference;
    const sourceDifference = left.source.sourceId.localeCompare(right.source.sourceId);
    if (sourceDifference) return sourceDifference;
    const pointerDifference = left.source.pointer.localeCompare(right.source.pointer);
    return pointerDifference || left.code.localeCompare(right.code);
  });
}

function isReference(value: unknown): value is {$ref: string} {
  return !!value && typeof value === 'object' && typeof (value as AnyRecord).$ref === 'string';
}

function escapeJsonPointer(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}
