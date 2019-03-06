import { TestBed } from '@angular/core/testing';

import { OpenapiTreenodeConverterService } from './openapi-treenode-converter.service';

describe('OpenapiTreenodeConverterService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: OpenapiTreenodeConverterService = TestBed.get(OpenapiTreenodeConverterService);
    expect(service).toBeTruthy();
  });
});
