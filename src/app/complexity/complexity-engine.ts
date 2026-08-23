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

const SUPPORTED_SCHEMA_KEYS = new Set([
  '$schema', 'type', 'title', 'description', 'format', 'default', 'example', 'examples',
  'deprecated', 'readOnly', 'writeOnly', 'nullable', 'enum', 'const', 'properties',
  'required', 'items', 'prefixItems', 'additionalProperties', 'minProperties', 'maxProperties',
  'minItems', 'maxItems', 'uniqueItems', 'minLength', 'maxLength', 'pattern', 'minimum',
  'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'xml', 'externalDocs',
  'discriminator', 'contentMediaType', 'contentEncoding'
]);

export function assessLoadedDocument(scope: AssessmentScopeInput): ComplexityAssessmentReport {
  const document = scope.document as AnyRecord;
  const version = typeof document.openapi === 'string' ? document.openapi : '';

  if (!/^3\.(0|1)(?:\.\d+)?$/.test(version)) {
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
    seenSchemas: {
      request: new WeakSet<object>(),
      response: new WeakSet<object>()
    }
  };

  if (operation['x-multi-segment'] !== undefined) {
    addBlocking(context, 'known-contract-affecting-extension', 'assessment', `${operationPointer}/x-multi-segment`, undefined, {extension: 'x-multi-segment'});
  }

  collectParameters(
    context,
    operationInfo.pathItem,
    operation,
    operationPointer
  );
  collectRequestBody(context, operation.requestBody, `${operationPointer}/requestBody`);
  collectResponses(context, operation.responses, `${operationPointer}/responses`);
  collectUnsupportedProtocol(context, document, operation, operationPointer);

  const dimensionAssessments = Object.fromEntries(DIMENSIONS.map(dimension => {
    const collector = dimensions[dimension];
    return [dimension, {
      units: collector.units,
      level: classifyDimension(dimension, collector.units, collector.minimum),
      reasons: sortReasons(collector.reasons),
      escalations: [...collector.escalations].sort()
    } satisfies DimensionAssessment];
  })) as unknown as Record<ComplexityDimension, DimensionAssessment>;

  const allReasons = sortReasons(DIMENSIONS.flatMap(dimension => dimensionAssessments[dimension].reasons)
    .concat(blockingFaults.filter(fault => fault.category === 'assessment'), warnings));
  const incomplete = blockingFaults.length > 0;
  const rawBand = incomplete ? 'Unknown' : aggregateRawBand(dimensionAssessments);
  const documentationSupport = createDocumentationSupport();
  const finalBand = rawBand;
  const dominantDimension = incomplete ? undefined : findDominantDimension(dimensionAssessments);

  return {
    identity,
    modelVersion: COMPLEXITY_MODEL_VERSION,
    confidence: incomplete ? 'Incomplete' : warnings.length > 0 ? 'Qualified' : 'Complete',
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
}

type Collectors = Record<ComplexityDimension, DimensionCollector>;

interface AssessmentContext {
  readonly scope: AssessmentScopeInput;
  readonly dimensions: Collectors;
  readonly blockingFaults: AssessmentReason[];
  readonly warnings: AssessmentReason[];
  readonly seenSchemas: Record<ConsumerRole, WeakSet<object>>;
}

function createCollectors(): Collectors {
  return Object.fromEntries(DIMENSIONS.map(dimension => [dimension, {
    units: 0,
    minimum: 'Low',
    reasons: [],
    escalations: new Set<string>()
  }])) as Collectors;
}

function collectParameters(
  context: AssessmentContext,
  pathItem: AnyRecord,
  operation: AnyRecord,
  pointer: string
) {
  const parameters = new Map<string, {parameter: AnyRecord; pointer: string}>();
  const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
  const operationParameters = Array.isArray(operation.parameters) ? operation.parameters : [];

  [...pathParameters, ...operationParameters].forEach((parameter, index) => {
    const parameterPointer = `${pointer}/parameters/${index}`;
    if (isReference(parameter)) {
      addBlocking(context, 'unsupported-reference', 'assessment', parameterPointer, 'request', {
        reference: parameter.$ref
      });
      return;
    }
    if (!parameter || typeof parameter !== 'object' || typeof parameter.name !== 'string' || typeof parameter.in !== 'string') {
      addBlocking(context, 'invalid-parameter', 'assessment', parameterPointer, 'request', {});
      return;
    }
    parameters.set(`${parameter.in}:${parameter.name}`, {parameter, pointer: parameterPointer});
  });

  [...parameters.values()]
    .sort((left, right) => `${left.parameter.in}:${left.parameter.name}`.localeCompare(`${right.parameter.in}:${right.parameter.name}`))
    .forEach(({parameter, pointer: parameterPointer}) => {
      addUnit(context, 'interactionSurface', 1, 'parameter', 'request', parameterPointer, {name: parameter.name, in: parameter.in});
      addUnit(context, 'conditionality', 1, parameter.required ? 'requiredness-obligation' : 'optionality-obligation', 'request', parameterPointer, {required: !!parameter.required});
      if (isNonDefaultSerialization(parameter)) {
        addUnit(context, 'conditionality', 1, 'non-default-serialization', 'request', parameterPointer, {style: parameter.style ?? '', explode: !!parameter.explode});
      }

      if (parameter.content) {
        collectContent(context, parameter.content, `${parameterPointer}/content`, 'request');
        return;
      }
      if (parameter.schema) {
        collectSchema(context, parameter.schema, `${parameterPointer}/schema`, 'request', 0);
        return;
      }
      addBlocking(context, 'unsupported-parameter-shape', 'assessment', parameterPointer, 'request', {name: parameter.name});
    });

}

function collectRequestBody(context: AssessmentContext, requestBody: unknown, pointer: string) {
  if (!requestBody) {
    return;
  }
  if (isReference(requestBody)) {
    addBlocking(context, 'unsupported-reference', 'assessment', pointer, 'request', {reference: requestBody.$ref});
    return;
  }
  const requestBodyObject = requestBody as AnyRecord;
  if (typeof requestBody !== 'object' || !requestBodyObject.content || typeof requestBodyObject.content !== 'object') {
    addBlocking(context, 'unsupported-request-body', 'assessment', pointer, 'request', {});
    return;
  }

  collectContent(context, requestBodyObject.content, `${pointer}/content`, 'request');
  if (requestBodyObject.required) {
    addUnit(context, 'conditionality', 1, 'requiredness-obligation', 'request', pointer, {required: true});
  }
}

function collectResponses(context: AssessmentContext, responses: unknown, pointer: string) {
  if (!responses || typeof responses !== 'object') {
    addBlocking(context, 'invalid-responses', 'assessment', pointer, 'response', {});
    return;
  }

  Object.entries(responses as AnyRecord)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([status, response], index) => {
      const responsePointer = `${pointer}/${escapeJsonPointer(status)}`;
      addUnit(context, 'interactionSurface', 1, 'response-case', 'response', responsePointer, {status});
      if (isReference(response)) {
        addBlocking(context, 'unsupported-reference', 'assessment', responsePointer, 'response', {reference: response.$ref});
        return;
      }
      if (!response || typeof response !== 'object') {
        addBlocking(context, 'invalid-response', 'assessment', responsePointer, 'response', {status});
        return;
      }

      Object.keys(response.headers ?? {}).sort().forEach(header => {
        const headerPointer = `${responsePointer}/headers/${escapeJsonPointer(header)}`;
        addUnit(context, 'interactionSurface', 1, 'response-header', 'response', headerPointer, {name: header});
        if (isReference(response.headers[header])) {
          addBlocking(context, 'unsupported-reference', 'assessment', headerPointer, 'response', {reference: response.headers[header].$ref});
        } else if (response.headers[header]?.schema) {
          collectSchema(context, response.headers[header].schema, `${headerPointer}/schema`, 'response', 0);
        }
      });

      if (response.content) {
        collectContent(context, response.content, `${responsePointer}/content`, 'response');
      }
      if (response.links) {
        Object.keys(response.links).sort().forEach(link => {
          addBlocking(context, 'unsupported-link', 'protocolObligations', `${responsePointer}/links/${escapeJsonPointer(link)}`, 'response', {name: link});
        });
      }
      void index;
    });
}

