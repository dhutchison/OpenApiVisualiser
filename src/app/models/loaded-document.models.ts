import { OpenAPIObject } from 'openapi3-ts/oas31';

export type LoadDiagnosticSeverity = 'error' | 'warning';

export type LoadDiagnosticCode =
  | 'duplicate-source-identity'
  | 'invalid-openapi-root'
  | 'parse-failed'
  | 'read-failed';

export interface LoadDiagnostic {
  readonly code: LoadDiagnosticCode;
  readonly severity: LoadDiagnosticSeverity;
  readonly message: string;
  readonly sourceId?: string;
}

export interface DocumentResource {
  readonly sourceId: string;
  readonly baseUri: string;
  readonly document: OpenAPIObject;
}

/**
 * The documents supplied in one load action. The URI map is intentionally
 * immutable after construction so a root always sees the same resource set.
 */
export class DocumentResourceSet {
  readonly resources: ReadonlyMap<string, DocumentResource>;
  readonly entries: readonly DocumentResource[];

  constructor(entries: readonly DocumentResource[]) {
    this.entries = [...entries];
    const resources = new Map<string, DocumentResource>();
    entries.forEach(entry => {
      /* Keep the first entry deterministic; duplicates are diagnosed by the loader. */
      if (!resources.has(entry.sourceId)) {
        resources.set(entry.sourceId, entry);
      }
    });
    this.resources = resources;
  }

  /** Resolve a relative or absolute reference against a loaded source. */
  resolve(reference: string, fromBaseUri: string): DocumentResource | undefined {
    try {
      return this.resources.get(canonicalizeUri(reference, fromBaseUri));
    } catch {
      return undefined;
    }
  }
}

export interface LoadedDocument {
  /** Stable assessment identity for this parsed OpenAPI root. */
  readonly scopeId: string;
  /** Canonical source identity, also used as the resource registry key. */
  readonly sourceId: string;
  /** Canonical base URI used for relative reference resolution. */
  readonly baseUri: string;
  readonly document: OpenAPIObject;
  readonly resourceSet: DocumentResourceSet;
  readonly diagnostics: readonly LoadDiagnostic[];
}

export function createLoadedDocument(
  document: OpenAPIObject,
  sourceId = 'file:///test/openapi.yaml',
  resourceSet = new DocumentResourceSet([{sourceId, baseUri: sourceId, document}]),
  diagnostics: readonly LoadDiagnostic[] = []
): LoadedDocument {
  return {
    scopeId: `assessment-scope:${sourceId}`,
    sourceId,
    baseUri: sourceId,
    document,
    resourceSet,
    diagnostics
  };
}

export function canonicalizeUri(reference: string, baseUri?: string): string {
  const uri = new URL(reference, baseUri).href;
  const normalized = new URL(uri);
  normalized.hash = '';
  return normalized.href;
}

export function createSyntheticFileUri(relativeName: string): string {
  return canonicalizeUri(relativeName, 'file:///openapi/');
}
