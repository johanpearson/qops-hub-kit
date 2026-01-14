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
 * Server variable configuration for OpenAPI
 */
export interface ServerVariable {
  /**
   * Default value for the variable
   */
  default: string | boolean | number;
  /**
   * Enumeration of allowed values
   */
  enum?: string[] | boolean[] | number[];
  /**
   * Description of the variable
   */
  description?: string;
  /**
   * Allow extension properties (x-*)
   */
  [key: `x-${string}`]: any;
}

/**
 * Server configuration for OpenAPI
 */
export interface ServerConfig {
  /**
   * Server URL (may contain variables in curly braces, e.g., {protocol}://{host})
   */
  url: string;
  /**
   * Server description
   */
  description?: string;
  /**
   * Variables for server URL templating
   */
  variables?: Record<string, ServerVariable>;
  /**
   * Allow extension properties (x-*)
   */
  [key: `x-${string}`]: any;
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
  servers?: ServerConfig[];
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
      // Build schema combining form data fields and file uploads
      let combinedSchema = route.formDataSchema || z.object({});

      // Add file upload fields to the schema
      if (route.fileUploads) {
        const fileFields: Record<string, z.ZodTypeAny> = {};
        for (const [fieldName, fileConfig] of Object.entries(route.fileUploads)) {
          // File uploads are represented as strings with binary format in OpenAPI
          const baseFileSchema = z.string().openapi({
            type: 'string',
            format: 'binary',
            description: fileConfig.description,
          });

          fileFields[fieldName] = fileConfig.required ? baseFileSchema : baseFileSchema.optional();
        }

        // Merge file fields with form data fields
        const fileFieldsSchema = z.object(fileFields);
        combinedSchema = combinedSchema.merge(fileFieldsSchema);
      }

      requestBody = {
        content: {
          'multipart/form-data': {
            schema: combinedSchema,
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
