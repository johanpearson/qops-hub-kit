/**
 * Database connection example
 *
 * This file demonstrates how to integrate database connections
 * with the @qops/hub-kit package. The service layer handles all
 * database interactions, keeping your Azure Function handlers clean.
 *
 * Supported databases:
 * - Azure Cosmos DB: @azure/cosmos
 * - Azure SQL: tedious or mssql
 * - PostgreSQL: pg
 * - MongoDB: mongodb
 * - MySQL: mysql2
 */

/**
 * Example: PostgreSQL connection
 *
 * Install: npm install pg
 *
 * import { Pool } from 'pg';
 *
 * const pool = new Pool({
 *   host: process.env.DB_HOST,
 *   port: parseInt(process.env.DB_PORT || '5432'),
 *   database: process.env.DB_NAME,
 *   user: process.env.DB_USER,
 *   password: process.env.DB_PASSWORD,
 *   ssl: process.env.DB_SSL === 'true',
 * });
 *
 * export async function getUserFromDb(id: string) {
 *   const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
 *   return result.rows[0];
 * }
 */

/**
 * Example: Azure Cosmos DB
 *
 * Install: npm install @azure/cosmos
 *
 * import { CosmosClient } from '@azure/cosmos';
 *
 * const client = new CosmosClient({
 *   endpoint: process.env.COSMOS_ENDPOINT!,
 *   key: process.env.COSMOS_KEY!,
 * });
 *
 * const database = client.database('mydb');
 * const container = database.container('users');
 *
 * export async function getUserFromCosmos(id: string) {
 *   const { resource } = await container.item(id, id).read();
 *   return resource;
 * }
 *
 * export async function createUserInCosmos(user: any) {
 *   const { resource } = await container.items.create(user);
 *   return resource;
 * }
 */

/**
 * Example: MongoDB
 *
 * Install: npm install mongodb
 *
 * import { MongoClient } from 'mongodb';
 *
 * const client = new MongoClient(process.env.MONGODB_URI!);
 * await client.connect();
 *
 * const db = client.db('mydb');
 * const users = db.collection('users');
 *
 * export async function getUserFromMongo(id: string) {
 *   return await users.findOne({ _id: id });
 * }
 *
 * export async function createUserInMongo(user: any) {
 *   const result = await users.insertOne(user);
 *   return { ...user, _id: result.insertedId };
 * }
 */

/**
 * Example: Azure SQL Database
 *
 * Install: npm install mssql
 *
 * import sql from 'mssql';
 *
 * const config = {
 *   server: process.env.SQL_SERVER!,
 *   database: process.env.SQL_DATABASE!,
 *   user: process.env.SQL_USER!,
 *   password: process.env.SQL_PASSWORD!,
 *   options: {
 *     encrypt: true,
 *     trustServerCertificate: false,
 *   },
 * };
 *
 * export async function getUserFromSql(id: string) {
 *   const pool = await sql.connect(config);
 *   const result = await pool.request()
 *     .input('id', sql.VarChar, id)
 *     .query('SELECT * FROM users WHERE id = @id');
 *   return result.recordset[0];
 * }
 */

/**
 * Best Practices:
 *
 * 1. Use connection pooling for better performance
 * 2. Handle errors gracefully with AppError
 * 3. Keep database logic in service layer
 * 4. Use environment variables for configuration
 * 5. Implement retry logic for transient failures
 * 6. Close connections properly
 */

// In-memory "database" for demonstration
const db = new Map<string, any>();

export async function saveToDb(key: string, value: any): Promise<void> {
  db.set(key, value);
}

export async function getFromDb(key: string): Promise<any> {
  return db.get(key);
}

export async function deleteFromDb(key: string): Promise<boolean> {
  return db.delete(key);
}

export async function queryDb(filter: (value: any) => boolean): Promise<any[]> {
  return Array.from(db.values()).filter(filter);
}