function collectContent(context: AssessmentContext, content: unknown, pointer: string, role: ConsumerRole) {
  if (!content || typeof content !== 'object') {
    addBlocking(context, 'invalid-content', 'assessment', pointer, role, {});
    return;
  }

  Object.entries(content as AnyRecord)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([mediaType, media], index) => {
      const mediaPointer = `${pointer}/${escapeJsonPointer(mediaType)}`;
      addUnit(context, 'interactionSurface', 1, role === 'request' ? 'request-representation' : 'response-representation', role, mediaPointer, {mediaType});
      if (isReference(media)) {
        addBlocking(context, 'unsupported-reference', 'assessment', mediaPointer, role, {reference: media.$ref});
        return;
      }
      if (!media || typeof media !== 'object') {
        addBlocking(context, 'invalid-media-type', 'assessment', mediaPointer, role, {mediaType});
        return;
      }
      if (media.schema) {
        collectSchema(context, media.schema, `${mediaPointer}/schema`, role, 0);
      } else {
        addBlocking(context, 'missing-media-schema', 'assessment', mediaPointer, role, {mediaType});
      }
      void index;
    });
}

function collectSchema(
  context: AssessmentContext,
  schema: unknown,
  pointer: string,
  role: ConsumerRole,
  depth: number
) {
  if (!schema || typeof schema !== 'object') {
    addBlocking(context, 'invalid-schema', 'assessment', pointer, role, {});
    return;
  }
  if (isReference(schema)) {
    addBlocking(context, 'unsupported-reference', 'assessment', pointer, role, {reference: schema.$ref});
    return;
  }
  if (context.seenSchemas[role].has(schema)) {
    return;
  }
  context.seenSchemas[role].add(schema);
  const schemaObject = schema as AnyRecord;

  Object.keys(schemaObject)
    .filter(key => !SUPPORTED_SCHEMA_KEYS.has(key) && !key.startsWith('x-'))
    .sort()
    .forEach(key => addBlocking(context, 'unsupported-schema-keyword', 'assessment', `${pointer}/${escapeJsonPointer(key)}`, role, {keyword: key}));

  ['allOf', 'oneOf', 'anyOf', 'not', 'if', 'then', 'else', 'dependentSchemas', 'unevaluatedProperties']
    .filter(keyword => schemaObject[keyword] !== undefined)
    .forEach(keyword => addBlocking(context, 'unsupported-schema-composition', 'conditionality', `${pointer}/${keyword}`, role, {keyword}));

  if (schemaObject.readOnly && role === 'request' || schemaObject.writeOnly && role === 'response') {
    return;
  }

  if (schemaObject['x-multi-segment'] !== undefined) {
    addBlocking(context, 'known-contract-affecting-extension', 'assessment', `${pointer}/x-multi-segment`, role, {extension: 'x-multi-segment'});
  }

  if (schemaObject.nullable || (Array.isArray(schemaObject.type) && schemaObject.type.includes('null'))) {
    addUnit(context, 'conditionality', 1, 'nullable-value', role, pointer, {});
  }

  const validationFamilies = new Set<string>();
  if (schemaObject.minimum !== undefined || schemaObject.maximum !== undefined || schemaObject.exclusiveMinimum !== undefined || schemaObject.exclusiveMaximum !== undefined) {
    validationFamilies.add('range');
  }
  if (schemaObject.multipleOf !== undefined) validationFamilies.add('multiple');
  if (schemaObject.minLength !== undefined || schemaObject.maxLength !== undefined) validationFamilies.add('length');
  if (schemaObject.pattern !== undefined) validationFamilies.add('pattern');
  if (schemaObject.minItems !== undefined || schemaObject.maxItems !== undefined || schemaObject.uniqueItems !== undefined) validationFamilies.add('items');
  if (schemaObject.minProperties !== undefined || schemaObject.maxProperties !== undefined) validationFamilies.add('properties');
  if (schemaObject.enum !== undefined || schemaObject.const !== undefined) validationFamilies.add('choice');
  validationFamilies.forEach(family => addUnit(context, 'conditionality', 1, 'validation-rule-family', role, pointer, {family}));

  const type = Array.isArray(schemaObject.type) ? schemaObject.type.find((value: unknown) => value !== 'null') : schemaObject.type;
  if (type === 'object' || schemaObject.properties || schemaObject.additionalProperties !== undefined) {
    const properties = schemaObject.properties && typeof schemaObject.properties === 'object' ? schemaObject.properties : {};
    const required = new Set<string>(Array.isArray(schemaObject.required) ? schemaObject.required : []);
    Object.keys(properties).sort().forEach(property => {
      const propertySchema = properties[property];
      if (isReadOnlyForRole(propertySchema, role)) {
        return;
      }
      const propertyPointer = `${pointer}/properties/${escapeJsonPointer(property)}`;
      addUnit(context, 'dataShape', 1, 'field', role, propertyPointer, {name: property});
      addUnit(context, 'dataShape', 1, 'nesting-transition', role, propertyPointer, {depth: depth + 1});
      addUnit(context, 'conditionality', 1, required.has(property) ? 'requiredness-obligation' : 'optionality-obligation', role, propertyPointer, {required: required.has(property)});
      collectSchema(context, propertySchema, propertyPointer, role, depth + 1);
    });
    if (schemaObject.additionalProperties && typeof schemaObject.additionalProperties === 'object') {
      addUnit(context, 'dataShape', 2, 'map-boundary', role, `${pointer}/additionalProperties`, {});
      addUnit(context, 'dataShape', 1, 'nesting-transition', role, `${pointer}/additionalProperties`, {depth: depth + 1});
      collectSchema(context, schemaObject.additionalProperties, `${pointer}/additionalProperties`, role, depth + 1);
    } else if (schemaObject.additionalProperties === true) {
      addBlocking(context, 'unsupported-untyped-map', 'assessment', `${pointer}/additionalProperties`, role, {});
    }
  }

  if (type === 'array' || schemaObject.items !== undefined || schemaObject.prefixItems !== undefined) {
    addUnit(context, 'dataShape', 2, 'collection-boundary', role, pointer, {kind: 'array'});
    if (Array.isArray(schemaObject.prefixItems)) {
      schemaObject.prefixItems.forEach((item: unknown, index: number) => {
        addUnit(context, 'dataShape', 1, 'tuple-position', role, `${pointer}/prefixItems/${index}`, {index});
        addUnit(context, 'dataShape', 1, 'nesting-transition', role, `${pointer}/prefixItems/${index}`, {depth: depth + 1});
        collectSchema(context, item, `${pointer}/prefixItems/${index}`, role, depth + 1);
      });
    } else if (schemaObject.items) {
      addUnit(context, 'dataShape', 1, 'nesting-transition', role, `${pointer}/items`, {depth: depth + 1});
      collectSchema(context, schemaObject.items, `${pointer}/items`, role, depth + 1);
    }
  }

  if (depth >= 8) {
    setMinimum(context, 'dataShape', 'High', 'structural-depth-high');
  }
  if (depth >= 12) {
    setMinimum(context, 'dataShape', 'Very high', 'structural-depth-very-high');
  }
}

