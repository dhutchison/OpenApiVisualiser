import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiInformationComponent } from './api-information.component';

describe('ApiInformationComponent', () => {
  let component: ApiInformationComponent;
  let fixture: ComponentFixture<ApiInformationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ApiInformationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApiInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
