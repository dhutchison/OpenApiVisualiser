import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ExternalDocsComponent } from './external-docs.component';
import { PipesModule } from 'src/app/pipes/pipes.module';

describe('ExternalDocsComponent', () => {
  let component: ExternalDocsComponent;
  let fixture: ComponentFixture<ExternalDocsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        ExternalDocsComponent
      ],
      imports: [
        PipesModule
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExternalDocsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hide content when no document', () => {
    expect(fixture.debugElement.query(By.css('.external-document-link'))).toBeNull();
  });

  it('should show content when there is a document with only a URL', () => {

    const testUrl = 'https://www.google.com';

    component.document = { url: testUrl };
    fixture.detectChanges();

    const debugElement = fixture.debugElement.query(By.css('.external-document-link'));
    expect(debugElement).toBeDefined();

    expect(debugElement.nativeElement.getAttribute('href')).toEqual(testUrl);

    expect(debugElement.nativeElement.textContent.trim()).toBe(testUrl);
  });

  it('should show content when there is a document with a URL and description', () => {
    const testUrl = 'https://www.bbc.com';
    const testDescriptionMarkdown = 'The *BBC*';
    const testDescriptionText = 'The BBC';

    component.document = { 
      url: testUrl,
      description: testDescriptionMarkdown
    };
    fixture.detectChanges();

    const debugElement = fixture.debugElement.query(By.css('.external-document-link'));
    expect(debugElement).toBeDefined();
    expect(debugElement.nativeElement.getAttribute('href')).toEqual(testUrl);
    /* This is just grabbing the text of the HTML which was generated, not testing 
     * the markdown pipe except that it is called  */
    expect(debugElement.nativeElement.textContent.trim()).toBe(testDescriptionText);
  });
});
