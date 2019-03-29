import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiPathTreeComponent } from './api-path-tree.component';

describe('ApiPathTreeComponent', () => {
  let component: ApiPathTreeComponent;
  let fixture: ComponentFixture<ApiPathTreeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ApiPathTreeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApiPathTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
