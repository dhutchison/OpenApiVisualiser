import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SchemaDetailComponent } from './schema-detail.component';
import { TreeTableModule } from 'primeng/treetable';
import { PipesModule } from '../../../pipes/pipes.module';

describe('SchemaDetailComponent', () => {
  let component: SchemaDetailComponent;
  let fixture: ComponentFixture<SchemaDetailComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        SchemaDetailComponent,
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
