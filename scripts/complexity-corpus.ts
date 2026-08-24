import {readFileSync, statSync} from 'node:fs';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {load} from 'js-yaml';
import {assessLoadedDocument} from '../src/app/complexity/complexity-engine';
import {AssessmentScopeInput, ComplexityAssessmentReport} from '../src/app/complexity/complexity.models';
import {CALIBRATION_MODEL, serializeComplexityReport} from '../src/app/complexity/complexity-calibration';

const PINNED_GITHUB_REVISION = 'd77b7dde24f7b3a52b3532b1337d4be8a60fb34d';
const WATCHDOG_MS = 60_000;
const BAND_ORDER = ['Low', 'Moderate', 'High', 'Very high', 'Unknown'];

interface CorpusEntry {
  readonly id: string;
  readonly source: string;
  readonly document: Record<string, unknown>;
  readonly report: ComplexityAssessmentReport;
}

function parseDocument(filename: string): Record<string, unknown> {
  const content = readFileSync(filename, 'utf8');
  const parsed = filename.endsWith('.yaml') || filename.endsWith('.yml') ? load(content) : JSON.parse(content);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`The corpus document ${filename} is not an object.`);
  }
  return parsed as Record<string, unknown>;
}

function scope(id: string, filename: string, document: Record<string, unknown>): AssessmentScopeInput {
  const sourceId = `file://${resolve(filename)}`;
  return {scopeId: id, sourceId, baseUri: sourceId, document, resourceSet: [{sourceId, baseUri: sourceId, document}]};
}

function assess(id: string, filename: string, document: Record<string, unknown>): CorpusEntry {
  return {id, source: filename, document, report: assessLoadedDocument(scope(id, filename, document))};
}

function operationDocument(document: Record<string, unknown>, path: string): Record<string, unknown> {
  const paths = document.paths as Record<string, unknown>;
  return {...document, paths: {[path]: paths[path]}};
}

function assertEquivalent(label: string, first: unknown, second: unknown): void {
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error(`${label} was not deterministic.`);
  }
}

function assessmentProfile(assessment: ComplexityAssessmentReport['assessments'][number]): unknown {
  const {identity: _identity, ...profile} = assessment;
  return profile;
}

function findAssessment(entry: CorpusEntry, path: string, method: string): CorpusEntry['report']['assessments'][number] {
  const assessment = entry.report.assessments.find(candidate => candidate.identity.path === path && candidate.identity.method === method);
  if (!assessment) throw new Error(`${entry.id} is missing ${method.toUpperCase()} ${path}.`);
  return assessment;
}

function assertDimensionOrdering(entry: CorpusEntry, lower: [string, string], higher: [string, string]): void {
  const left = findAssessment(entry, lower[0], lower[1]);
  const right = findAssessment(entry, higher[0], higher[1]);
  if (left.dimensions.interactionSurface.units >= right.dimensions.interactionSurface.units) {
    throw new Error(`${entry.id} does not preserve ${lower[1].toUpperCase()} ${lower[0]} < ${higher[1].toUpperCase()} ${higher[0]}.`);
  }
}

