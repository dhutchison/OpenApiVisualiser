import { TestBed } from '@angular/core/testing';

import { OpenapiTreenodeConverterService } from './openapi-treenode-converter.service';

describe('OpenapiTreenodeConverterService', () => {

  let service: OpenapiTreenodeConverterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    service = TestBed.get(OpenapiTreenodeConverterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should reset with zero nodes', (done) => {
    service.treeNodesChanged.subscribe((nodes) => {
      /* Expecting an array to be supplied but for it to be empty */
      expect(nodes).toBeTruthy();
      expect(nodes.length).toBe(0);

      /* Notify test complete */
      done();
    });

    service.reset();
  });
});
