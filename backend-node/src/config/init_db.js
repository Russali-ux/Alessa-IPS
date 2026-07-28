import { query } from './database.js';

const createTables = async () => {
  const schema = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- Drop tables if they exist to apply new schema
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS user_clients CASCADE;
    DROP TABLE IF EXISTS user_roles CASCADE;
    DROP TABLE IF EXISTS clients CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS roles CASCADE;
    DROP TABLE IF EXISTS organizations CASCADE;

    CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100),
        telefono VARCHAR(30),
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
    );

    CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        role_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (role_id) REFERENCES roles(id),
        UNIQUE(user_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        codigo VARCHAR(20) UNIQUE NOT NULL,
        razon_social TEXT NOT NULL,
        activo BOOLEAN DEFAULT TRUE,
        manager_user_id UUID,
        area_farmacovigilancia TEXT,
        direccion TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id),
        FOREIGN KEY (manager_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        client_id UUID NOT NULL,
        role_in_client VARCHAR(30),
        assigned_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (client_id) REFERENCES clients(id),
        UNIQUE(user_id, client_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        action VARCHAR(100),
        entity_type VARCHAR(50),
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `;

  const seedInitialData = `
    -- Seed Roles
    INSERT INTO roles (code, name, description) 
    VALUES 
        ('SUPER_ADMIN', 'Super Administrator', 'Full system access'),
        ('ORG_ADMIN', 'Organization Admin', 'Admin access for an organization'),
        ('USER', 'User', 'Standard user access')
    ON CONFLICT (code) DO NOTHING;

    -- Seed Initial Organization
    INSERT INTO organizations (code, name)
    VALUES ('CKM', 'CKM Consulting')
    ON CONFLICT (code) DO NOTHING;
  `;

  try {
    console.log('Creando tablas...');
    await query(schema);
    console.log('Tablas creadas exitosamente.');
    
    console.log('Insertando datos iniciales...');
    await query(seedInitialData);
    console.log('Roles y Organización inicial insertados exitosamente.');
  } catch (err) {
    console.error('Error inicializando la base de datos:', err);
  }
};

createTables();
