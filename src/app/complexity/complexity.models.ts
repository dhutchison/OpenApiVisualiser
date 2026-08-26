export const COMPLEXITY_MODEL_VERSION = 'operation-contract-complexity/1.0.0';

export type ComplexityBand = 'Low' | 'Moderate' | 'High' | 'Very high' | 'Unknown';
export type ComplexityDimension =
  | 'interactionSurface'
  | 'dataShape'
  | 'conditionality'
  | 'indirection'
  | 'protocolObligations';
export type AssessmentConfidence = 'Complete' | 'Qualified' | 'Incomplete';
export type AssessmentAvailability = 'Pending' | 'Available' | 'Unavailable';
export type ConsumerRole = 'request' | 'response';
export type ReasonCategory = ComplexityDimension | 'assessment';

export interface AssessmentSource {
  readonly sourceId: string;
  readonly pointer: string;
}

export interface AssessmentReason {
  readonly code: string;
  readonly category: ReasonCategory;
  readonly consumerRole?: ConsumerRole;
  readonly source: AssessmentSource;
  readonly values: Readonly<Record<string, boolean | number | string | readonly string[]>>;
}

export interface DimensionAssessment {
  readonly units: number;
  readonly level: Exclude<ComplexityBand, 'Unknown'>;
  readonly reasons: readonly AssessmentReason[];
  readonly escalations: readonly string[];
}

export interface DocumentationSupport {
  readonly level: 'None' | 'Partial' | 'Strong';
  readonly coveredRoles: readonly string[];
  readonly missingCoverage: readonly string[];
  readonly reasons: readonly AssessmentReason[];
  readonly mitigation?: {
    readonly from: Exclude<ComplexityBand, 'Low' | 'Unknown'>;
    readonly to: Exclude<ComplexityBand, 'Very high' | 'Unknown'>;
  };
}

export interface OperationIdentity {
  readonly key: string;
  readonly scopeId: string;
  readonly sourceId: string;
  readonly path: string;
  readonly method: string;
  readonly operationId?: string;
}

export interface OperationAssessment {
  readonly identity: OperationIdentity;
  readonly modelVersion: typeof COMPLEXITY_MODEL_VERSION;
  readonly confidence: AssessmentConfidence;
  readonly dimensions: Readonly<Record<ComplexityDimension, DimensionAssessment>>;
  readonly rawBand: ComplexityBand;
  readonly documentationSupport: DocumentationSupport;
  readonly finalBand: ComplexityBand;
  readonly dominantDimension?: ComplexityDimension;
  readonly supportingDimensions: readonly ComplexityDimension[];
  readonly reasons: readonly AssessmentReason[];
  readonly blockingFaults: readonly AssessmentReason[];
  readonly warnings: readonly AssessmentReason[];
}

export interface ComplexityCapabilityManifest {
  readonly version: '1.0.0';
  readonly openApiVersions: readonly ['3.0', '3.1'];
  readonly supported: readonly string[];
  readonly unsupportedContractAffecting: readonly string[];
  readonly knownContractAffectingExtensions: readonly string[];
  readonly ignoredNonSemanticExtensions: readonly string[];
}

export const COMPLEXITY_CAPABILITY_MANIFEST: ComplexityCapabilityManifest = {
  version: '1.0.0',
  openApiVersions: ['3.0', '3.1'],
  supported: [
    'operation parameters',
    'inline request and response bodies',
    'inline object, scalar, array, map, and tuple schemas',
    'response cases, headers, and media types',
    'role-projected requiredness, optionality, readOnly, writeOnly, defaults, and nullability',
    'version-appropriate OpenAPI 3.0 and 3.1 schema semantics',
    'validation families, dependent rules, and non-default parameter serialization',
    'local and supplied external references with canonical resource-set resolution',
    'reference chains, external boundaries, composition edges, and recursive schema groups',
    'allOf effective shapes, oneOf/anyOf alternatives, and dependent conditional rules',
    'discriminator selectors and viable alternative branches',
    'security, servers, response links, and callback obligations',
    'deterministic report and compact presentation lifecycle'
  ],
  unsupportedContractAffecting: [
    'unsupported callback or composition targets',
    'advanced protocol obligations not represented by the supported security, server, link, and callback facts',
    'unsupported JSON Schema keywords for the declared OpenAPI version'
  ],
  knownContractAffectingExtensions: ['x-multi-segment'],
  ignoredNonSemanticExtensions: ['x-* extensions without registered contract semantics']
};

export interface AssessmentScopeInput {
  readonly scopeId: string;
  readonly sourceId: string;
  readonly baseUri: string;
  readonly document: Readonly<Record<string, unknown>>;
  readonly resourceSet: readonly {
    readonly sourceId: string;
    readonly baseUri: string;
    readonly document: Readonly<Record<string, unknown>>;
  }[];
}

export interface ComplexityDistribution {
  readonly Low: number;
  readonly Moderate: number;
  readonly High: number;
  readonly 'Very high': number;
  readonly Unknown: number;
}

export interface HotspotEntry {
  readonly identity: OperationIdentity;
  readonly finalBand: Exclude<ComplexityBand, 'Unknown'>;
  readonly rawBand: Exclude<ComplexityBand, 'Unknown'>;
  readonly tier: number;
}

export interface ComplexityAssessmentReport {
  readonly modelVersion: typeof COMPLEXITY_MODEL_VERSION;
  readonly capabilityManifest: ComplexityCapabilityManifest;
  readonly availability: AssessmentAvailability;
  readonly scopeId: string;
  readonly sourceId: string;
  readonly baseUri: string;
  readonly assessments: readonly OperationAssessment[];
  readonly distribution: ComplexityDistribution;
  readonly coverage: {
    readonly totalOperations: number;
    readonly knownOperations: number;
    readonly incompleteOperations: number;
  };
  readonly hotspots: readonly HotspotEntry[];
  readonly needsAssessment: readonly OperationIdentity[];
  readonly failure?: AssessmentReason;
}

export interface ComplexityAssessmentState {
  readonly scopeId: string;
  readonly status: AssessmentAvailability;
  readonly report?: ComplexityAssessmentReport;
}
