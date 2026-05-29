import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OpenAPIObject, OperationObject } from 'openapi3-ts/oas31';

import { EndpointSwaggerComponent } from './endpoint-swagger.component';

const petstoreSpec = require('../../../../sample_openapi/petstore3.json') as OpenAPIObject;

describe('EndpointSwaggerComponent', () => {
  let component: EndpointSwaggerComponent;
  let fixture: ComponentFixture<EndpointSwaggerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EndpointSwaggerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EndpointSwaggerComponent);
    component = fixture.componentInstance;
  });

  it('creates a Swagger UI spec containing only components referenced by the selected operation', () => {
    const operation: OperationObject = {
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Repository'
              }
            }
          }
        }
      }
    };
    const apiSpec: OpenAPIObject = {
      openapi: '3.1.0',
      info: {
        title: 'Large API',
        version: '1.0.0'
      },
      paths: {
        '/repos': {
          get: operation
        },
        '/unused': {
          get: {
            responses: {
              '200': {
                description: 'Unused'
              }
            }
          }
        }
      },
      components: {
        schemas: {
          Repository: {
            type: 'object',
            properties: {
              owner: {
                $ref: '#/components/schemas/User'
              }
            }
          },
          User: {
            type: 'object',
            properties: {
              login: {
                type: 'string'
              }
            }
          },
          Unused: {
            type: 'object'
          }
        },
        responses: {
          UnusedResponse: {
            description: 'Unused'
          }
        }
      }
    };

    component.apiSpec = apiSpec;
    component.path = '/repos';
    component.method = 'GET';
    component.operation = operation;

    const endpointSpec = (component as any).createEndpointSpec() as OpenAPIObject;

    expect(endpointSpec.paths).toEqual({
      '/repos': {
        get: operation
      }
    });
    expect(endpointSpec.components?.schemas).toEqual({
      Repository: apiSpec.components?.schemas?.Repository,
      User: apiSpec.components?.schemas?.User
    });
    expect(endpointSpec.components?.responses).toBeUndefined();
  });

  it('keeps only the security schemes used by the selected operation', () => {
    const operation: OperationObject = {
      security: [
        {
          apiKeyAuth: []
        }
      ],
      responses: {
        '204': {
          description: 'No content'
        }
      }
    };
    const apiSpec: OpenAPIObject = {
      openapi: '3.1.0',
      info: {
        title: 'Secured API',
        version: '1.0.0'
      },
      security: [
        {
          oauth: ['repo']
        }
      ],
      paths: {
        '/repos': {
          get: operation
        }
      },
      components: {
        securitySchemes: {
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          },
          oauth: {
            type: 'oauth2',
            flows: {
              authorizationCode: {
                authorizationUrl: 'https://example.com/oauth/authorize',
                tokenUrl: 'https://example.com/oauth/token',
                scopes: {
                  repo: 'Repository access'
                }
              }
            }
          }
        }
      }
    };

    component.apiSpec = apiSpec;
    component.path = '/repos';
    component.method = 'GET';
    component.operation = operation;

    const endpointSpec = (component as any).createEndpointSpec() as OpenAPIObject;

    expect(endpointSpec.components?.securitySchemes).toEqual({
      apiKeyAuth: apiSpec.components?.securitySchemes?.apiKeyAuth
    });
    expect(endpointSpec.security).toBeUndefined();
  });

  it('generates a cut down Swagger UI spec from the sample Petstore specification', () => {
    const path = '/pet';
    const method = 'PUT';
    const operation = petstoreSpec.paths?.[path]?.put as OperationObject;

    component.apiSpec = petstoreSpec;
    component.path = path;
    component.method = method;
    component.operation = operation;

    const endpointSpec = (component as any).createEndpointSpec() as OpenAPIObject;

    expect(Object.keys(endpointSpec.paths ?? {})).toEqual([path]);
    expect(endpointSpec.paths?.[path]?.put).toEqual(operation);
    expect(endpointSpec.paths?.[path]?.post).toBeUndefined();
    expect(endpointSpec.tags).toEqual([
      petstoreSpec.tags?.find(tag => tag.name === 'pet')
    ]);

    expect(Object.keys(endpointSpec.components?.schemas ?? {}).sort()).toEqual([
      'Category',
      'Pet',
      'Tag'
    ]);
    expect(endpointSpec.components?.schemas?.Order).toBeUndefined();
    expect(endpointSpec.components?.schemas?.User).toBeUndefined();
    expect(endpointSpec.components?.schemas?.ApiResponse).toBeUndefined();
    expect(endpointSpec.components?.requestBodies).toBeUndefined();
    expect(endpointSpec.components?.securitySchemes).toEqual({
      petstore_auth: petstoreSpec.components?.securitySchemes?.petstore_auth
    });
    expect(endpointSpec.security).toBeUndefined();
  });
});
