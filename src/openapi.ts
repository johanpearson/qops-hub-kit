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
   * Enable file upload (multipart/form-data)
   */
  enableFileUpload?: boolean;
  /**
   * Form fields schema (for multipart/form-data)
   */
  formFieldsSchema?: z.ZodObject<any>;
  /**
   * File upload field definitions
   */
  fileFields?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
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
    let requestBody: any = undefined;

    if (route.enableFileUpload) {
      // Build multipart/form-data schema
      const properties: any = {};
      const required: string[] = [];

      // Add file fields
      if (route.fileFields) {
        for (const fileField of route.fileFields) {
          properties[fileField.name] = {
            type: 'string',
            format: 'binary',
            description: fileField.description || 'File to upload',
          };
          if (fileField.required) {
            required.push(fileField.name);
          }
        }
      }

      // Add form fields from schema
      if (route.formFieldsSchema) {
        const shape = route.formFieldsSchema.shape;
        if (shape) {
          for (const [key, zodType] of Object.entries(shape as Record<string, any>)) {
            // Use safeParse to determine if field is required
            const testResult = route.formFieldsSchema.safeParse({ [key]: undefined });
            const isRequired = !testResult.success && testResult.error.issues.some((issue) => issue.path.includes(key));

            // Simple type mapping - extend as needed
            let type = 'string';
            const typeName = (zodType as any)._def?.typeName;
            if (typeName === 'ZodNumber') {
              type = 'number';
            } else if (typeName === 'ZodBoolean') {
              type = 'boolean';
            }

            properties[key] = {
              type,
              description: (zodType as any)._def?.description || undefined,
            };

            if (isRequired) {
              required.push(key);
            }
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
