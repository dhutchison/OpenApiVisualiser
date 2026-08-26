# Operation contract complexity 1.0

The assessment model is `operation-contract-complexity/1.0.0`. It is advisory and document-scoped: a loaded OpenAPI root has one report, while roots in the same resource set remain independent scopes.

## Version-one boundary

The pure engine accepts an OpenAPI 3.0 or 3.1 root and emits JSON-serialisable report data. It supports effective operation parameters after path inheritance and overrides, scalar/object/array/map/tuple schemas, normalized request and response representations, response cases and headers, bodyless responses, role-projected requiredness and optionality, `readOnly`/`writeOnly`, defaults, version-appropriate nullability, validation families, dependent rules, non-default parameter serialization, supplied local and external references, composition, recursive schema groups, alternatives, discriminators, inherited and overridden security, operation servers and variables, response links, and canonical callback operations. Callback requests are assessed as inbound to the original consumer and callback responses as outbound; callback cycles terminate after each canonical callback operation is visited once. References resolve only through the supplied document resource set; the engine never fetches implicitly or copies source nodes into reports.

OpenAPI 3.0 uses the supported Schema Object subset, including `nullable` and `dependencies`; OpenAPI 3.1 uses the supported JSON Schema 2020-12-aligned subset, including typed nullability, `const`, tuple `prefixItems`, `dependentRequired`, and `dependentSchemas`. A keyword outside the declared version's capability set is a blocking fault. The engine does not claim full JSON Schema 2020-12 support.

An unavailable reachable reference, contradictory composition, invalid callback, or contract-affecting semantic outside the capability manifest is a blocking fault. The operation keeps its partial evidence, but its confidence is `Incomplete` and its raw and final bands are `Unknown`. Faults in unreachable components do not contaminate independent operations. Unsupported document versions or documents with no identifiable operations make the scope `Unavailable`; they do not hide an otherwise parseable API.

## Dimensions and thresholds

Evidence units belong to one dimension. Levels are classified independently:

| Dimension | Low | Moderate | High | Very high |
| --- | ---: | ---: | ---: | ---: |
| Interaction surface | 0–3 | 4–7 | 8–14 | 15+ |
| Data shape | 0–5 | 6–15 | 16–39 | 40+ |
| Conditionality | 0–3 | 4–8 | 9–19 | 20+ |
| Indirection | 0–2 | 3–6 | 7–14 | 15+ |
| Protocol obligations | 0–2 | 3–6 | 7–12 | 13+ |

Interaction surface counts effective parameters, normalized request representations, response cases, response headers, and normalized response representations. Shared effective schemas are deduplicated for data shape while remaining distinct representation choices. A declared representation without a schema is blocking; a response without `content` is a valid bodyless case, and status codes, ranges, and `default` are each counted once. Data shape counts unique consumer-visible fields or tuple positions, nesting transitions, and collection/map/tuple boundaries. Conditionality counts role-sensitive requiredness and optionality, nullability, independent validation families, alternatives, discriminator selectors, dependent rules, and non-default serialization. Paired lower/upper bounds are one range family; equivalent constraints are deduplicated. Discriminator mappings preserve alternatives; broken mappings are warnings when viable alternatives remain and blocking faults when they do not. Four and eight viable alternatives escalate conditionality to High and Very high. Cross-field/dependent rules set at least High, and nested interacting conditional layers set Very high. Indirection counts canonical reference targets, chain hops, external boundaries, composition edges, and recursive cycles. Protocol counts effective security requirements (including OR, AND, anonymous choices, scopes, flows, and empty overrides), operation server alternatives and variables, response links, and four units per canonical callback operation. Callbacks set Protocol obligations to at least High; three simultaneously required security schemes do likewise.

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

The reason catalogue includes `parameter`, `request-representation`, `response-case`, `response-header`, `response-representation`, `field`, `nesting-transition`, `collection-boundary`, `map-boundary`, `tuple-position`, `requiredness-obligation`, `optionality-obligation`, `nullable-value`, `validation-rule-family`, `non-default-serialization`, `discriminator-selector`, `reference-target`, `reference-chain-hop`, `external-document-boundary`, `composition-edge`, `alternative-branch`, `dependent-conditional-rule`, `recursive-structure`, `cycle-navigation`, `security-scheme`, `security-scope`, `security-flow`, `security-or-alternative`, `security-and-scheme`, `anonymous-auth-choice`, `server-alternative`, `server-variable`, `response-link`, and `callback-operation`. Blocking faults include `unavailable-reference`, `unavailable-callback`, `contradictory-composition`, `unsupported-schema-keyword`, `invalid-discriminator`, `broken-discriminator-mapping` when alternatives are unavailable, `known-contract-affecting-extension`, invalid shapes, and document faults such as `unsupported-openapi-version`, `no-identifiable-operations`, and `assessment-failed`. A broken discriminator mapping with viable alternatives is a non-blocking warning. The capability manifest separately publishes supported semantics, unsupported contract-affecting semantics, known contract-affecting extensions such as `x-multi-segment`, and ignored non-semantic extensions. Codes are semantic data; the presentation adapter owns their wording.

The application publishes `Pending` before running the report in a Web Worker. A reset or replacement load invalidates earlier requests. Tree/list and SVG surfaces use the same presentation adapter for `Complexity: assessing…`, known bands, `Complexity: Unknown`, and `Complexity unavailable`.

## Evolution

Patch versions restore specified behaviour. Minor versions add supported semantics that can classify previously unknown contracts. Major versions may change contributions, thresholds, aggregation, mitigation, or band meanings. The decision history and acceptance criteria are recorded in GitHub issues [#231](https://github.com/dhutchison/OpenApiVisualiser/issues/231), [#234](https://github.com/dhutchison/OpenApiVisualiser/issues/234), and [#236](https://github.com/dhutchison/OpenApiVisualiser/issues/236).
