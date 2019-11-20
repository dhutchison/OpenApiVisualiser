import { HttpClientTestingModule } from '@angular/common/http/testing';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { ApiPathTreeComponent } from './api-path-tree.component';
import { NodeMethodDetailComponent } from '../node-detail/node-method-detail/node-method-detail.component';

import { PipesModule } from 'src/app/pipes/pipes.module';

import { ButtonModule } from 'primeng/button';
import { FieldsetModule } from 'primeng/fieldset';
import { InputSwitchModule } from 'primeng/inputswitch';
import { PanelModule } from 'primeng/panel';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';

describe('ApiPathTreeComponent', () => {
  let component: ApiPathTreeComponent;
  let fixture: ComponentFixture<ApiPathTreeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        ApiPathTreeComponent,
        NodeMethodDetailComponent,
      ],
      imports: [
        ButtonModule,
        FieldsetModule,
        InputSwitchModule,
        FormsModule,
        PanelModule,
        PipesModule,
        SelectButtonModule,
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

  it('should allow view orientation to be set', () => {
    /* Check the default value */
    expect(component.horizontalView).toBeTruthy();

    /* Set the value and check it is still set */
    component.horizontalView = false;
    expect(component.horizontalView).toBeFalsy();


  });

});
