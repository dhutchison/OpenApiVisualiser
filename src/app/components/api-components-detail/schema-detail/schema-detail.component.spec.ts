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
});
