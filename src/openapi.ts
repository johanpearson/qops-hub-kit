import { z } from 'zod';
import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

// Extend Zod with OpenAPI capabilities
extendZodWithOpenApi(z);

/**
 * HTTP methods supported
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Route definition for OpenAPI documentation
 */
export interface RouteDefinition {
  /**
   * HTTP method
   */
  method: HttpMethod;
  /**
   * Path pattern
   */
  path: string;
  /**
   * Operation summary
   */
  summary: string;
  /**
   * Operation description
   */
  description?: string;
  /**
   * Request body schema (Zod schema)
   */
  requestBody?: z.ZodTypeAny;
  /**
   * Query parameters schema (Zod object schema)
   */
  queryParams?: z.ZodObject<any>;
  /**
   * Path parameters schema (Zod object schema)
   */
  pathParams?: z.ZodObject<any>;
  /**
   * Response schemas by status code
   */
  responses: {
    [statusCode: number]: {
      description: string;
      schema?: z.ZodTypeAny;
    };
  };
  /**
   * Tags for grouping operations
   */
  tags?: string[];
  /**
   * Whether authentication is required
   */
  requiresAuth?: boolean;
}

/**
 * OpenAPI configuration
 */
export interface OpenApiConfig {
  /**
   * API title
   */
  title: string;
  /**
   * API version
   */
  version: string;
  /**
   * API description
   */
  description?: string;
  /**
   * Server URLs
   */
  servers?: Array<{ url: string; description?: string }>;
}

/**
 * OpenAPI documentation builder
 */
export class OpenApiBuilder {
  private registry: OpenAPIRegistry;
  private config: OpenApiConfig;

  constructor(config: OpenApiConfig) {
    this.registry = new OpenAPIRegistry();
    this.config = config;

    // Register security scheme for JWT
    this.registry.registerComponent('securitySchemes', 'bearerAuth', {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  }

  /**
   * Register a route in the OpenAPI documentation
   * 
   * @param route - Route definition
   */
  registerRoute(route: RouteDefinition): void {
    const requestBody = route.requestBody
      ? {
          content: {
            'application/json': {
              schema: route.requestBody,
            },
          },
        }
      : undefined;

    const parameters: any[] = [];

    if (route.queryParams) {
      const queryShape = route.queryParams.shape;
      for (const [name, schema] of Object.entries(queryShape)) {
        parameters.push({
          name,
          in: 'query',
          schema: schema as z.ZodTypeAny,
        });
      }
    }

    if (route.pathParams) {
      const pathShape = route.pathParams.shape;
      for (const [name, schema] of Object.entries(pathShape)) {
        parameters.push({
          name,
          in: 'path',
          required: true,
          schema: schema as z.ZodTypeAny,
        });
      }
    }

    const responses: any = {};
    for (const [statusCode, response] of Object.entries(route.responses)) {
      responses[statusCode] = {
        description: response.description,
        ...(response.schema && {
          content: {
            'application/json': {
              schema: response.schema,
            },
          },
        }),
      };
    }

    this.registry.registerPath({
      method: route.method.toLowerCase() as any,
      path: route.path,
      summary: route.summary,
      description: route.description,
      tags: route.tags,
      ...(requestBody && { request: { body: requestBody } }),
      ...(parameters.length > 0 && { request: { params: z.object({}) } }),
      responses,
      ...(route.requiresAuth && {
        security: [{ bearerAuth: [] }],
      }),
    });
  }

  /**
   * Generate OpenAPI document
   * 
   * @returns OpenAPI v3 document
   */
  generateDocument(): any {
    const generator = new OpenApiGeneratorV3(this.registry.definitions);

    return generator.generateDocument({
      openapi: '3.0.0',
      info: {
        title: this.config.title,
        version: this.config.version,
        description: this.config.description,
      },
      servers: this.config.servers || [],
    });
  }
}

/**
 * Export Zod with OpenAPI extensions for convenience
 */
export { z };
