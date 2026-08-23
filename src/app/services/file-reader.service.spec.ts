import { TestBed, getTestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { FileReaderService } from './file-reader.service';
import { createLoadedDocument } from '../models/loaded-document.models';

const PETSTORE_YAML = `openapi: "3.0.0"
info:
  version: 1.0.0
  title: Swagger Petstore
  license:
    name: MIT
servers:
  - url: http://petstore.swagger.io/v1
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      tags:
        - pets
      parameters:
        - name: limit
          in: query
          description: How many items to return at one time (max 100)
          required: false
          schema:
            type: integer
            format: int32
      responses:
        '200':
          description: A paged array of pets
          headers:
            x-next:
              description: A link to the next page of responses
              schema:
                type: string
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Pets"
        default:
          description: unexpected error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
    post:
      summary: Create a pet
      operationId: createPets
      tags:
        - pets
      responses:
        '201':
          description: Null response
        default:
          description: unexpected error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
  /pets/{petId}:
    get:
      summary: Info for a specific pet
      operationId: showPetById
      tags:
        - pets
      parameters:
        - name: petId
          in: path
          required: true
          description: The id of the pet to retrieve
          schema:
            type: string
      responses:
        '200':
          description: Expected response to a valid request
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Pets"
        default:
          description: unexpected error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
components:
  schemas:
    Pet:
      required:
        - id
        - name
      properties:
        id:
          type: integer
          format: int64
        name:
          type: string
        tag:
          type: string
    Pets:
      type: array
      items:
        $ref: "#/components/schemas/Pet"
    Error:
      required:
        - code
        - message
      properties:
        code:
          type: integer
          format: int32
        message:
          type: string
`;

const PETSTORE_JSON = `{
  "openapi": "3.0.0",
  "info": {
    "version": "1.0.0",
    "title": "Swagger Petstore",
    "license": {
      "name": "MIT"
    }
  },
  "servers": [
    {
      "url": "http://petstore.swagger.io/v1"
    }
  ],
  "paths": {
    "/pets": {
      "get": {
        "summary": "List all pets",
        "operationId": "listPets",
        "tags": [
          "pets"
        ],
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "description": "How many items to return at one time (max 100)",
            "required": false,
            "schema": {
              "type": "integer",
              "format": "int32"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "A paged array of pets",
            "headers": {
              "x-next": {
                "description": "A link to the next page of responses",
                "schema": {
                  "type": "string"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Pets"
                }
              }
            }
          },
          "default": {
            "description": "unexpected error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create a pet",
        "operationId": "createPets",
        "tags": [
          "pets"
        ],
        "responses": {
          "201": {
            "description": "Null response"
          },
          "default": {
            "description": "unexpected error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    },
    "/pets/{petId}": {
      "get": {
        "summary": "Info for a specific pet",
        "operationId": "showPetById",
        "tags": [
          "pets"
        ],
        "parameters": [
          {
            "name": "petId",
            "in": "path",
            "required": true,
            "description": "The id of the pet to retrieve",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Expected response to a valid request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Pets"
                }
              }
            }
          },
          "default": {
            "description": "unexpected error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Error"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Pet": {
        "required": [
          "id",
          "name"
        ],
        "properties": {
          "id": {
            "type": "integer",
            "format": "int64"
          },
          "name": {
            "type": "string"
          },
          "tag": {
            "type": "string"
          }
        }
      },
      "Pets": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/Pet"
        }
      },
      "Error": {
        "required": [
          "code",
          "message"
        ],
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}`;

const BROKEN_README_QUERY_PARAM_URL = 'https:%2F%2Fraw.githubusercontent.com%2FMermade%2Fopenapi3-examples%2Fmaster%2Fpass%2FOAI%2Fuber.yaml';

describe('FileReaderService', () => {
    let injector: TestBed;
    let service: FileReaderService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          FileReaderService,
          provideHttpClient(withXhr()),
          provideHttpClientTesting()
        ]
      });
      injector = getTestBed();
      service = injector.inject(FileReaderService);
      httpMock = injector.inject(HttpTestingController);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    describe('URL based tests', () => {
      it('YAML file should be loaded', (done: DoneFn) => {
        service.apiChanged.subscribe(value => {
          expect(value.document.info.title).toBe('Swagger Petstore');
          expect(value.baseUri).toBe('http://localhost/petstore.yaml');
          expect(value.scopeId).toBe('assessment-scope:http://localhost/petstore.yaml');
          expect(value.resourceSet.resolve('../petstore.yaml', value.baseUri)?.document).toBe(value.document);
          done();
        });

        const url = 'http://localhost/petstore.yaml';
        service.loadFileFromURL(url);

        const request = httpMock.expectOne(url);
        expect(request.request.method).toBe('GET');
        request.flush(PETSTORE_YAML);
      });

      it('JSON file should be loaded', (done: DoneFn) => {
        service.apiChanged.subscribe(value => {
          expect(value.document.info.title).toBe('Swagger Petstore');
          expect(value.baseUri).toBe('http://localhost/petstore.json');
          done();
        });

        const url = 'http://localhost/petstore.json';
        service.loadFileFromURL(url);

        const request = httpMock.expectOne(url);
        expect(request.request.method).toBe('GET');
        request.flush(PETSTORE_JSON);
      });

      it('should notify when URL file is not found', (done: DoneFn) => {
        service.apiChanged.subscribe(value => {
          // Should not get a value here
          fail('Unexpected update');
        });

        service.loadFailed.subscribe(message => {
          expect(message).toContain(url);
          expect(message).toContain('404 Not Found');
          done();
        });

        const url = BROKEN_README_QUERY_PARAM_URL;
        service.loadFileFromURL(url);
        const request = httpMock.expectOne(url);
        expect(request.request.method).toBe('GET');
        request.flush('Not Found', { status: 404, statusText: 'Not Found'} );
      });
    });

    describe('File based tests', () => {
      it('YAML file should be loaded', (done: DoneFn) => {
        service.apiChanged.subscribe(value => {
          expect(value.document.info.title).toBe('Swagger Petstore');
          expect(value.baseUri).toBe('file:///openapi/petstore.yaml');
          done();
        });

        const file = new File([PETSTORE_YAML], 'petstore.yaml');
        service.loadFile(file);
      });

      it('JSON file should be loaded', (done: DoneFn) => {
        service.apiChanged.subscribe(value => {
          expect(value.document.info.title).toBe('Swagger Petstore');
          expect(value.baseUri).toBe('file:///openapi/petstore.json');
          done();
        });

        const file = new File([PETSTORE_JSON], 'petstore.json');
        service.loadFile(file);
      });

      it('publishes every root with the complete batch resource set', (done: DoneFn) => {
        const first = new File([JSON.stringify({openapi: '3.0.0', info: {title: 'First'}, paths: {}})], 'apis/first.json');
        const second = new File([JSON.stringify({openapi: '3.0.0', info: {title: 'Second'}, paths: {}})], 'apis/second.json');
        const loaded: string[] = [];

        service.apiChanged.subscribe(value => {
          loaded.push(value.document.info.title);
          expect(value.resourceSet.entries).toHaveSize(2);
          expect(value.resourceSet.resolve('./second.json', value.baseUri)?.document.info.title).toBe('Second');
          if (loaded.length === 2) {
            expect(loaded).toEqual(['First', 'Second']);
            done();
          }
        });

        service.loadFiles([first, second]);
      });

      it('reports duplicate canonical file identities without overwriting the registry', (done: DoneFn) => {
        const first = new File([JSON.stringify({openapi: '3.0.0', info: {title: 'First'}, paths: {}})], 'duplicate.json');
        const second = new File([JSON.stringify({openapi: '3.0.0', info: {title: 'Second'}, paths: {}})], 'duplicate.json');

        service.apiChanged.subscribe(value => {
          expect(value.resourceSet.entries).toHaveSize(2);
          expect(value.resourceSet.resolve('duplicate.json', value.baseUri)?.document.info.title).toBe('First');
          expect(value.diagnostics.some(diagnostic => diagnostic.code === 'duplicate-source-identity')).toBeTrue();
          expect(value.document.info.title).toBe('First');
          expect(value.scopeId).toBe('assessment-scope:file:///openapi/duplicate.json');
          done();
        });

        service.loadFiles([first, second]);
      });

      it('reports parse failures without publishing a malformed root', (done: DoneFn) => {
        const failure = 'Could not load the API definition from file:///openapi/broken.json.';
        service.loadDiagnostics.subscribe(diagnostic => {
          expect(diagnostic.code).toBe('parse-failed');
          expect(diagnostic.sourceId).toBe('file:///openapi/broken.json');
        });
        service.loadFailed.subscribe(message => {
          expect(message).toContain(failure);
          done();
        });

        service.apiChanged.subscribe(() => fail('Malformed documents must not be published'));
        service.loadFile(new File(['{not json'], 'broken.json'));
      });

      it('does not replay a root after reset', () => {
        const document = {
          openapi: '3.0.0',
          info: {title: 'Reset me'},
          paths: {}
        } as any;
        const loaded: unknown[] = [];
        service.apiChanged.subscribe(value => loaded.push(value));

        service.apiChanged.next(createLoadedDocument(document));
        service.resetFiles.next();

        expect(loaded).toHaveSize(1);
        let replayed = false;
        service.apiChanged.subscribe(() => replayed = true);
        expect(replayed).toBeFalse();
      });
    });

    afterEach(() => {
      httpMock.verify();
    });
});
