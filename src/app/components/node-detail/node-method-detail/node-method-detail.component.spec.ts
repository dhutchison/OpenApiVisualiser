import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NodeMethodDetailComponent } from './node-method-detail.component';
import { ButtonModule } from 'primeng/button';
import { FieldsetModule } from 'primeng/fieldset';
import { PanelModule } from 'primeng/panel';

describe('NodeMethodDetailComponent', () => {
  let component: NodeMethodDetailComponent;
  let fixture: ComponentFixture<NodeMethodDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        NodeMethodDetailComponent
      ],
      imports: [
        ButtonModule,
        FieldsetModule,
        PanelModule
      ]
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
