# Operation contract complexity 1.0

The assessment model is `operation-contract-complexity/1.0.0`. It is advisory and document-scoped: a loaded OpenAPI root has one report, while roots in the same resource set remain independent scopes.

## Version-one boundary

The pure engine accepts an OpenAPI 3.0 or 3.1 root and emits JSON-serialisable report data. It supports effective operation parameters after path inheritance and overrides, scalar/object/array/map/tuple schemas, normalized request and response representations, response cases and headers, bodyless responses, role-projected requiredness and optionality, `readOnly`/`writeOnly`, defaults, version-appropriate nullability, validation families, dependent rules, non-default parameter serialization, supplied local and external references, composition, recursive schema groups, alternatives, discriminators, inherited and overridden security, operation servers and variables, response links, canonical callback operations, and role-aware examples. Documentation examples are read from operation inputs, parameters, media types, responses, schemas, and reusable `components/examples` through the supplied resource set; external example URLs are not fetched. Callback requests are assessed as inbound to the original consumer and callback responses as outbound; callback cycles terminate after each canonical callback operation is visited once. References resolve only through the supplied document resource set; the engine never fetches implicitly or copies source nodes into reports.

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

The raw band is the highest dimension level. A moderate or high dominant level receives a one-level breadth uplift when at least three dimensions independently reach that same level. Lower dimensions never accumulate into an uplift; low and very-high bands are not uplifted. Documentation support is classified independently as `None`, `Partial`, or `Strong`. Strong support requires valid, representative request/input guidance, the primary success outcome, and a materially distinct alternative/error outcome. Polymorphic examples must select a viable branch. Descriptions and incomplete examples remain Partial; duplicate, invalid, unreachable, and irrelevant examples add nothing. Strong support lowers a known raw band by exactly one level, never mitigates `Unknown`, and cannot lower `Low` further.

## Public report shape

`ComplexityAssessmentReport` contains:

- `availability`: `Pending`, `Available`, or `Unavailable`;
- `modelVersion` and `capabilityManifest`;
- one `OperationAssessment` per identified operation;
- absolute `distribution` and `coverage`;
- dense, document-relative `hotspots`; and
- a separate `needsAssessment` list for incomplete operations.

An operation identity is keyed by assessment scope, normalized method, and path. Every operation assessment contains confidence, all five dimension records, raw/final bands, documentation support, dominant/supporting dimensions, blocking faults/warnings, and deterministic reasons. Reasons contain a stable code, category, consumer role where applicable, canonical source identity, JSON Pointer, and structured values. No UI wording or copied OpenAPI graph is part of the report.

The reason catalogue includes `parameter`, `request-representation`, `response-case`, `response-header`, `response-representation`, `field`, `nesting-transition`, `collection-boundary`, `map-boundary`, `tuple-position`, `requiredness-obligation`, `optionality-obligation`, `nullable-value`, `validation-rule-family`, `non-default-serialization`, `discriminator-selector`, `reference-target`, `reference-chain-hop`, `external-document-boundary`, `composition-edge`, `alternative-branch`, `dependent-conditional-rule`, `recursive-structure`, `cycle-navigation`, `security-scheme`, `security-scope`, `security-flow`, `security-or-alternative`, `security-and-scheme`, `anonymous-auth-choice`, `server-alternative`, `server-variable`, `response-link`, `callback-operation`, `documentation-example`, `documentation-description`, `documentation-coverage`, and `documentation-mitigation`. Blocking faults include `unavailable-reference`, `unavailable-callback`, `contradictory-composition`, `unsupported-schema-keyword`, `invalid-discriminator`, `broken-discriminator-mapping` when alternatives are unavailable, `known-contract-affecting-extension`, invalid shapes, and document faults such as `unsupported-openapi-version`, `no-identifiable-operations`, and `assessment-failed`. A broken discriminator mapping with viable alternatives is a non-blocking warning. The capability manifest separately publishes supported semantics, unsupported contract-affecting semantics, known contract-affecting extensions such as `x-multi-segment`, and ignored non-semantic extensions. Codes are semantic data; the presentation adapter owns their wording.

The application publishes `Pending` before running the report in a Web Worker. A reset or replacement load invalidates earlier requests. Tree/list and SVG surfaces use the same presentation adapter for `Complexity: assessing…`, known bands, `Complexity: Unknown`, and `Complexity unavailable`.

## Endpoint explanation

The endpoint detail dialog uses Variant C, **Explain the burden**, as the production presentation baseline. It presents the final band and dominant burden first, then the separate assessment confidence, raw band, final band, documentation support, dimension profile, and source-attributed reason disclosures. The explanation is rendered from the structured report through the complexity presentation adapter and precedes Swagger UI; Swagger UI remains available for Pending, Unavailable, and Incomplete assessments.

