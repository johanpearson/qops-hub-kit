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
   * Form data schema for file uploads (Zod object schema)
   * When specified, generates multipart/form-data request body
   */
  formDataSchema?: z.ZodObject<any>;
  /**
   * File upload fields configuration
   * Maps field name to file configuration
   */
  fileUploads?: Record<
    string,
    {
      description?: string;
      required?: boolean;
      multiple?: boolean;
    }
  >;
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
    let requestBody;

    // Handle multipart/form-data for file uploads
    if (route.formDataSchema || route.fileUploads) {
      const properties: any = {};
      const required: string[] = [];

      // Add regular form fields from schema
      if (route.formDataSchema) {
        // Use the schema directly for OpenAPI generation
        // The zod-to-openapi library will handle the conversion
        const schemaShape = (route.formDataSchema as any)._def?.shape;
        if (schemaShape) {
          if (typeof schemaShape === 'function') {
            const shape = schemaShape();
            for (const [key, zodType] of Object.entries(shape)) {
              properties[key] = zodType;
              const isOptional = (zodType as any)._def?.typeName === 'ZodOptional';
              if (!isOptional) {
                required.push(key);
              }
            }
          } else {
            // Handle direct shape object
            for (const [key, zodType] of Object.entries(schemaShape)) {
              properties[key] = zodType;
              const isOptional = (zodType as any)._def?.typeName === 'ZodOptional';
              if (!isOptional) {
                required.push(key);
              }
            }
          }
        }
      }

      // Add file upload fields
      if (route.fileUploads) {
        for (const [fieldName, fileConfig] of Object.entries(route.fileUploads)) {
          properties[fieldName] = {
            type: 'string',
            format: 'binary',
            description: fileConfig.description,
          };
          if (fileConfig.required) {
            required.push(fieldName);
          }
        }
      }

      requestBody = {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties,
              ...(required.length > 0 && { required }),
            },
          },
        },
      };
    } else if (route.requestBody) {
      // Regular JSON request body
      requestBody = {
        content: {
          'application/json': {
            schema: route.requestBody,
          },
        },
      };
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

    const requestConfig: any = {};
    if (requestBody) {
      requestConfig.body = requestBody;
    }
    if (route.queryParams) {
      requestConfig.query = route.queryParams;
    }
    if (route.pathParams) {
      requestConfig.params = route.pathParams;
    }

    this.registry.registerPath({
      method: route.method.toLowerCase() as any,
      path: route.path,
      summary: route.summary,
      description: route.description,
      tags: route.tags,
      ...(Object.keys(requestConfig).length > 0 && { request: requestConfig }),
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
