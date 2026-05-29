import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TreeNode } from 'primeng/api';

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
      imports: [
        ApiPathTreeComponent,
        ButtonModule,
        DialogModule,
        EndpointSwaggerComponent,
        FieldsetModule,
        FormsModule,
        PanelModule,
        PipesModule,
        SelectButtonModule,
        TooltipModule,
        TreeModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
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

  it('should toggle path nodes', () => {
    const pathNode: TreeNode = {
      label: '/pets',
      leaf: false,
      expanded: true,
      children: []
    };
    const event = jasmine.createSpyObj<Event>('event', ['stopPropagation']);
    const scheduleMeasurementSpy = spyOn<any>(component, 'schedulePathTreeMeasurement');

    component.togglePathNode(pathNode, event);

    expect(pathNode.expanded).toBeFalse();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(scheduleMeasurementSpy).toHaveBeenCalled();
  });

  it('should not toggle operation leaf nodes', () => {
    const operationNode = {
      label: 'GET',
      leaf: true,
      expanded: false,
      type: 'operation'
    } as TreeNode;
    const event = jasmine.createSpyObj<Event>('event', ['stopPropagation']);
    const scheduleMeasurementSpy = spyOn<any>(component, 'schedulePathTreeMeasurement');

    component.togglePathNode(operationNode, event);

    expect(operationNode.expanded).toBeFalse();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(scheduleMeasurementSpy).not.toHaveBeenCalled();
  });

  it('should export using the rendered tree background colour', async () => {
    const treeViewElement = fixture.nativeElement.querySelector('.tree-view') as HTMLElement;
    const saveAsSpy = jasmine.createSpy('saveAs');
    const createImageBlobSpy = spyOn<any>(component, 'createImageBlob').and.resolveTo(new Blob());

    (globalThis as any).saveAs = saveAsSpy;
    treeViewElement.style.backgroundColor = 'rgb(32, 33, 30)';

    await component.downloadImage();

    expect(createImageBlobSpy).toHaveBeenCalledWith(
      component.treeViewElement.nativeElement,
      jasmine.objectContaining({
        backgroundColor: 'rgb(32, 33, 30)',
        pixelRatio: 1
      })
    );
    expect(saveAsSpy).toHaveBeenCalled();
  });

});
