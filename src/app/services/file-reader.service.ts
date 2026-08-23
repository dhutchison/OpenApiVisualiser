import { Injectable, inject } from '@angular/core';
import { Observable, Subject, catchError, forkJoin, map, of } from 'rxjs';
import { OpenAPIObject } from 'openapi3-ts/oas31';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import * as jsyaml from 'js-yaml';
import {
  DocumentResource,
  DocumentResourceSet,
  LoadDiagnostic,
  LoadedDocument,
  canonicalizeUri,
  createLoadedDocument,
  createSyntheticFileUri
} from '../models/loaded-document.models';

interface FileLoadResult {
  readonly file: File;
  readonly content?: string;
  readonly error?: unknown;
}

interface ParsedDocument {
  readonly sourceId: string;
  readonly baseUri: string;
  readonly document?: OpenAPIObject;
  readonly diagnostic?: LoadDiagnostic;
}

@Injectable({
  providedIn: 'root'
})
export class FileReaderService {

  private readonly http = inject(HttpClient);

  /** Subjects are deliberately non-replaying: reset must not resurrect a stale root. */
  readonly apiChanged = new Subject<LoadedDocument>();

  /** Notify consumers that all loaded roots and derived state must be cleared. */
  readonly resetFiles = new Subject<void>();

  /** Notify the UI that a file or URL could not be loaded. */
  readonly loadFailed = new Subject<string>();

  /** Structured diagnostics for failed loads that have no parsed root envelope. */
  readonly loadDiagnostics = new Subject<LoadDiagnostic>();

  private loadGeneration = 0;

  constructor() {
    /* Reset also invalidates asynchronous reads that are still pending. */
    this.resetFiles.subscribe(() => this.loadGeneration++);
  }

  /** Load one browser file as a one-document resource set. */
  loadFile(file: File) {
    this.loadFiles([file]);
  }

  /**
   * Load all files selected in one browser action as a single resource set.
   * Roots are published only after every file has been read and parsed, so
   * publication order cannot change reference availability.
   */
  loadFiles(files: readonly File[]) {
    if (files.length === 0) {
      return;
    }

    const generation = ++this.loadGeneration;
    forkJoin(files.map(file => this.loadFileData(file).pipe(
      map(content => ({file, content} as FileLoadResult)),
      catchError(error => of({file, error} as FileLoadResult))
    ))).subscribe(results => {
      if (generation !== this.loadGeneration) {
        return;
      }

      this.publishBatch(results, generation);
    });
  }

  /** Load a URL as a one-document resource set. */
  loadFileFromURL(url: string) {
    const generation = ++this.loadGeneration;

    this.http.get(url, {responseType: 'text'}).subscribe({
      next: fileContent => {
        const sourceId = this.canonicalizeUrl(url);
        const parsed = this.parseDocument(fileContent, this.isYamlSource(url), sourceId);

        if (generation !== this.loadGeneration) {
          return;
        }

        if (parsed.document) {
          const resource = this.createResource(parsed);
          const resourceSet = new DocumentResourceSet([resource]);
          this.apiChanged.next(createLoadedDocument(parsed.document, sourceId, resourceSet, parsed.diagnostic ? [parsed.diagnostic] : []));
        } else {
          this.reportLoadFailure(
            parsed.diagnostic ?? this.createDiagnostic('invalid-openapi-root', 'The document is not a valid OpenAPI root.', sourceId),
            url
          );
        }
      },
      error: error => {
        if (generation === this.loadGeneration) {
          this.handleUrlLoadFailure(url, error);
        }
      }
    });
  }

  private handleUrlLoadFailure(url: string, error: HttpErrorResponse) {
    console.error(error);

    const status = error.status > 0 ? ` (${error.status} ${error.statusText})` : '';
    this.reportLoadFailure(
      this.createDiagnostic('read-failed', `Could not load the API definition from ${url}${status}.`, this.canonicalizeUrl(url)),
      url
    );
  }

