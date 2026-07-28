import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Client } = pg;

const createDatabase = async () => {
  // Connect to default 'postgres' database to create the new one
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres', // default db
  });

  try {
    await client.connect();
    const dbName = process.env.DB_NAME || 'AlessaIPS';
    
    // Check if database exists
    const res = await client.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${dbName}'`);
    
    if (res.rowCount === 0) {
      console.log(`Creando la base de datos "${dbName}"...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Base de datos "${dbName}" creada exitosamente.`);
    } else {
      console.log(`La base de datos "${dbName}" ya existe.`);
    }
  } catch (err) {
    console.error('Error creando la base de datos:', err);
  } finally {
    await client.end();
  }
};

createDatabase();