Pending is labelled `Assessing operation complexity…`; Unavailable shows the scope diagnostic; and an Available but Incomplete operation shows `Unknown` with its blocking faults. These lifecycle and confidence states remain distinct. The explanation uses text alongside any level styling, native disclosure controls, semantic headings, and labelled source details so colour is not required to understand the result.

The retained prototype screenshots remain available for future reconsideration in the [Variant A screenshot](https://github.com/dhutchison/OpenApiVisualiser/blob/25ad283cc0949f135858bdaed7fd6c2eb68f3bbd/.codex/wayfinder-235-prototype/src/app/components/complexity-explanation-prototype/screenshots/variant-a.png), [Variant B screenshot](https://github.com/dhutchison/OpenApiVisualiser/blob/25ad283cc0949f135858bdaed7fd6c2eb68f3bbd/.codex/wayfinder-235-prototype/src/app/components/complexity-explanation-prototype/screenshots/variant-b.png), and [Variant C screenshot](https://github.com/dhutchison/OpenApiVisualiser/blob/25ad283cc0949f135858bdaed7fd6c2eb68f3bbd/.codex/wayfinder-235-prototype/src/app/components/complexity-explanation-prototype/screenshots/variant-c.png).

## Summary presentation

The Summary section renders one complexity scope for every loaded OpenAPI root. Scope lifecycle state is independent: Pending shows `Assessing operation complexity…`, Available renders its own coverage, absolute final-band distribution, dense hotspot list, and Needs assessment group, and Unavailable keeps the ordinary API summary visible while showing the assessment diagnostic.

The first ten known hotspot entries are shown in document-relative order. A native `Show all` button reveals the remaining entries. When the tenth entry shares a dense tier with later entries, the summary reports the exact number of additional operations in that tier; no method or path is presented as lower-ranked merely because it appears later in the display order. Incomplete operations appear only under Needs assessment. Summary copy explicitly distinguishes these relative tiers from stable absolute bands and never uses percentile labels.

## Calibration corpus and full-corpus verification

The version-one calibration corpus is retained in `src/app/complexity/complexity-calibration.ts` and exercised through the public `assessLoadedDocument` boundary. Synthetic families `S0`–`S9` cover one-variable surface changes, shape depth and recursion, conditionality, indirection, protocol obligations, documentation support, confidence faults, role identity, and cross-dimension boundaries. The extracted real anchors are `R1`–`R9` from the repository Petstore and USPTO fixtures, `U1`–`U3` from `openapi3-examples@9c2997e1a25919a8182080cc43a4db06d2dc775d`, and `G1`–`G8` from `github/rest-api-description@d77b7dde24f7b3a52b3532b1337d4be8a60fb34d` (API version `2022-11-28`). Each fixture has a stable ID and provenance string; partial orders are asserted without introducing a hidden cross-dimension score.

Run `npm run complexity:corpus` to assess all complete repository examples. To include the pinned bundled GitHub description, download that immutable JSON revision into a local workspace path and run `npm run complexity:corpus -- --github /path/to/api.github.com.2022-11-28.json`. Supply the matching dereferenced control with `--github-dereferenced /path/to/api.github.com.2022-11-28.deref.json`. The command repeats each report for byte-equivalent serialization, checks the Petstore/USPTO anchors, extracted-operation equivalence, unrelated-path isolation, and bundled/dereferenced non-indirection equivalence when those GitHub documents are supplied, and records model version, pinned revision, source sizes, operation count, report size, and duration. It fails if assessment exceeds the initial 60-second watchdog. The multi-megabyte GitHub source is intentionally not part of ordinary unit-test startup; its immutable revision and expected source provenance are recorded here and in the fixture manifest.

Calibration results are diagnostic rather than a target distribution. A disagreement is corrected through a generally applicable semantic rule and recorded with the affected anchors; no fixture-specific threshold or ranking adjustment is permitted. The `x-prose-defined-language` marker used by the USPTO records anchor preserves a machine-readable `Qualified` warning for its prose-defined Lucene mini-language without pretending that the language is structurally assessed. GitHub's reachable `x-multi-segment` remains `Incomplete`/`Unknown` until a versioned capability is deliberately added.

## Evolution

Patch versions restore specified behaviour. Minor versions add supported semantics that can classify previously unknown contracts. Major versions may change contributions, thresholds, aggregation, mitigation, or band meanings. The decision history and acceptance criteria are recorded in GitHub issues [#231](https://github.com/dhutchison/OpenApiVisualiser/issues/231), [#234](https://github.com/dhutchison/OpenApiVisualiser/issues/234), [#236](https://github.com/dhutchison/OpenApiVisualiser/issues/236), [#242](https://github.com/dhutchison/OpenApiVisualiser/issues/242), and [#243](https://github.com/dhutchison/OpenApiVisualiser/issues/243).