function collectUnsupportedProtocol(context: AssessmentContext, document: AnyRecord, operation: AnyRecord, pointer: string) {
  const security = operation.security === undefined ? document.security : operation.security;
  if (Array.isArray(security) && security.length > 0) {
    addBlocking(context, 'unsupported-protocol-obligations', 'protocolObligations', `${pointer}/security`, undefined, {construct: 'security'});
  }

  if (Array.isArray(operation.servers)) {
    addBlocking(context, 'unsupported-protocol-obligations', 'protocolObligations', `${pointer}/servers`, undefined, {construct: 'servers'});
  }
  if (operation.callbacks) {
    Object.keys(operation.callbacks).sort().forEach(callback => {
      addBlocking(context, 'unsupported-callback', 'protocolObligations', `${pointer}/callbacks/${escapeJsonPointer(callback)}`, undefined, {name: callback});
    });
  }
}

function isReadOnlyForRole(schema: unknown, role: ConsumerRole): boolean {
  return !!schema && typeof schema === 'object' && ((schema as AnyRecord).readOnly && role === 'request' || (schema as AnyRecord).writeOnly && role === 'response');
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
  values: Record<string, boolean | number | string | readonly string[]>
) {
  const collector = context.dimensions[dimension];
  collector.units += units;
  collector.reasons.push(reason(code, dimension, context.scope, pointer, values, role));
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
  values: Record<string, boolean | number | string | readonly string[]>
) {
  const fault = reason(code, category, context.scope, pointer, values, role);
  context.blockingFaults.push(fault);
  if (category !== 'assessment' && category in context.dimensions) {
    context.dimensions[category as ComplexityDimension].reasons.push(fault);
  }
}

function reason(
  code: string,
  category: AssessmentReason['category'],
  scope: AssessmentScopeInput,
  pointer: string,
  values: Record<string, boolean | number | string | readonly string[]>,
  consumerRole?: ConsumerRole
): AssessmentReason {
  return {
    code,
    category,
    ...(consumerRole ? {consumerRole} : {}),
    source: {sourceId: scope.sourceId, pointer},
    values
  };
}

function classifyDimension(dimension: ComplexityDimension, units: number, minimum: DimensionLevel): DimensionLevel {
  const threshold = LEVEL_THRESHOLDS[dimension];
  const level = units >= threshold.veryHigh ? 'Very high' : units >= threshold.high ? 'High' : units >= threshold.moderate ? 'Moderate' : 'Low';
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
  return value.replace(/~/g, '~0').replace(/\//g, '~1');
}
