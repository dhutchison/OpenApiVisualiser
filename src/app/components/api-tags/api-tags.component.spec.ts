import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiTagsComponent } from './api-tags.component';
import { ExternalDocsComponent } from '../external-docs/external-docs.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ApiTagsComponent', () => {
  let component: ApiTagsComponent;
  let fixture: ComponentFixture<ApiTagsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        ApiTagsComponent,
        ExternalDocsComponent
      ],
      imports: [
        HttpClientTestingModule
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApiTagsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
