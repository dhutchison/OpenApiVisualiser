import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SchemaDetailComponent } from './schema-detail.component';
import { TreeTableModule } from 'primeng/treetable';
import { PipesModule } from 'src/app/pipes/pipes.module';

describe('SchemaDetailComponent', () => {
  let component: SchemaDetailComponent;
  let fixture: ComponentFixture<SchemaDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        SchemaDetailComponent,
      ],
      imports: [
        PipesModule,
        TreeTableModule
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SchemaDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
