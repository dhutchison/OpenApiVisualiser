describe('The Home Page', () => {

    const getPageTop = (element) => {
      const { top } = element.getBoundingClientRect();
      const scrollY = element.ownerDocument.defaultView?.scrollY ?? 0;

      return top + scrollY;
    }

    const accordionHeader = (text) => cy.contains('button.p-accordionheader', text)

    /* Test the app launches at all */
    it('successfully loads', () => {
      /* Open the application */
      cy.visit('/')
    })

    it('Toggles dark mode', () => {
      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.setItem('openapi-visualiser-theme', 'light');
        }
      })

      cy.get('html').should('not.have.class', 'dark-mode')
      cy.contains('button', 'Dark').click()
      cy.get('html').should('have.class', 'dark-mode')
      cy.contains('button', 'Light').click()
      cy.get('html').should('not.have.class', 'dark-mode')
    })

    it('Uses the expected theme text colours for the theme toggle and Summary table', () => {
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

      cy.visit('/?url=http://local.test/petstore.yaml', {
        onBeforeLoad(win) {
          win.localStorage.setItem('openapi-visualiser-theme', 'light');
        }
      })

      cy.get('html').should('not.have.class', 'dark-mode')
      cy.get('.theme-toggle .p-button-label')
          .should('have.css', 'color', 'rgb(23, 32, 51)')
      cy.get('.theme-toggle .p-button-icon')
          .should('have.css', 'color', 'rgb(23, 32, 51)')

      accordionHeader('Summary').click()
      cy.get('#method-summary caption')
          .should('have.css', 'color', 'rgb(23, 32, 51)')
      cy.get('#method-summary td')
          .first()
          .should('have.css', 'color', 'rgb(23, 32, 51)')

      accordionHeader('API Paths').click()
      cy.get('#listPets-node').should('be.visible').then(($getNode) => {
        const getNodeStyle = getComputedStyle($getNode.closest('.p-tree-node-content')[0]);

        cy.get('#method-header-get').should(($getHeader) => {
          const getHeaderStyle = getComputedStyle($getHeader[0]);

          expect(getHeaderStyle.backgroundColor).to.eq(getNodeStyle.backgroundColor);
          expect(getHeaderStyle.color).to.eq(getNodeStyle.color);
        });
      });

      cy.get('#createPets-node').should('be.visible').then(($postNode) => {
        const postNodeStyle = getComputedStyle($postNode.closest('.p-tree-node-content')[0]);

        cy.get('#method-header-post').should(($postHeader) => {
          const postHeaderStyle = getComputedStyle($postHeader[0]);

          expect(postHeaderStyle.backgroundColor).to.eq(postNodeStyle.backgroundColor);
          expect(postHeaderStyle.color).to.eq(postNodeStyle.color);
        });
      });

      cy.get('#method-summary').should(($table) => {
        const methodHeader = $table[0].querySelector('#method-header-post');
        const countCell = $table[0].querySelector('.method-count');

        expect(countCell.getBoundingClientRect().width).to.be.lessThan(methodHeader.getBoundingClientRect().width);
      });

      cy.contains('button', 'Dark').click()
      cy.get('html').should('have.class', 'dark-mode')
      cy.contains('button', 'Light')
          .find('.p-button-label')
          .should('have.css', 'color', 'rgb(243, 241, 232)')
      cy.contains('button', 'Light')
          .find('.p-button-icon')
          .should('have.css', 'color', 'rgb(243, 241, 232)')
    })

    it('Keeps the same dark-mode toggle background after cycling themes', () => {
      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.setItem('openapi-visualiser-theme', 'dark');
        }
      })

      cy.get('html').should('have.class', 'dark-mode')

      cy.contains('button', 'Light').click()
      cy.get('html').should('not.have.class', 'dark-mode')
      cy.contains('button', 'Dark').click()
      cy.get('html').should('have.class', 'dark-mode')

      cy.contains('button', 'Light').should(($cycledButton) => {
        const cycledBackground = getComputedStyle($cycledButton[0]).backgroundColor;

        expect([
          'rgba(29, 30, 27, 0.92)',
          'rgb(40, 42, 37)'
        ]).to.include(cycledBackground);
      });
    })

    /* Test we can load a spec from a URL */
    it('Loads from a URL', () => {
        const testUrl = 'https://raw.githubusercontent.com/OpenAPITools/openapi-generator/master/modules/openapi-generator/src/test/resources/3_0/tags.yaml'

        cy.fixture('petstore.yaml', 'utf8').then((data) => {
          cy.intercept(
            'GET',
            testUrl,
            {
              statusCode: 200,
              body: data,
              headers: {
                'Content-Type': 'text/plain; charset=utf-8'
              }
            })
        })

        cy.visit('/')

        cy.contains('Import from URL').click();

        /* Submit button should be initially disabled */
        cy.get('button[type=submit]').should('be.disabled')

        /* Type in a URL */
        cy.get('#url-input')
            .type(testUrl)
            .should('have.value', testUrl)

        /* And check the submit button is enabled now and click it */
        cy.get('button[type=submit]').should('be.enabled').click()

        /* Give the dialog a short period to disappear */
        cy.wait(250);

        /* Check there is API information including the title of the spec */
        accordionHeader('API Information').click()
        cy.get('.api-info-title').should('be.visible')
            .should('have.text', 'Swagger Petstore - 1.0.0')

    })

    it('Lets the URL input fill the dialog body width', () => {
      cy.visit('/')

      cy.contains('Import from URL').click()

      cy.get('.url-import-dialog').should('be.visible')
      cy.get('.url-import-dialog__field-row').should('be.visible')
      cy.get('.url-import-dialog__input-wrap').should('be.visible')
      cy.get('#url-input').should('be.visible')

      cy.get('.url-import-dialog__input-wrap').then(($wrap) => {
        const wrapRect = $wrap[0].getBoundingClientRect()

        cy.get('#url-input').should(($input) => {
          const inputRect = $input[0].getBoundingClientRect()

          expect(inputRect.width).to.be.greaterThan(wrapRect.width - 4)
          expect(Math.abs(inputRect.right - wrapRect.right)).to.be.lessThan(3)
        })
      })
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
        accordionHeader('API Paths').click()

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
      accordionHeader('API Paths').click()

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

      accordionHeader('Components').then(($componentsHeader) => {
        const initialTop = getPageTop($componentsHeader[0]);

        accordionHeader('API Paths').click();
        cy.get('#listPets-node').should('be.visible');

        accordionHeader('Components').should(($expandedComponentsHeader) => {
          const expandedTop = getPageTop($expandedComponentsHeader[0]);
          const apiPathBottom = getPageTop(Cypress.$('.api-path-tree-layout')[0]) + Cypress.$('.api-path-tree-layout')[0].getBoundingClientRect().height;

          expect(expandedTop).to.be.greaterThan(apiPathBottom - 1);
        });

        accordionHeader('Components').should(($expandedComponentsHeader) => {
          const expandedTop = getPageTop($expandedComponentsHeader[0]);

          expect(expandedTop).to.be.greaterThan(initialTop + 100);
        });
      });
    })

    it('Shows a warning above the embedded Swagger UI when the server URL cannot be used by the browser', () => {

      cy.fixture('petstore.yaml', 'utf8').then((data) => {

        const response = {
          statusCode: 200,
          body: data.replace('http://petstore.swagger.io/v1', 'mailto:petstore@example.com'),
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

      accordionHeader('API Paths').click()
      cy.get('#listPets-node').click()

      cy.get('.p-dialog')
          .should('be.visible')
          .contains('GET /pets')

      cy.get('.endpoint-swagger-warning', { timeout: 20000 })
          .should('be.visible')
          .and('contain.text', 'browser-based "Try it out" requests only work with HTTP or HTTPS servers')
          .and('contain.text', 'generated cURL command')

      cy.get('.endpoint-swagger-warning')
          .next('.endpoint-swagger')
          .find('.swagger-ui')
          .should('exist')
          .and('contain.text', 'List all pets')
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

      accordionHeader('API Paths').click()
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

      cy.get('#listPets-node').then(($getNode) => {
        const getRect = $getNode[0].getBoundingClientRect();
        const operationGroup = $getNode.closest('.p-tree-node-children')[0];
        const operationGroupBranch = getComputedStyle(operationGroup, '::after');
        const getNodeConnector = getComputedStyle($getNode.closest('p-treenode')[0], '::before');

        expect(getComputedStyle(operationGroup).flexDirection).to.eq('column');
        expect(operationGroupBranch.display).to.eq('block');
        expect(operationGroupBranch.borderLeftStyle).to.eq('solid');
        expect(getNodeConnector.borderTopStyle).to.eq('solid');

        cy.get('#createPets-node').should(($postNode) => {
          const postRect = $postNode[0].getBoundingClientRect();
          const postNodeConnector = getComputedStyle($postNode.closest('p-treenode')[0], '::before');

          expect(Math.abs(postRect.left - getRect.left)).to.be.lessThan(2);
          expect(postRect.top).to.be.greaterThan(getRect.top);
          expect(postNodeConnector.borderTopStyle).to.eq('solid');
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

      accordionHeader('Components').click();
      accordionHeader('Pets').then(($petsHeader) => {
        const initialTop = getPageTop($petsHeader[0]);

        accordionHeader('Pet').click();
        cy.get('#components_schemas_Pet p-treetable').should('be.visible');

        accordionHeader('Pet')
            .closest('.p-accordionpanel, .p-accordion-panel')
            .find('.p-accordioncontent-content, .p-accordion-content-content')
            .should(($content) => {
              const content = $content[0];

              expect(content.getBoundingClientRect().height).to.be.greaterThan(0);
              expect(content.getBoundingClientRect().height + 1).to.be.greaterThan(content.scrollHeight);
            });

        accordionHeader('Pets').should(($expandedPetsHeader) => {
          const expandedTop = getPageTop($expandedPetsHeader[0]);

          expect(expandedTop).to.be.greaterThan(initialTop + 20);
        });
      });
    })

    it('Renders enriched API information, tags, and components', () => {

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

      accordionHeader('API Information').click()
      cy.contains('.api-info', 'OpenAPI')
      cy.contains('.api-info', 'http://petstore.swagger.io/v1')
      cy.contains('.api-info', 'Paths').parent().contains('3')
      cy.contains('.api-info', 'Operations').parent().contains('4')

      accordionHeader('Tags').click()
      cy.contains('.tag-list article', 'pets')
          .contains('3 operations')
      cy.contains('.tag-list article', 'audit')
          .contains('1 operation')

      accordionHeader('Components').click()
      accordionHeader('Pet')
          .contains('object')
      accordionHeader('Pet')
          .contains('3 properties')
      accordionHeader('Pet').click()
      cy.contains('.schema-overview', '2 required')
    })
  })
