import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ApiInformationComponent } from './api-information.component';
import { PanelModule } from 'primeng/panel';
import { FieldsetModule } from 'primeng/fieldset';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PipesModule } from '../../pipes/pipes.module';

describe('ApiInformationComponent', () => {
  let component: ApiInformationComponent;
  let fixture: ComponentFixture<ApiInformationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        ApiInformationComponent
      ],
      imports: [
        HttpClientTestingModule,

        FieldsetModule,
        PanelModule,
        PipesModule
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
