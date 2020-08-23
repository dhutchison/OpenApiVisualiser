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

        /* Check there is API information including the title of the spec */
        cy.get('.api-info-title').should('not.be.visible')
        cy.get('#api-information-tab').click()
        cy.get('.api-info-title').should('be.visible')
            .should('have.text', 'OpenAPI Test API - 1.0.0')

    })

    /* Test we can load a spec from a file */
    it('Loads from a single file', () => {
        cy.visit('/')

        cy.contains('Import File(s)')//.click();
    })

  })