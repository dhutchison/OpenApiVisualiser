import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { ApiPathTreeComponent } from './api-path-tree.component';
import { EndpointSwaggerComponent } from '../endpoint-swagger/endpoint-swagger.component';

import { PipesModule } from '../../pipes/pipes.module';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FieldsetModule } from 'primeng/fieldset';
import { PanelModule } from 'primeng/panel';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { TreeModule } from 'primeng/tree';

describe('ApiPathTreeComponent', () => {
  let component: ApiPathTreeComponent;
  let fixture: ComponentFixture<ApiPathTreeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        ApiPathTreeComponent,
        EndpointSwaggerComponent
      ],
      imports: [
        ButtonModule,
        DialogModule,
        FieldsetModule,
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

  it('should export using the rendered tree background colour', async () => {
    const treeViewElement = fixture.nativeElement.querySelector('.tree-view') as HTMLElement;
    spyOn(window, 'saveAs');
    const createImageBlobSpy = spyOn<any>(component, 'createImageBlob').and.resolveTo(new Blob());

    treeViewElement.style.backgroundColor = 'rgb(32, 33, 30)';

    await component.downloadImage();

    expect(createImageBlobSpy).toHaveBeenCalledWith(
      component.treeViewElement.nativeElement,
      jasmine.objectContaining({
        backgroundColor: 'rgb(32, 33, 30)',
        pixelRatio: 1
      })
    );
    expect(window.saveAs).toHaveBeenCalled();
  });

});
