describe('The Home Page', () => {

    /* Test the app launches at all */
    it('successfully loads', () => {
      /* Open the application */
      cy.visit('/')
    })

    /* Test we can load a spec from a URL */
    it('Loads from a URL', () => {
        cy.visit('/')

        cy.contains('Import from URL').click();

        /* Submit button should be initially disabled */
        cy.get('button[type=submit]').should('be.disabled')

        /* Type in a URL */
        cy.get('#url-input')
            .type('https://raw.githubusercontent.com/OpenAPITools/openapi-generator/master/modules/openapi-generator/src/test/resources/3_0/tags.yaml')
            .should('have.value', 'https://raw.githubusercontent.com/OpenAPITools/openapi-generator/master/modules/openapi-generator/src/test/resources/3_0/tags.yaml')

        /* And check the submit button is enabled now and click it */
        cy.get('button[type=submit]').should('be.enabled').click()

        /* Give the dialog a short period to disappear */
        cy.wait(250);

        /* Check there is API information including the title of the spec */
        cy.get('.api-info-title').should('not.be.visible')
        cy.contains('API Information').click()
        cy.get('.api-info-title').should('be.visible')
            .should('have.text', 'OpenAPI Test API - 1.0.0')

    })

    /* Test we can load a spec from a file */
    it('Loads from a single file', () => {
        cy.visit('/')

        cy.contains('Import File(s)')//.click();
    })

    /*
     * Test when we load a spec from a URL, with root node endpoints, that they
     * are rendered
     */
   it('Loads from a URL with root node endpoints', () => {

        /* Setup the intercept to use a fixture instead of URL */
        cy.fixture('uspto.yaml', 'utf8').then((data) => {

          const response = {
            statusCode: 200,
            body: data,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8'
            }
          };
          cy.intercept(
            'GET',
            /^http:\/\/local.test\/uspto.yaml/,
            response)
        })

        /* Load the URL using the query parameter */
        cy.visit('/?url=http://local.test/uspto.yaml')
        // cy.visit('/?url=https://raw.githubusercontent.com/dhutchison/OpenApiVisualiser/master/sample_openapi/uspto.yaml')

        /* Expand the API Paths section */
        cy.contains('API Paths').click()

        /* Check the operation ID nodes exist and are visible */
        cy.get('#list-data-sets-node')
            .should('be.visible')
            .should('have.text', 'GET')
        cy.get('#list-searchable-fields-node')
            .should('be.visible')
            .should('have.text', 'GET')
        cy.get('#perform-search-node')
            .should('be.visible')
            .should('have.text', 'POST')
   })

    /*
     * Test when we load a spec from a URL, with multiple nodes with the same name in a path, that they
     * are rendered
     */
    it('Loads from a URL with duplicate path nodes', () => {

      /* Setup the intercept to use a fixture instead of URL */
      cy.fixture('petstore.yaml', 'utf8').then((data) => {

        const response = {
          statusCode: 200,
          body: data,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8'
          }
        };
        cy.intercept(
          'GET',
          /^http:\/\/local.test\/petstore.yaml$/,
          response)
      })

      /* Load the URL using the query parameter */
      cy.visit('/?url=http://local.test/petstore.yaml')

      /* Expand the API Paths section */
      cy.contains('API Paths').click()

      /* Check the operation ID nodes exist and are visible */
      cy.get('#listPets-node')
          .should('be.visible')
          .should('have.text', 'GET')

      cy.get('#listPets-node').click()
      cy.get('.p-dialog')
          .should('be.visible')
          .contains('GET /pets')
      cy.get('.swagger-ui', { timeout: 20000 })
          .should('exist')
          .contains('List all pets')
      cy.get('.swagger-ui').contains('Execute')
      cy.get('.swagger-ui').contains('Schemas')
      cy.get('#showPetById-node')
          .should('be.visible')
          .should('have.text', 'GET')
      cy.get('#listAuditPets-node')
          .should('be.visible')
          .should('have.text', 'GET')
      cy.get('#createPets-node')
          .should('be.visible')
          .should('have.text', 'POST')

    })

    it('Pushes lower sections down when API Paths expands', () => {

      cy.fixture('petstore.yaml', 'utf8').then((data) => {

        const response = {
          statusCode: 200,
          body: data,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8'
          }
        };
        cy.intercept(
          'GET',
          /^http:\/\/local.test\/petstore.yaml$/,
          response)
      })

      cy.visit('/?url=http://local.test/petstore.yaml')

      cy.contains('[role="button"]', 'Components').then(($componentsHeader) => {
        const initialTop = $componentsHeader[0].getBoundingClientRect().top;

        cy.contains('API Paths').click();
        cy.get('#listPets-node').should('be.visible');

        cy.contains('[role="button"]', 'Components').should(($expandedComponentsHeader) => {
          const expandedTop = $expandedComponentsHeader[0].getBoundingClientRect().top;
          const apiPathBottom = Cypress.$('.api-path-tree-layout')[0].getBoundingClientRect().bottom;

          expect(expandedTop).to.be.greaterThan(apiPathBottom - 1);
        });

        cy.contains('[role="button"]', 'Components').should(($expandedComponentsHeader) => {
          const expandedTop = $expandedComponentsHeader[0].getBoundingClientRect().top;

          expect(expandedTop).to.be.greaterThan(initialTop + 100);
        });
      });
    })

    it('Renders API Paths Tree as a horizontal diagram', () => {

      cy.fixture('petstore.yaml', 'utf8').then((data) => {

        const response = {
          statusCode: 200,
          body: data,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8'
          }
        };
        cy.intercept(
          'GET',
          /^http:\/\/local.test\/petstore.yaml$/,
          response)
      })

      cy.visit('/?url=http://local.test/petstore.yaml')

      cy.contains('API Paths').click()
      cy.get('p-tree.tree-horizontal').should('exist')
      cy.get('p-tree.tree-horizontal .p-tree-root-children')
          .should('have.css', 'display', 'flex')
      cy.get('#listPets-node').should('be.visible')

      cy.get('p-tree.tree-horizontal .p-tree-node-content').first().then(($rootNode) => {
        const rootRight = $rootNode[0].getBoundingClientRect().right;

        cy.get('#listPets-node').should(($operationNode) => {
          const operationLeft = $operationNode[0].getBoundingClientRect().left;

          expect(operationLeft).to.be.greaterThan(rootRight);
        });
      });
    })

    it('Pushes nested schema sections down when Components expands', () => {

      cy.fixture('petstore.yaml', 'utf8').then((data) => {

        const response = {
          statusCode: 200,
          body: data,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8'
          }
        };
        cy.intercept(
          'GET',
          /^http:\/\/local.test\/petstore.yaml$/,
          response)
      })

      cy.visit('/?url=http://local.test/petstore.yaml')

      cy.contains('[role="button"]', 'Components').click();
      cy.contains('[role="button"]', /^Pets$/).then(($petsHeader) => {
        const initialTop = $petsHeader[0].getBoundingClientRect().top;

        cy.contains('[role="button"]', /^Pet$/).click();
        cy.get('#components_schemas_Pet').should('be.visible');

        cy.contains('[role="button"]', /^Pets$/).should(($expandedPetsHeader) => {
          const expandedTop = $expandedPetsHeader[0].getBoundingClientRect().top;

          expect(expandedTop).to.be.greaterThan(initialTop + 20);
        });
      });
    })
  })
