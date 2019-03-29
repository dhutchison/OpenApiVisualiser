import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UrlChooserComponent } from './url-chooser.component';

describe('UrlChooserComponent', () => {
  let component: UrlChooserComponent;
  let fixture: ComponentFixture<UrlChooserComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UrlChooserComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UrlChooserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
