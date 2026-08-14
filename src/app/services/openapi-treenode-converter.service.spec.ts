import { TestBed } from '@angular/core/testing';

import { OpenapiTreenodeConverterService } from './openapi-treenode-converter.service';
import { ApiPathTreeNode } from '../models/hierarchy.models';

describe('OpenapiTreenodeConverterService', () => {

  let service: OpenapiTreenodeConverterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    service = TestBed.inject(OpenapiTreenodeConverterService);
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

  it('should emit application-owned API path and operation nodes', () => {
    let emittedNodes: ApiPathTreeNode[] | undefined;
    service.treeNodesChanged.subscribe(nodes => emittedNodes = nodes);

    service.addApiSpecification({
      openapi: '3.1.0',
      info: {
        title: 'Pets API',
        version: '1.0.0'
      },
      paths: {
        '/pets': {
          get: {
            operationId: 'listPets',
            responses: {
              200: {
                description: 'Pets'
              }
            }
          }
        }
      }
    });

    expect(emittedNodes?.[0].kind).toBe('path');
    expect(emittedNodes?.[0].children[0].kind).toBe('path');
    expect(emittedNodes?.[0].children[0].children[0].kind).toBe('operation');
  });

  it('should emit application-owned schema property nodes', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string' as const
        }
      }
    };

    const nodes = service.createComponentSchemaPropertiesToTreeNodes(schema, {
      openapi: '3.1.0',
      info: {
        title: 'Pets API',
        version: '1.0.0'
      },
      paths: {}
    });

    expect(nodes[0].label).toBe('name');
    expect(nodes[0].data).toBe(schema.properties.name);
  });
});
