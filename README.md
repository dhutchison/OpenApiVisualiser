[![Coverage Status](https://coveralls.io/repos/github/dhutchison/OpenApiVisualiser/badge.svg?branch=master)](https://coveralls.io/github/dhutchison/OpenApiVisualiser?branch=master)

# OpenAPIVisualiser

A utility for visualising the paths of an OpenAPI definition. 

This application supports a query parameter, url, which can be used to pre-load a definition in to the application. 

For example:
http://localhost:4200/?url=https:%2F%2Fraw.githubusercontent.com%2FMermade%2Fopenapi3-examples%2Fmaster%2Fpass%2FOAI%2Fuber.yaml

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Building for deployment
[This guide](https://angular.io/guide/deployment#deploy-to-github-pages) details how to deploy Angular applications to GitHub pages. 

The package.json defines a "build-deployment" script that can be ran to recompile the project 
in to the "docs" directory. Pushing this directory to master will update the deployed version of the 
application, available at: https://www.devwithimagination.com/OpenApiVisualiser/

This can be ran by running the command:
`npm run-script build-deployment`

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