function assertBandOrdering(entry: CorpusEntry, lower: [string, string], higher: [string, string]): void {
  const left = findAssessment(entry, lower[0], lower[1]);
  const right = findAssessment(entry, higher[0], higher[1]);
  if (BAND_ORDER.indexOf(left.rawBand) >= BAND_ORDER.indexOf(right.rawBand)) {
    throw new Error(`${entry.id} does not preserve raw ${lower[1].toUpperCase()} ${lower[0]} < ${higher[1].toUpperCase()} ${higher[0]}.`);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const githubIndex = args.indexOf('--github');
  const githubFilename = githubIndex >= 0 ? args[githubIndex + 1] : undefined;
  const dereferencedIndex = args.indexOf('--github-dereferenced');
  const dereferencedFilename = dereferencedIndex >= 0 ? args[dereferencedIndex + 1] : undefined;
  const revisionIndex = args.indexOf('--github-revision');
  const suppliedRevision = revisionIndex >= 0 ? args[revisionIndex + 1] : PINNED_GITHUB_REVISION;
  if (githubIndex >= 0 && !githubFilename) throw new Error('--github requires a file path.');
  if (dereferencedIndex >= 0 && !dereferencedFilename) throw new Error('--github-dereferenced requires a file path.');
  if (dereferencedFilename && !githubFilename) throw new Error('--github-dereferenced requires --github.');
  if (suppliedRevision !== PINNED_GITHUB_REVISION) throw new Error(`Expected GitHub revision ${PINNED_GITHUB_REVISION}.`);

  const started = performance.now();
  const entries: CorpusEntry[] = [
    assess('corpus:petstore', 'sample_openapi/petstore3.json', parseDocument('sample_openapi/petstore3.json')),
    assess('corpus:uspto', 'sample_openapi/uspto.yaml', parseDocument('sample_openapi/uspto.yaml'))
  ];
  if (githubFilename) {
    entries.push(assess('corpus:github', githubFilename, parseDocument(githubFilename)));
  }
  if (dereferencedFilename) {
    entries.push(assess('corpus:github:dereferenced', dereferencedFilename, parseDocument(dereferencedFilename)));
  }

  const petstore = entries.find(entry => entry.id === 'corpus:petstore')!;
  const uspto = entries.find(entry => entry.id === 'corpus:uspto')!;
  assertDimensionOrdering(petstore, ['/user/logout', 'get'], ['/store/inventory', 'get']);
  assertDimensionOrdering(petstore, ['/store/inventory', 'get'], ['/pet/findByStatus', 'get']);
  assertDimensionOrdering(petstore, ['/pet/findByStatus', 'get'], ['/pet', 'put']);
  assertBandOrdering(uspto, ['/{dataset}/{version}/fields', 'get'], ['/{dataset}/{version}/records', 'post']);
  if (findAssessment(uspto, '/{dataset}/{version}/records', 'post').confidence !== 'Qualified') {
    throw new Error('USPTO records must retain Qualified confidence for its prose-defined query language.');
  }

  entries.forEach(entry => {
    const repeated = assess(entry.id, entry.source, entry.document).report;
    assertEquivalent(`${entry.id} repeated report`, serializeComplexityReport(entry.report), serializeComplexityReport(repeated));
    if (entry.report.availability !== 'Available') {
      throw new Error(`${entry.id} is ${entry.report.availability}: ${entry.report.failure?.code ?? 'unknown failure'}`);
    }
  });

  const githubEntry = entries.find(entry => entry.id === 'corpus:github');
  if (githubEntry) {
    const meta = githubEntry.report.assessments.find(assessment => assessment.identity.path === '/meta');
    if (meta) {
      const extractedDocument = operationDocument(githubEntry.document, '/meta');
      const extracted = assess('corpus:github:meta', `${githubEntry.source}#/meta`, extractedDocument).report.assessments[0];
      assertEquivalent('GitHub /meta extracted profile', assessmentProfile(meta), assessmentProfile(extracted));

      const paths = {...(githubEntry.document.paths as Record<string, unknown>), '/calibration/unrelated': {
        get: {responses: {'204': {description: 'Unrelated'}}}
      }};
      const isolated = assess('corpus:github:isolated', `${githubEntry.source}#isolated`, {...githubEntry.document, paths}).report.assessments
        .find(assessment => assessment.identity.path === '/meta');
      assertEquivalent('GitHub /meta unrelated-path isolation', assessmentProfile(meta), isolated && assessmentProfile(isolated));
    }

    ['/meta', '/repos/{owner}/{repo}', '/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',
      '/repos/{owner}/{repo}/pulls', '/repos/{owner}/{repo}/contents/{path}', '/repos/{owner}/{repo}/issues',
      '/user/repos', '/orgs/{org}/dependabot/alerts'].forEach(path => {
      const method = path === '/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches'
        || path === '/repos/{owner}/{repo}/pulls' || path === '/user/repos' ? 'post' : 'get';
      findAssessment(githubEntry, path, method);
    });
    const multiSegment = githubEntry.report.assessments.find(assessment => assessment.identity.path === '/repos/{owner}/{repo}/contents/{path}');
    if (multiSegment && multiSegment.finalBand !== 'Unknown') throw new Error('GitHub x-multi-segment must remain Unknown.');
  }

  const dereferenced = entries.find(entry => entry.id === 'corpus:github:dereferenced');
  if (githubEntry && dereferenced) {
    const bundledMeta = findAssessment(githubEntry, '/meta', 'get');
    const dereferencedMeta = findAssessment(dereferenced, '/meta', 'get');
    const bundledDimensions = {...bundledMeta.dimensions, indirection: undefined};
    const dereferencedDimensions = {...dereferencedMeta.dimensions, indirection: undefined};
    assertEquivalent('GitHub bundled/dereferenced non-indirection profile', bundledDimensions, dereferencedDimensions);
    if (BAND_ORDER.indexOf(dereferencedMeta.finalBand) > BAND_ORDER.indexOf(bundledMeta.finalBand) + 1) {
      throw new Error('GitHub dereferencing materially inflated the final band.');
    }
  }

  const elapsedMs = performance.now() - started;
  if (elapsedMs > WATCHDOG_MS) throw new Error(`Corpus assessment exceeded the ${WATCHDOG_MS}ms watchdog.`);
  const reportBytes = entries.reduce((total, entry) => total + Buffer.byteLength(serializeComplexityReport(entry.report)), 0);
  const sourceBytes = entries.reduce((total, entry) => total + statSync(entry.source).size, 0);
  console.log(JSON.stringify({
    modelVersion: CALIBRATION_MODEL,
    githubRevision: githubFilename ? suppliedRevision : null,
    sources: entries.map(entry => ({id: entry.id, source: entry.source, operations: entry.report.coverage.totalOperations})),
    operationCount: entries.reduce((total, entry) => total + entry.report.coverage.totalOperations, 0),
    sourceBytes,
    reportBytes,
    durationMs: Math.round(elapsedMs)
  }, null, 2));
}

main();
