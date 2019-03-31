import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiTagsComponent } from './api-tags.component';

describe('ApiTagsComponent', () => {
  let component: ApiTagsComponent;
  let fixture: ComponentFixture<ApiTagsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ApiTagsComponent ]
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
