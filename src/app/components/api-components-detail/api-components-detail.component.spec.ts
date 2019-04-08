import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiComponentsDetailComponent } from './api-components-detail.component';

describe('ApiComponentsDetailComponent', () => {
  let component: ApiComponentsDetailComponent;
  let fixture: ComponentFixture<ApiComponentsDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ApiComponentsDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApiComponentsDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
