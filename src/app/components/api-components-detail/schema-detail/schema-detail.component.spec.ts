import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SchemaDetailComponent } from './schema-detail.component';

describe('SchemaDetailComponent', () => {
  let component: SchemaDetailComponent;
  let fixture: ComponentFixture<SchemaDetailComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        SchemaDetailComponent
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SchemaDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders recursive property details and toggles nested properties', () => {
    component.apiSpec = {
      openapi: '3.1.0',
      info: {title: 'Pets', version: '1.0.0'},
      paths: {}
    };
    component.schema = {
      type: 'object',
      required: ['id', 'owner'],
      properties: {
        id: {type: 'integer', description: 'Pet identifier'},
        owner: {
          type: 'object',
          description: 'The pet owner',
          required: ['name'],
          properties: {
            name: {type: 'string', description: 'Owner name'}
          }
        }
      }
    };

    component.ngOnChanges();
    fixture.detectChanges();

    expect(component.treeModel.map(node => node.label)).toEqual(['id', 'owner']);
    const owner = fixture.nativeElement.querySelector('[data-schema-property="owner"]') as HTMLElement;
    const ownerToggle = owner.querySelector('button[aria-expanded]') as HTMLButtonElement;

    expect(fixture.nativeElement.querySelector('[data-schema-property="id"]')).toBeTruthy();
    expect(owner.textContent).toContain('object');
    expect(owner.textContent).toContain('The pet owner');
    expect(owner.textContent).toContain('required');
    expect(ownerToggle.getAttribute('aria-label')).toBe('Expand owner');
    expect(fixture.nativeElement.querySelector('[data-schema-property="name"]')).toBeNull();

    ownerToggle.click();
    fixture.detectChanges();

    expect(ownerToggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('[data-schema-property="name"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-schema-property="name"]')?.textContent).toContain('required');
  });

  it('resolves reference, union, inferred, and fallback property types', () => {
    expect(component.getType({data: {$ref: '#/components/schemas/Pet'}} as any)).toBe('reference');
    expect(component.getType({data: {type: ['string', 'null']}} as any)).toBe('string | null');
    expect(component.getType({data: {type: 'integer'}} as any)).toBe('integer');
    expect(component.getType({data: {properties: {id: {type: 'integer'}}}} as any)).toBe('object');
    expect(component.getType({data: {}} as any)).toBe('schema');
  });

  it('renders references, formats, and descriptions for schema properties', () => {
    component.apiSpec = {
      openapi: '3.1.0',
      info: {title: 'Pets', version: '1.0.0'},
      paths: {},
      components: {
        schemas: {
          Owner: {type: 'object', properties: {name: {type: 'string'}}}
        }
      }
    };
    component.schema = {
      type: 'object',
      properties: {
        id: {type: 'integer', format: 'int64'},
        owner: {$ref: '#/components/schemas/Owner'},
        notes: {type: 'string', description: 'Pet **notes**'}
      }
    };

    component.ngOnChanges();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-schema-property="id"]')?.textContent)
      .toContain('Format: int64');
    expect(fixture.nativeElement.querySelector('[data-schema-property="owner"] a')?.getAttribute('href'))
      .toBe('#_components_schemas_Owner');
    expect(fixture.nativeElement.querySelector('[data-schema-property="notes"]')?.innerHTML)
      .toContain('<strong>notes</strong>');
  });
});
