import {
  AssessmentAvailability,
  AssessmentReason,
  ComplexityBand,
  ComplexityDimension,
  DimensionAssessment,
  DocumentationSupport,
  OperationAssessment
} from './complexity.models';

export interface ComplexityExplanationFact {
  readonly label: string;
  readonly value: string;
}

export interface ComplexityExplanationReason {
  readonly meaning: string;
  readonly role: string;
  readonly sourceId: string;
  readonly pointer: string;
}

export interface ComplexityDimensionExplanation {
  readonly key: ComplexityDimension;
  readonly label: string;
  readonly level: Exclude<ComplexityBand, 'Unknown'>;
  readonly evidence: string;
  readonly reasons: readonly ComplexityExplanationReason[];
  readonly isDominant: boolean;
}

export interface ComplexityDocumentationExplanation {
  readonly level: DocumentationSupport['level'];
  readonly headline: string;
  readonly detail: string;
  readonly coveredRoles: readonly string[];
  readonly missingCoverage: readonly string[];
  readonly mitigation?: string;
}

export interface ComplexityExplanationView {
  readonly state: AssessmentAvailability;
  readonly heading: string;
  readonly conclusion: string;
  readonly dominantBurden?: string;
  readonly facts: readonly ComplexityExplanationFact[];
  readonly dimensions: readonly ComplexityDimensionExplanation[];
  readonly documentation: ComplexityDocumentationExplanation;
  readonly reasons: readonly ComplexityExplanationReason[];
  readonly diagnostics: readonly ComplexityExplanationReason[];
}

const DIMENSIONS: readonly {key: ComplexityDimension; label: string}[] = [
  {key: 'interactionSurface', label: 'Interaction surface'},
  {key: 'dataShape', label: 'Data shape'},
  {key: 'conditionality', label: 'Conditionality'},
  {key: 'indirection', label: 'Indirection'},
  {key: 'protocolObligations', label: 'Protocol obligations'}
];

const REASON_MEANINGS: Readonly<Record<string, string>> = {
  parameter: 'A parameter adds an input or output contract case.',
  'request-representation': 'A request representation adds a distinct way to send the contract.',
  'response-case': 'A response case adds an outcome the consumer must handle.',
  'response-header': 'A response header adds another value to understand.',
  'response-representation': 'A response representation adds a distinct way to receive the contract.',
  field: 'A consumer-visible field adds data-shape burden.',
  'nesting-transition': 'A nesting transition adds structural depth to the contract.',
  'collection-boundary': 'A collection boundary adds iteration and item-shape handling.',
  'map-boundary': 'A map boundary adds dynamic-key handling.',
  'tuple-position': 'A tuple position adds an ordered structural obligation.',
  'requiredness-obligation': 'Requiredness creates a value-production obligation.',
  'optionality-obligation': 'Optionality creates an absence-handling branch.',
  'nullable-value': 'Nullability creates another value state to handle.',
  'validation-rule-family': 'Validation rules create conditional input or output obligations.',
  'non-default-serialization': 'Non-default serialization creates an encoding rule to coordinate.',
  'discriminator-selector': 'A discriminator adds a branch-selection rule.',
  'reference-target': 'A reusable target adds a navigation step.',
  'reference-chain-hop': 'A reference chain adds another navigation step.',
  'external-document-boundary': 'An external document boundary adds a source transition.',
  'composition-edge': 'Schema composition adds another contract relationship to understand.',
  'alternative-branch': 'An alternative branch adds another permitted data shape.',
  'dependent-conditional-rule': 'A dependent rule makes fields conditional on one another.',
  'recursive-structure': 'A recursive structure requires the consumer to understand a repeating shape.',
  'cycle-navigation': 'A reference cycle adds navigation burden.',
  'security-scheme': 'An authentication scheme adds a protocol obligation.',
  'security-scope': 'An authentication scope adds an authorization obligation.',
  'security-flow': 'An authentication flow adds coordination steps.',
  'security-or-alternative': 'Alternative authentication choices add a protocol branch.',
  'security-and-scheme': 'Combined authentication schemes add simultaneous obligations.',
  'anonymous-auth-choice': 'Anonymous access adds another authentication choice.',
  'server-alternative': 'A server alternative adds a deployment choice.',
  'server-variable': 'A server variable adds a value that must be configured.',
  'response-link': 'A response link adds a follow-up protocol obligation.',
  'callback-operation': 'A callback adds a reverse interaction to coordinate.',
  'unavailable-reference': 'A referenced contract cannot be resolved.',
  'unavailable-callback': 'A callback contract cannot be resolved.',
  'contradictory-composition': 'Schema composition contains contradictory requirements.',
  'unsupported-schema-keyword': 'A schema keyword is outside the supported capability set.',
  'invalid-discriminator': 'The discriminator declaration is invalid.',
  'broken-discriminator-mapping': 'A discriminator mapping cannot be resolved.',
  'known-contract-affecting-extension': 'A contract-affecting extension is not supported.',
  'documentation-example': 'A valid representative example helps explain the declared contract.',
  'documentation-description': 'A description provides useful contract guidance.',
  'documentation-coverage': 'Documentation coverage describes which contract roles still need guidance.',
  'documentation-mitigation': 'Strong documentation support reduces the final band by one level.'
};

