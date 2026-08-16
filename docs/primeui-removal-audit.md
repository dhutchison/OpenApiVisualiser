# PrimeUI removal audit

This document records the searches and dependency checks used to verify that the application no longer depends on PrimeNG, PrimeUI, or PrimeIcons. Run the commands from the repository root. The audit document itself is excluded from searches because it names the packages and selectors being checked.

## Dependency absence

```sh
rg -n -i 'primeng|@primeuix|@primeui|primeicons|@primeicons' package.json package-lock.json
```

Expected result: no matches.

```sh
npm ls primeng @primeuix/themes @primeui/license-manager primeicons @primeicons/angular @angular/animations --all
```

Expected result: `(empty)`. npm exits with status 1 when every requested package is absent; that status is expected for this absence check.

## Repository absence

```sh
rg -n -i 'primeng|@primeuix|@primeui|primeicons|@primeicons|data-p-' \
  src cypress angular.json package.json package-lock.json
```

```sh
rg -n -P '(^|[\s\x22\x27])pi\s+pi-[a-z][a-z0-9-]*|\.(?:p-[a-z][a-z0-9-]*)|(?:^|[ <])p-[a-z][a-z0-9-]*' \
  src cypress angular.json package.json
```

```sh
rg -n -P 'querySelector(All)?\([^)]*(?:[\x22\x27]|[ <])p-[a-z][a-z0-9-]*|data-p-|querySelector(All)?\([^)]*(?:[\x22\x27]|[ <])pi\s+pi-[a-z][a-z0-9-]*' src cypress
```

```sh
rg -n -P '\b(?:TreeTableModule|TreeModule|SelectButtonModule|PanelModule|FieldsetModule|providePrimeNG|BrowserAnimationsModule|provideNoopAnimations)\b' \
  src cypress angular.json package.json package-lock.json
```

Expected result for all three commands: no matches.

The application now uses application-owned selectors such as `app-*`, `path-tree-*`, and `schema-property-*`. Swagger UI remains an intentional third-party surface: its stylesheet is imported from `swagger-ui`, and the endpoint component renders Swagger UI content. Those classes are not PrimeUI classes and are outside this removal audit.

Generic packages named `p-map`, `p-limit`, `p-locate`, and `p-try` remain transitive development dependencies in the lockfile. They are unrelated npm packages; the selector search intentionally scopes itself to application source and configuration so these names cannot mask a PrimeUI selector.

## Verification evidence

The final verification run for this change is performed in the devcontainer:

```sh
npm run lint
npm run build -- --configuration production
NODE_OPTIONS=--max_old_space_size=8192 npx ng test --watch=false --browsers=ChromeHeadlessNoSandbox --no-progress
NODE_OPTIONS=--max_old_space_size=4096 npx concurrently \
  "ng serve --host 127.0.0.1" \
  "wait-on http-get://127.0.0.1:4200 && env -u ELECTRON_RUN_AS_NODE npx cypress run --headless --expose coverage=false" \
  --kill-others --success first
```

The Cypress command disables only the coverage reporter while running the complete browser suite; the application and all Cypress specs still run. The repository's coverage report hook can exceed the container's memory limit after the tests have passed.

Manual review remains a reviewer checklist for this stacked PR: light and dark themes at desktop and mobile widths, each migrated control, every modal flow, schema disclosures, and both API-path layouts. The historical regression cases remain covered by the existing unit and Cypress suites, including theme cycling/readability, method colours, summary sizing, expanded-section flow, nested-schema height, and API-tree orientation/alignment/connectors.
