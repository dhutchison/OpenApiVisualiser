import { TestBed, getTestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { FileReaderService } from './file-reader.service';

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

describe('FileReaderService', () => {
    let injector: TestBed;
    let service: FileReaderService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [
          HttpClientTestingModule
        ],
        providers: [
          FileReaderService
        ]
      });
      injector = getTestBed();
      service = injector.get(FileReaderService);
      httpMock = injector.get(HttpTestingController);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    describe('URL based tests', () => {
      it('YAML file should be loaded', (done: DoneFn) => {
        service.apiChanged.subscribe(value => {
          // TODO: Check contents
          expect(value).toBeTruthy();
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
          // TODO: Check contents
          expect(value).toBeTruthy();
          done();
        });

        const url = 'http://localhost/petstore.json';
        service.loadFileFromURL(url);

        const request = httpMock.expectOne(url);
        expect(request.request.method).toBe('GET');
        request.flush(PETSTORE_JSON);
      });

      it('Error when file not found', (done: DoneFn) => {
        service.apiChanged.subscribe(value => {
          // Should not get a value here
          fail('Unexpected update');
          done();
        });

        const url = 'http://localhost/not_petstore.json';
        try {
          service.loadFileFromURL(url);
        } catch (error) {
          console.error(error);
          done();
        }

        const request = httpMock.expectOne(url);
        expect(request.request.method).toBe('GET');
        request.flush('Not Found', { status: 404, statusText: 'Not Found'} );

        // TODO: need to fix error handling
        done();
      });
    });

    describe('File based tests', () => {
      it('YAML file should be loaded', (done: DoneFn) => {
        service.apiChanged.subscribe(value => {
          // TODO: Check contents
          expect(value).toBeTruthy();
          done();
        });

        const file = new File([PETSTORE_YAML], 'petstore.yaml');
        service.loadFile(file);
      });

      it('JSON file should be loaded', (done: DoneFn) => {
        service.apiChanged.subscribe(value => {
          // TODO: Check contents
          expect(value).toBeTruthy();
          done();
        });

        const file = new File([PETSTORE_JSON], 'petstore.json');
        service.loadFile(file);
      });
    });

    afterEach(() => {
      httpMock.verify();
    });
});
