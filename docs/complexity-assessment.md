# Operation contract complexity 1.0

The assessment model is `operation-contract-complexity/1.0.0`. It is advisory and document-scoped: a loaded OpenAPI root has one report, while roots in the same resource set remain independent scopes.

## Version-one boundary

The pure engine accepts an OpenAPI 3.0 or 3.1 root and emits JSON-serialisable report data. It supports operation and inherited path parameters, inline scalar/object/array/map/tuple schemas, request representations, response cases and headers, response representations, requiredness, nullability, and validation families. It does not fetch references or copy source nodes into reports.

Reachable references, schema composition, conditional schemas, callbacks, links, and other contract-affecting semantics outside the capability manifest are blocking faults. The operation keeps its partial evidence, but its confidence is `Incomplete` and its raw and final bands are `Unknown`. Unsupported document versions or documents with no identifiable operations make the scope `Unavailable`; they do not hide an otherwise parseable API.

## Dimensions and thresholds

Evidence units belong to one dimension. Levels are classified independently:

| Dimension | Low | Moderate | High | Very high |
| --- | ---: | ---: | ---: | ---: |
| Interaction surface | 0–3 | 4–7 | 8–14 | 15+ |
| Data shape | 0–5 | 6–15 | 16–39 | 40+ |
| Conditionality | 0–3 | 4–8 | 9–19 | 20+ |
| Indirection | 0–2 | 3–6 | 7–14 | 15+ |
| Protocol obligations | 0–2 | 3–6 | 7–12 | 13+ |

Interaction surface counts effective parameters, request representations, response cases, response headers, and response representations. Data shape counts unique consumer-visible fields or tuple positions, nesting transitions, and collection/map/tuple boundaries. Conditionality counts role-sensitive requiredness, nullability, validation families, and non-default serialization. The current inline slice leaves indirection low and reports advanced indirection as a blocking fault. Protocol counts supported basic security and server obligations.

The raw band is the highest dimension level. A moderate or high dominant level receives a one-level breadth uplift when at least three dimensions independently reach that same level. Lower dimensions never accumulate into an uplift; low and very-high bands are not uplifted. Documentation support is reported as a separate `None`/`Partial`/`Strong` value in this slice and is not yet a mitigation source.

## Public report shape

`ComplexityAssessmentReport` contains:

- `availability`: `Pending`, `Available`, or `Unavailable`;
- `modelVersion` and `capabilityManifest`;
- one `OperationAssessment` per identified operation;
- absolute `distribution` and `coverage`;
- dense, document-relative `hotspots`; and
- a separate `needsAssessment` list for incomplete operations.

An operation identity is keyed by assessment scope, normalized method, and path. Every operation assessment contains confidence, all five dimension records, raw/final bands, documentation support, dominant/supporting dimensions, blocking faults/warnings, and deterministic reasons. Reasons contain a stable code, category, consumer role where applicable, canonical source identity, JSON Pointer, and structured values. No UI wording or copied OpenAPI graph is part of the report.

The initial reason catalogue includes `parameter`, `request-representation`, `response-case`, `response-header`, `response-representation`, `field`, `nesting-transition`, `collection-boundary`, `map-boundary`, `tuple-position`, `requiredness-obligation`, `optionality-obligation`, `nullable-value`, `validation-rule-family`, `non-default-serialization`, `unsupported-reference`, `unsupported-schema-composition`, `unsupported-schema-keyword`, `known-contract-affecting-extension`, `unsupported-protocol-obligations`, `unsupported-callback`, `unsupported-link`, and document faults such as `unsupported-openapi-version`, `no-identifiable-operations`, and `assessment-failed`. Codes are semantic data; the presentation adapter owns their wording.

The application publishes `Pending` before running the report in a Web Worker. A reset or replacement load invalidates earlier requests. Tree/list and SVG surfaces use the same presentation adapter for `Complexity: assessing…`, known bands, `Complexity: Unknown`, and `Complexity unavailable`.

## Evolution

Patch versions restore specified behaviour. Minor versions add supported semantics that can classify previously unknown contracts. Major versions may change contributions, thresholds, aggregation, mitigation, or band meanings. The decision history and acceptance criteria are recorded in GitHub issues [#231](https://github.com/dhutchison/OpenApiVisualiser/issues/231), [#234](https://github.com/dhutchison/OpenApiVisualiser/issues/234), and [#236](https://github.com/dhutchison/OpenApiVisualiser/issues/236).
