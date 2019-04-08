import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiInformationComponent } from './api-information.component';
import { PanelModule } from 'primeng/panel';
import { FieldsetModule } from 'primeng/fieldset';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ApiInformationComponent', () => {
  let component: ApiInformationComponent;
  let fixture: ComponentFixture<ApiInformationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        ApiInformationComponent
      ],
      imports: [
        HttpClientTestingModule,

        FieldsetModule,
        PanelModule
      ]
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