export function formatComplexityStatus(status: AssessmentAvailability, band?: ComplexityBand): string {
  if (status === 'Pending') {
    return 'Complexity: assessing…';
  }
  if (status === 'Unavailable') {
    return 'Complexity unavailable';
  }
  return `Complexity: ${band ?? 'Unknown'}`;
}

export function createComplexityExplanation(
  state: AssessmentAvailability,
  assessment?: OperationAssessment,
  failure?: AssessmentReason
): ComplexityExplanationView {
  if (state === 'Pending') {
    return emptyExplanation('Pending', 'Assessing operation complexity…', 'The operation complexity report is being prepared.');
  }

  if (state === 'Unavailable') {
    const diagnostics = failure ? [formatReason(failure)] : [];
    return {
      ...emptyExplanation('Unavailable', 'Complexity assessment unavailable', 'This operation cannot show a complexity classification because its document assessment is unavailable.'),
      diagnostics
    };
  }

  if (!assessment) {
    return emptyExplanation(
      'Available',
      'Complexity assessment incomplete',
      'This operation has unknown consumer complexity because its available assessment is incomplete.'
    );
  }

  const dimensions = DIMENSIONS.map(dimension => createDimensionExplanation(
    dimension.key,
    dimension.label,
    assessment.dimensions[dimension.key],
    assessment.dominantDimension === dimension.key
  ));
  const reasons = assessment.reasons.map(formatReason);
  const diagnostics = [...assessment.blockingFaults, ...assessment.warnings].map(formatReason);
  const isIncomplete = assessment.confidence === 'Incomplete' || assessment.finalBand === 'Unknown';
  const dominantLabel = assessment.dominantDimension
    ? DIMENSIONS.find(dimension => dimension.key === assessment.dominantDimension)?.label
    : undefined;

  return {
    state: 'Available',
    heading: 'Explain the burden',
    conclusion: isIncomplete
      ? 'This operation has unknown consumer complexity because the assessment is incomplete.'
      : `This operation has ${assessment.finalBand} consumer complexity.`,
    dominantBurden: dominantLabel
      ? `Its ${dominantLabel} burden is the dominant driver.`
      : 'No dominant burden could be identified from the available assessment evidence.',
    facts: [
      {label: 'Assessment confidence', value: assessment.confidence},
      {label: 'Raw complexity band', value: assessment.rawBand},
      {label: 'Final complexity band', value: assessment.finalBand},
      {label: 'Documentation support', value: assessment.documentationSupport.level}
    ],
    dimensions,
    documentation: createDocumentationExplanation(assessment.documentationSupport),
    reasons,
    diagnostics
  };
}

