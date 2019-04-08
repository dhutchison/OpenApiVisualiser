import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiComponentsDetailComponent } from './api-components-detail.component';
import { AccordionModule } from 'primeng/accordion';
import { SchemaDetailComponent } from './schema-detail/schema-detail.component';
import { TreeTableModule } from 'primeng/treetable';
import { StringReplacePipe } from 'src/app/pipes/stringreplacepipe.pipe';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ApiComponentsDetailComponent', () => {
  let component: ApiComponentsDetailComponent;
  let fixture: ComponentFixture<ApiComponentsDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        ApiComponentsDetailComponent,
        SchemaDetailComponent,
        StringReplacePipe
      ],
      imports: [
        AccordionModule,
        TreeTableModule,

        HttpClientTestingModule,
      ]
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
