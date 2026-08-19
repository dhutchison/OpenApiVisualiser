import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ApiTagsComponent } from './api-tags.component';
import { ExternalDocsComponent } from '../external-docs/external-docs.component';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PipesModule } from '../../pipes/pipes.module';
import { FileReaderService } from '../../services/file-reader.service';
import { OpenAPIObject } from 'openapi3-ts/oas31';

describe('ApiTagsComponent', () => {
  let component: ApiTagsComponent;
  let fixture: ComponentFixture<ApiTagsComponent>;
  let fileReaderService: FileReaderService;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ApiTagsComponent,
        ExternalDocsComponent,
        PipesModule
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApiTagsComponent);
    component = fixture.componentInstance;
    fileReaderService = TestBed.inject(FileReaderService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders an empty state when the API has no tags or operations', async () => {
    fileReaderService.apiChanged.next({
      openapi: '3.1.0',
      info: {title: 'Empty API', version: '1.0.0'},
      paths: {}
    });
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    expect(fixture.nativeElement.querySelector('.empty-state')?.textContent)
      .toContain('No tags are defined or used by this API.');
  });

  it('summarises declared, inferred, and untagged operations', async () => {
    const api: OpenAPIObject = {
      openapi: '3.1.0',
      info: {title: 'Tagged API', version: '1.0.0'},
      tags: [
        {
          name: 'pets',
          description: 'Pet operations',
          externalDocs: {url: 'https://example.test/pets'}
        },
        {name: 'unused'}
      ],
      paths: {
        '/pets': {
          get: {tags: ['pets'], summary: 'List pets'},
          post: {tags: ['pets'], operationId: 'createPet'},
          put: {tags: []},
          delete: {tags: ['admin']},
          options: {tags: ['admin']},
          head: {tags: ['admin']},
          patch: {tags: ['admin']},
          trace: {tags: ['admin']}
        }
      }
    } as OpenAPIObject;

    fileReaderService.apiChanged.next(api);
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    const cards = fixture.nativeElement.querySelectorAll('.detail-item') as NodeListOf<HTMLElement>;
    expect(cards).toHaveSize(4);

    const cardFor = (name: string) => [...cards].find(card => card.querySelector('h3')?.textContent?.trim() === name) as HTMLElement;

    const pets = cardFor('pets');
    expect(pets.textContent).toContain('pets');
    expect(pets.textContent).toContain('2 operations');
    expect(pets.textContent).toContain('Pet operations');
    expect(pets.textContent).toContain('List pets');
    expect(pets.textContent).toContain('createPet');
    expect(pets.querySelector('app-external-docs')).toBeTruthy();

    const untagged = cardFor('Untagged');
    expect(untagged.textContent).toContain('Untagged');
    expect(untagged.textContent).toContain('1 operation');

    const admin = cardFor('admin');
    expect(admin.textContent).toContain('admin');
    expect(admin.textContent).toContain('5 operations');
    expect([...admin.querySelectorAll('.operation-list li')].map(operation => operation.textContent?.replace(/\s+/g, ' ').trim()))
      .toEqual([
        'DELETE/pets',
        'OPTIONS/pets',
        'HEAD/pets',
        'PATCH/pets',
        'TRACE/pets'
      ]);

    const unused = cardFor('unused');
    expect(unused.textContent).toContain('0 operations');
    expect(unused.querySelector('.operation-list')).toBeNull();
  });

  it('clears tag summaries when files are reset', async () => {
    fileReaderService.apiChanged.next({
      openapi: '3.1.0',
      info: {title: 'Tagged API', version: '1.0.0'},
      paths: {'/pets': {get: {tags: ['pets']}}}
    });
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    fileReaderService.resetFiles.next();
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
    await fixture.whenStable();
    fixture.detectChanges(false);

    expect(component.tagSummaries).toEqual([]);
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
  });
});