function createDimensionExplanation(
  key: ComplexityDimension,
  label: string,
  dimension: DimensionAssessment,
  isDominant: boolean
): ComplexityDimensionExplanation {
  return {
    key,
    label,
    level: dimension.level,
    evidence: `${dimension.units} evidence unit${dimension.units === 1 ? '' : 's'}`,
    reasons: dimension.reasons.map(formatReason),
    isDominant
  };
}

function createDocumentationExplanation(support: DocumentationSupport): ComplexityDocumentationExplanation {
  const coveredRoles = support.coveredRoles.map(formatDocumentationRole);
  const missingCoverage = support.missingCoverage.map(formatDocumentationRole);
  const coverageDetail = coveredRoles.length
    ? `Covered roles: ${coveredRoles.join(', ')}.`
    : 'No covered contract roles were identified.';
  const missingDetail = missingCoverage.length
    ? ` Still needed: ${missingCoverage.join(', ')}.`
    : '';

  if (support.level === 'Strong') {
    return {
      level: support.level,
      headline: support.mitigation
        ? 'Strong documentation support reduces the final band by one level.'
        : 'Strong documentation support helps explain the contract without changing its band.',
      detail: `${coverageDetail}${missingDetail}`,
      coveredRoles,
      missingCoverage,
      ...(support.mitigation ? {
        mitigation: `Without this support, the raw band would be ${support.mitigation.from}; the final band is ${support.mitigation.to}.`
      } : {})
    };
  }

  if (support.level === 'Partial') {
    return {
      level: support.level,
      headline: 'Some documentation helps, but it does not cover every required contract role.',
      detail: `${coverageDetail}${missingDetail}`,
      coveredRoles,
      missingCoverage
    };
  }

  return {
    level: support.level,
    headline: 'No documentation support was identified for the assessed contract.',
    detail: `${coverageDetail}${missingDetail}`,
    coveredRoles,
    missingCoverage
  };
}

function formatReason(reason: AssessmentReason): ComplexityExplanationReason {
  const suppliedMeaning = reason.values.meaning ?? reason.values.message;
  const meaning = typeof suppliedMeaning === 'string'
    ? suppliedMeaning
    : formatReasonMeaning(reason);

  return {
    meaning,
    role: reason.consumerRole ? formatRole(reason.consumerRole) : formatCategory(reason.category),
    sourceId: reason.source.sourceId,
    pointer: reason.source.pointer
  };
}

function formatReasonMeaning(reason: AssessmentReason): string {
  const baseMeaning = REASON_MEANINGS[reason.code] ?? formatReasonCode(reason.code);
  const detail = ['reference', 'keyword', 'extension', 'target', 'status', 'mediaType']
    .map(key => ({key, value: reason.values[key]}))
    .find(entry => typeof entry.value === 'string');

  return detail ? `${baseMeaning} (${detail.key}: ${detail.value})` : baseMeaning;
}

function emptyExplanation(state: AssessmentAvailability, heading: string, conclusion: string): ComplexityExplanationView {
  return {
    state,
    heading,
    conclusion,
    facts: [],
    dimensions: [],
    documentation: {
      level: 'None',
      headline: '',
      detail: '',
      coveredRoles: [],
      missingCoverage: []
    },
    reasons: [],
    diagnostics: []
  };
}

function formatReasonCode(code: string): string {
  return code.replaceAll('-', ' ').replace(/\b\w/g, character => character.toUpperCase());
}

function formatRole(role: string): string {
  return role === 'request' ? 'Request or input' : 'Response or outcome';
}

function formatDocumentationRole(role: string): string {
  return {
    'request or input': 'Request or input',
    'primary success outcome': 'Primary success outcome',
    'alternative or error outcome': 'Alternative or error outcome'
  }[role] ?? formatReasonCode(role);
}

function formatCategory(category: string): string {
  return category === 'assessment' ? 'Assessment' : category === 'documentation' ? 'Documentation' : formatReasonCode(category);
}
