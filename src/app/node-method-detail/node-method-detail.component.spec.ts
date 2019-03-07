import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NodeMethodDetailComponent } from './node-method-detail.component';

describe('NodeMethodDetailComponent', () => {
  let component: NodeMethodDetailComponent;
  let fixture: ComponentFixture<NodeMethodDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NodeMethodDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NodeMethodDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
