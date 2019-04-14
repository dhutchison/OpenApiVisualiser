import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ExternalDocsComponent } from './external-docs.component';
import { PipesModule } from 'src/app/pipes/pipes.module';

describe('ExternalDocsComponent', () => {
  let component: ExternalDocsComponent;
  let fixture: ComponentFixture<ExternalDocsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        ExternalDocsComponent
      ],
      imports: [
        PipesModule
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExternalDocsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
