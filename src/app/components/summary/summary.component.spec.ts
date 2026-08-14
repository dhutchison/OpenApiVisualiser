import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SummaryComponent } from './summary.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiOperationNode, ApiPathNode } from '../../models/hierarchy.models';

describe('SummaryComponent', () => {
  let component: SummaryComponent;
  let fixture: ComponentFixture<SummaryComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        SummaryComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should flatten API path nodes to operation nodes', () => {
    const operation: ApiOperationNode = {
      kind: 'operation',
      label: 'GET',
      leaf: true,
      children: [],
      tooltip: '',
      method: 'GET',
      path: '/pets',
      operation: {responses: {}},
      apiDefinition: {
        openapi: '3.1.0',
        info: {title: 'Pets', version: '1.0.0'},
        paths: {}
      },
      complexity: 0
    };
    const path: ApiPathNode = {
      kind: 'path',
      label: '/pets',
      leaf: false,
      expanded: true,
      children: [operation]
    };

    expect(component.flatten([path])).toEqual([operation]);
  });
});
