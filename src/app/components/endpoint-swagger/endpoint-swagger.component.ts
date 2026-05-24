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
import { OpenAPIObject, OperationObject, PathItemObject } from 'openapi3-ts/oas31';

@Component({
  standalone: false,
  selector: 'app-endpoint-swagger',
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
    const selectedPathItem: PathItemObject = {
      parameters: pathItem?.parameters
    };

    selectedPathItem[method] = this.operation;

    return {
      openapi: this.apiSpec.openapi,
      info: this.apiSpec.info,
      servers: this.apiSpec.servers,
      security: this.apiSpec.security,
      tags: this.apiSpec.tags,
      externalDocs: this.apiSpec.externalDocs,
      components: this.apiSpec.components,
      paths: {
        [this.path]: selectedPathItem
      }
    };
  }

  private createWarningMessage(spec: OpenAPIObject): string | undefined {
    const serverUrl = spec.servers?.[0]?.url;

    if (!serverUrl || typeof globalThis.window === 'undefined') {
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
