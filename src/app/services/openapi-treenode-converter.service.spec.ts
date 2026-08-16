import { TestBed } from '@angular/core/testing';

import { OpenapiTreenodeConverterService } from './openapi-treenode-converter.service';
import { ApiPathTreeNode, isApiOperationNode } from '../models/hierarchy.models';

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

  it('uses newlines instead of HTML in operation tooltips', () => {
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
            summary: 'List pets',
            responses: {
              200: {
                description: 'Pets'
              }
            }
          }
        }
      }
    });

    const operationNode = emittedNodes?.[0].children[0].children[0];

    expect(operationNode && isApiOperationNode(operationNode)).toBeTrue();
    if (operationNode && isApiOperationNode(operationNode)) {
      expect(operationNode.tooltip).toBe('List pets\n\nComplexity: 1');
    }
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

  it('should preserve required state on schema property nodes', () => {
    const schema = {
      type: 'object' as const,
      required: ['id'],
      properties: {
        id: {
          type: 'integer' as const
        },
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

    expect(nodes[0].required).toBeTrue();
    expect(nodes[1].required).toBeFalse();
  });

  it('should stop expanding recursive schema references', () => {
    const schema = {$ref: '#/components/schemas/Node'};
    const apiDefinition = {
      openapi: '3.1.0' as const,
      info: {
        title: 'Recursive API',
        version: '1.0.0'
      },
      paths: {},
      components: {
        schemas: {
          Node: {
            type: 'object' as const,
            properties: {
              value: {type: 'string' as const},
              children: {
                type: 'array' as const,
                items: schema
              }
            }
          }
        }
      }
    };

    const nodes = service.createComponentSchemaPropertiesToTreeNodes(schema, apiDefinition);
    const childrenNode = nodes.find(node => node.label === 'children');

    expect(childrenNode).toBeTruthy();
    expect(childrenNode?.leaf).toBeTrue();
    expect(childrenNode?.children).toEqual([]);
  });
});
