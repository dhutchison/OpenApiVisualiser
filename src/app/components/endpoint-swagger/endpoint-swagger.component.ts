import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { ComponentsObject, OpenAPIObject, OperationObject, PathItemObject, SecurityRequirementObject } from 'openapi3-ts/oas31';

@Component({
  selector: 'app-endpoint-swagger',
  imports: [
    CommonModule
  ],
  templateUrl: './endpoint-swagger.component.html',
  styleUrls: ['./endpoint-swagger.component.scss']
})
export class EndpointSwaggerComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() apiSpec?: OpenAPIObject;
  @Input() path?: string;
  @Input() method?: string;
  @Input() operation?: OperationObject;

  @ViewChild('swaggerContainer') swaggerContainer?: ElementRef<HTMLDivElement>;

  errorMessage?: string;
  warningMessage?: string;

  private viewReady = false;
  private destroyed = false;
  private ui?: any;
  private renderTimeoutId?: ReturnType<typeof setTimeout>;

  ngAfterViewInit() {
    this.viewReady = true;
    this.renderSwaggerUi();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.apiSpec || changes.path || changes.method || changes.operation) {
      this.renderSwaggerUi();
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
    if (this.renderTimeoutId) {
      clearTimeout(this.renderTimeoutId);
    }
    this.swaggerContainer?.nativeElement.replaceChildren();
    this.ui = undefined;
  }

  private renderSwaggerUi() {
    if (!this.viewReady || !this.swaggerContainer || !this.apiSpec || !this.path || !this.method || !this.operation) {
      return;
    }

    if (this.renderTimeoutId) {
      clearTimeout(this.renderTimeoutId);
    }

    this.renderTimeoutId = setTimeout(() => this.mountSwaggerUi(), 0);
  }

  private async mountSwaggerUi() {
    if (!this.swaggerContainer || !this.apiSpec || !this.path || !this.method || !this.operation) {
      return;
    }

    const spec = this.createEndpointSpec();
    this.errorMessage = undefined;
    this.warningMessage = this.createWarningMessage(spec);
    this.swaggerContainer.nativeElement.replaceChildren();

    try {
      const swaggerUiFactory = await this.getSwaggerUiFactory();

      if (this.destroyed || !this.swaggerContainer) {
        return;
      }

      this.ui = swaggerUiFactory({
        domNode: this.swaggerContainer.nativeElement,
        spec,
        deepLinking: false,
        displayOperationId: true,
        docExpansion: 'full',
        defaultModelsExpandDepth: 1,
        tryItOutEnabled: true,
        supportedSubmitMethods: ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.errorMessage = `Swagger UI could not render this endpoint. ${detail}`;
      console.error(this.errorMessage, err);
    }
  }

  private async getSwaggerUiFactory(): Promise<(config: object) => any> {
    const SwaggerUIModule = await import('swagger-ui');
    const swaggerUiModule: any = SwaggerUIModule;
    const candidates = [
      swaggerUiModule,
      swaggerUiModule.default,
      swaggerUiModule.SwaggerUIBundle,
      swaggerUiModule['module.exports'],
      swaggerUiModule.default?.default,
      swaggerUiModule.default?.SwaggerUIBundle,
      swaggerUiModule.default?.['module.exports']
    ];

    const swaggerUiFactory = candidates.find((candidate) => typeof candidate === 'function');

    if (!swaggerUiFactory) {
      throw new Error('Swagger UI factory export was not found.');
    }

    return swaggerUiFactory;
  }

  private createEndpointSpec(): OpenAPIObject {
    const pathItem = this.apiSpec.paths?.[this.path];
    const method = this.method.toLowerCase();
    const selectedPathItem: PathItemObject = {};

    this.setIfDefined(selectedPathItem, 'description', pathItem?.description);
    this.setIfDefined(selectedPathItem, 'parameters', this.clone(pathItem?.parameters));
    this.setIfDefined(selectedPathItem, 'servers', this.clone(pathItem?.servers));
    this.setIfDefined(selectedPathItem, 'summary', pathItem?.summary);

    selectedPathItem[method] = this.clone(this.operation);

    const security = this.operation.security === undefined ? this.clone(this.apiSpec.security) : undefined;

    return {
      openapi: this.apiSpec.openapi,
      info: this.clone(this.apiSpec.info),
      servers: this.clone(this.apiSpec.servers),
      security,
      tags: this.createEndpointTags(),
      externalDocs: this.clone(this.apiSpec.externalDocs),
      components: this.createReferencedComponents(selectedPathItem, security),
      paths: {
        [this.path]: selectedPathItem
      }
    };
  }

  private createEndpointTags() {
    const operationTags = new Set(this.operation?.tags ?? []);

    if (!this.apiSpec?.tags || operationTags.size === 0) {
      return undefined;
    }

    return this.clone(this.apiSpec.tags.filter(tag => operationTags.has(tag.name)));
  }

  private createReferencedComponents(
    selectedPathItem: PathItemObject,
    globalSecurity?: SecurityRequirementObject[]
  ): ComponentsObject | undefined {
    if (!this.apiSpec.components) {
      return undefined;
    }

    const sourceComponents = this.apiSpec.components as Record<string, Record<string, unknown> | undefined>;
    const selectedComponents: Record<string, Record<string, unknown>> = {};
    const queuedObjects: unknown[] = [selectedPathItem];
    const visitedRefs = new Set<string>();

    this.collectSecuritySchemeNames(this.operation?.security ?? globalSecurity)
      .forEach(name => this.addComponent('securitySchemes', name, sourceComponents, selectedComponents, queuedObjects));

    for (const queuedObject of queuedObjects) {
      this.collectComponentRefs(queuedObject).forEach(ref => {
        if (visitedRefs.has(ref)) {
          return;
        }

        visitedRefs.add(ref);
        const componentRef = this.parseComponentRef(ref);

        if (componentRef) {
          this.addComponent(componentRef.section, componentRef.name, sourceComponents, selectedComponents, queuedObjects);
        }
      });
    }

    return Object.keys(selectedComponents).length > 0 ? selectedComponents : undefined;
  }

  private collectSecuritySchemeNames(security?: SecurityRequirementObject[]): Set<string> {
    return new Set((security ?? []).flatMap(requirement => Object.keys(requirement)));
  }

  private collectComponentRefs(value: unknown): string[] {
    if (!value || typeof value !== 'object') {
      return [];
    }

    if (Array.isArray(value)) {
      return value.flatMap(item => this.collectComponentRefs(item));
    }

    const refs: string[] = [];
    const record = value as Record<string, unknown>;

    if (typeof record.$ref === 'string' && record.$ref.startsWith('#/components/')) {
      refs.push(record.$ref);
    }

    Object.values(record).forEach(child => refs.push(...this.collectComponentRefs(child)));

    return refs;
  }

  private parseComponentRef(ref: string): { section: string; name: string } | undefined {
    const pointerParts = ref.slice(2).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'));

    if (pointerParts.length < 3 || pointerParts[0] !== 'components') {
      return undefined;
    }

    return {
      section: pointerParts[1],
      name: pointerParts.slice(2).join('/')
    };
  }

  private addComponent(
    section: string,
    name: string,
    sourceComponents: Record<string, Record<string, unknown> | undefined>,
    selectedComponents: Record<string, Record<string, unknown>>,
    queuedObjects: unknown[]
  ) {
    const component = sourceComponents[section]?.[name];

    if (!component) {
      return;
    }

    selectedComponents[section] ??= {};

    if (selectedComponents[section][name]) {
      return;
    }

    const componentClone = this.clone(component);
    selectedComponents[section][name] = componentClone;
    queuedObjects.push(componentClone);
  }

  private clone<T>(value: T): T {
    return value === undefined ? value : structuredClone(value);
  }

  private setIfDefined<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined) {
    if (value !== undefined) {
      target[key] = value;
    }
  }

  private createWarningMessage(spec: OpenAPIObject): string | undefined {
    const serverUrl = spec.servers?.[0]?.url;

    if (!serverUrl || globalThis.window === undefined) {
      return undefined;
    }

    try {
      const resolvedServerUrl = new URL(serverUrl, globalThis.location.href);
      const pageProtocol = globalThis.location.protocol;
      const serverProtocol = resolvedServerUrl.protocol;

      if (pageProtocol === 'https:' && serverProtocol === 'http:') {
        return `This endpoint uses the server ${resolvedServerUrl.origin}, which may be blocked by the browser as mixed content when this app is loaded over HTTPS. You can still use the generated cURL command or open the API from an HTTP environment.`;
      }

      if (serverProtocol !== 'http:' && serverProtocol !== 'https:') {
        return `This endpoint uses the server URL ${resolvedServerUrl.toString()}, but browser-based "Try it out" requests only work with HTTP or HTTPS servers. You can still use the generated cURL command to try the request outside the browser.`;
      }
    } catch {
      return `This endpoint's server URL could not be resolved in the browser. You can still use the generated cURL command to try the request manually.`;
    }

    return undefined;
  }
}
