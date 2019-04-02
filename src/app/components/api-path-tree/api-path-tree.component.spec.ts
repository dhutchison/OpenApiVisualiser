import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiPathTreeComponent } from './api-path-tree.component';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TreeModule } from 'primeng/tree';
import { NodeMethodDetailComponent } from '../node-detail/node-method-detail/node-method-detail.component';
import { TreeOrientationPipe } from 'src/app/pipes/tree-orientation.pipe';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { FieldsetModule } from 'primeng/fieldset';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ApiPathTreeComponent', () => {
  let component: ApiPathTreeComponent;
  let fixture: ComponentFixture<ApiPathTreeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        ApiPathTreeComponent,
        NodeMethodDetailComponent,
        TreeOrientationPipe
      ],
      imports: [
        ButtonModule,
        FieldsetModule,
        InputSwitchModule,
        FormsModule,
        PanelModule,
        TooltipModule,
        TreeModule,

        HttpClientTestingModule
      ]
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
