import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ApiTagsComponent } from './api-tags.component';
import { ExternalDocsComponent } from '../external-docs/external-docs.component';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PipesModule } from '../../pipes/pipes.module';

describe('ApiTagsComponent', () => {
  let component: ApiTagsComponent;
  let fixture: ComponentFixture<ApiTagsComponent>;

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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