  private publishBatch(results: readonly FileLoadResult[], generation: number) {
    const parsedDocuments = results.map(result => this.parseFileResult(result));
    const resources = parsedDocuments
      .filter((parsed): parsed is ParsedDocument & {document: OpenAPIObject} => !!parsed.document)
      .map(parsed => this.createResource(parsed));
    const resourceSet = new DocumentResourceSet(resources);
    const diagnostics = this.createBatchDiagnostics(parsedDocuments);
    const publishedSources = new Set<string>();

    parsedDocuments
      .filter((parsed): parsed is ParsedDocument & {document: OpenAPIObject} => !!parsed.document)
      .forEach(parsed => {
        if (generation !== this.loadGeneration) {
          return;
        }

        if (publishedSources.has(parsed.sourceId)) {
          return;
        }
        publishedSources.add(parsed.sourceId);

        this.apiChanged.next(createLoadedDocument(parsed.document, parsed.sourceId, resourceSet, diagnostics));
      });

    parsedDocuments
      .filter((parsed): parsed is ParsedDocument & {diagnostic: LoadDiagnostic} => !parsed.document && !!parsed.diagnostic)
      .forEach(parsed => {
        if (generation === this.loadGeneration) {
          this.reportLoadFailure(parsed.diagnostic, parsed.sourceId);
        }
      });
  }

  private loadFileData(file: File): Observable<string> {
    return new Observable<string>(observer => {
      const reader = new FileReader();
      reader.onloadend = () => {
        observer.next(reader.result as string);
        observer.complete();
      };
      reader.onerror = () => observer.error(reader.error ?? new Error('Unable to read the file.'));
      reader.readAsText(file);
    });
  }

  private parseFileResult(result: FileLoadResult): ParsedDocument {
    const relativeName = this.getRelativeFileName(result.file);
    const sourceId = createSyntheticFileUri(relativeName);

    if (result.error) {
      return {
        sourceId,
        baseUri: sourceId,
        diagnostic: this.createDiagnostic('read-failed', `Could not read ${relativeName}: ${this.errorMessage(result.error)}.`, sourceId)
      };
    }

    return this.parseDocument(result.content ?? '', this.isYamlSource(relativeName), sourceId);
  }

  private parseDocument(fileContent: string, yaml: boolean, sourceId: string): ParsedDocument {
    try {
      const document = yaml ? jsyaml.load(fileContent) : JSON.parse(fileContent);

      if (!document || typeof document !== 'object' || typeof (document as OpenAPIObject).openapi !== 'string') {
        return {
          sourceId,
          baseUri: sourceId,
          diagnostic: this.createDiagnostic('invalid-openapi-root', 'The document does not contain a valid OpenAPI root.', sourceId)
        };
      }

      return {sourceId, baseUri: sourceId, document: document as OpenAPIObject};
    } catch (error) {
      return {
        sourceId,
        baseUri: sourceId,
        diagnostic: this.createDiagnostic('parse-failed', `The document could not be parsed: ${this.errorMessage(error)}.`, sourceId)
      };
    }
  }

  private createResource(parsed: ParsedDocument): DocumentResource {
    return {
      sourceId: parsed.sourceId,
      baseUri: parsed.baseUri,
      document: parsed.document as OpenAPIObject
    };
  }

  private createBatchDiagnostics(parsedDocuments: readonly ParsedDocument[]): LoadDiagnostic[] {
    const diagnostics = parsedDocuments.flatMap(parsed => parsed.diagnostic ? [parsed.diagnostic] : []);
    const seen = new Set<string>();

    parsedDocuments.forEach(parsed => {
      if (seen.has(parsed.sourceId)) {
        diagnostics.push(this.createDiagnostic(
          'duplicate-source-identity',
          `The source identity ${parsed.sourceId} is duplicated in this upload batch; references would be ambiguous.`,
          parsed.sourceId
        ));
      }
      seen.add(parsed.sourceId);
    });

    return diagnostics;
  }

  private createDiagnostic(code: LoadDiagnostic['code'], message: string, sourceId?: string): LoadDiagnostic {
    return {code, severity: 'error', message, sourceId};
  }

  private canonicalizeUrl(url: string): string {
    try {
      return canonicalizeUri(url);
    } catch {
      return url;
    }
  }

  private getRelativeFileName(file: File): string {
    return (file as File & {webkitRelativePath?: string}).webkitRelativePath || file.name;
  }

  private isYamlSource(source: string): boolean {
    return /\.ya?ml(?:[?#].*)?$/i.test(source);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private reportLoadFailure(diagnostic: LoadDiagnostic, displaySource: string) {
    this.loadDiagnostics.next(diagnostic);
    this.loadFailed.next(diagnostic.message.startsWith('Could not load')
      ? diagnostic.message
      : `Could not load the API definition from ${displaySource}. ${diagnostic.message}`);
  }
}
