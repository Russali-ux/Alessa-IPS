import { query } from './database.js';
import { clientesConfig } from '../../../src/config/clientesConfig.js';
import bcrypt from 'bcrypt';

const migrate = async () => {
  try {
    console.log('Iniciando migración a Multi-Workspace...');

    // 1. Quitar dependencias de la tabla users sin eliminarla
    console.log('Modificando tabla users...');
    await query(`ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_organization_id_fkey CASCADE;`);
    await query(`ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS organization_id;`);

    // 2. Eliminar tablas antiguas
    console.log('Eliminando tablas antiguas...');
    await query(`DROP TABLE IF EXISTS audit_logs CASCADE;`);
    await query(`DROP TABLE IF EXISTS user_clients CASCADE;`);
    await query(`DROP TABLE IF EXISTS user_roles CASCADE;`);
    await query(`DROP TABLE IF EXISTS clients CASCADE;`);
    await query(`DROP TABLE IF EXISTS organizations CASCADE;`);
    await query(`DROP TABLE IF EXISTS role_permissions CASCADE;`);
    await query(`DROP TABLE IF EXISTS permissions CASCADE;`);
    await query(`DROP TABLE IF EXISTS roles CASCADE;`); // Recrearemos roles

    // 3. Crear nuevas tablas
    console.log('Creando nuevas tablas...');
    const schema = `
      CREATE TABLE IF NOT EXISTS workspaces (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(20) UNIQUE NOT NULL,
          name VARCHAR(150) NOT NULL,
          company_name VARCHAR(150),
          workspace_type VARCHAR(50) DEFAULT 'LABORATORIO',
          status VARCHAR(20) DEFAULT 'ACTIVE',
          subscription_plan VARCHAR(50) DEFAULT 'TRIAL',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          deleted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(50) UNIQUE NOT NULL,
          description TEXT
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
          role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
          permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
          PRIMARY KEY (role_id, permission_id)
      );

      CREATE TABLE IF NOT EXISTS workspace_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role_id UUID NOT NULL REFERENCES roles(id),
          status VARCHAR(20) DEFAULT 'ACTIVE',
          joined_at TIMESTAMP DEFAULT NOW(),
          deleted_at TIMESTAMP,
          UNIQUE(workspace_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS ips_schedules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          year INT NOT NULL,
          period VARCHAR(20),
          status VARCHAR(20) DEFAULT 'ACTIVE',
          created_by UUID REFERENCES users(id),
          UNIQUE(workspace_id, year, period)
      );

      CREATE TABLE IF NOT EXISTS schedule_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          schedule_id UUID NOT NULL REFERENCES ips_schedules(id) ON DELETE CASCADE,
          workspace_member_id UUID NOT NULL REFERENCES workspace_members(id) ON DELETE CASCADE,
          assigned_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(schedule_id, workspace_member_id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID REFERENCES workspaces(id),
          user_id UUID REFERENCES users(id),
          module VARCHAR(50),
          action VARCHAR(100),
          record_type VARCHAR(50),
          record_id UUID,
          old_values JSONB,
          new_values JSONB,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await query(schema);

    // 4. Sembrar Roles y Permisos Básicos
    console.log('Sembrando roles...');
    const rolesData = [
      { code: 'SUPER_ADMIN', name: 'Super Administrador', desc: 'Control total de la plataforma' },
      { code: 'WORKSPACE_ADMIN', name: 'Administrador', desc: 'Administrador del Workspace' },
      { code: 'DATA_ENTRY', name: 'Data Entry', desc: 'Ingreso de datos y generación de IPS' },
      { code: 'REVISOR', name: 'Revisor', desc: 'Revisión y aprobación' }
    ];
    for (const r of rolesData) {
      await query(`INSERT INTO roles (code, name, description) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING`, [r.code, r.name, r.desc]);
    }

    // Obtener mapa de roles
    const { rows: rolesRows } = await query(`SELECT id, code FROM roles`);
    const roleMap = rolesRows.reduce((acc, r) => ({ ...acc, [r.code]: r.id }), {});

    // 5. Migrar Clientes a Workspaces
    console.log('Migrando clientesConfig a Workspaces...');
    for (const client of clientesConfig) {
      const code = client.id;
      const name = client.empresa.razonSocial;
      const isActive = client.activo ? 'ACTIVE' : 'INACTIVE';
      await query(`
        INSERT INTO workspaces (code, name, company_name, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO NOTHING
      `, [code, name, name, isActive]);
    }

    // Obtener mapa de workspaces
    const { rows: wsRows } = await query(`SELECT id, code FROM workspaces`);
    const wsMap = wsRows.reduce((acc, w) => ({ ...acc, [w.code]: w.id }), {});

    // 6. Asegurar existencia de Usuarios base si no existen, y obtener SuperAdmin
    console.log('Asegurando SuperAdministrador...');
    let { rows: superAdminRows } = await query(`SELECT id FROM users WHERE email = 'superadmin@ckm.com'`);
    if (superAdminRows.length === 0) {
      const passwordHash = await bcrypt.hash('123456', 10);
      const res = await query(
        `INSERT INTO users (email, password_hash, nombres, apellidos, is_active) 
         VALUES ($1, $2, $3, $4, true) RETURNING id`,
        ['superadmin@ckm.com', passwordHash, 'Super', 'Admin']
      );
      superAdminRows = res.rows;
    }
    const superAdminId = superAdminRows[0].id;

    let { rows: normalUserRows } = await query(`SELECT id FROM users WHERE email = 'user@ckm.com'`);
    if (normalUserRows.length === 0) {
      const passwordHash = await bcrypt.hash('123456', 10);
      const res = await query(
        `INSERT INTO users (email, password_hash, nombres, apellidos, is_active) 
         VALUES ($1, $2, $3, $4, true) RETURNING id`,
        ['user@ckm.com', passwordHash, 'Normal', 'User']
      );
      normalUserRows = res.rows;
    }
    const normalUserId = normalUserRows[0].id;

    // 7. Asignar SuperAdmin a TODOS los workspaces
    console.log('Asignando SuperAdmin a todos los workspaces...');
    for (const ws of wsRows) {
      await query(`
        INSERT INTO workspace_members (workspace_id, user_id, role_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (workspace_id, user_id) DO NOTHING
      `, [ws.id, superAdminId, roleMap['SUPER_ADMIN']]);
    }

    // 8. Asignar usuario normal a algunos workspaces activos como DATA_ENTRY
    console.log('Asignando User normal a workspaces activos...');
    const activeClients = clientesConfig.filter(c => c.activo);
    for (const client of activeClients) {
      const wsId = wsMap[client.id];
      if (wsId) {
        await query(`
          INSERT INTO workspace_members (workspace_id, user_id, role_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (workspace_id, user_id) DO NOTHING
        `, [wsId, normalUserId, roleMap['DATA_ENTRY']]);
      }
    }

    console.log('¡Migración a Multi-Workspace completada con éxito!');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
};

migrate();
