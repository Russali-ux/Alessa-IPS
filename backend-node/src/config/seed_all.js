import { query } from './database.js';
import { clientesConfig } from '../../../src/config/clientesConfig.js';
import bcrypt from 'bcrypt';

const seedAll = async () => {
  try {
    console.log('Iniciando el seeder maestro...');
    
    // 1. Obtener ID de la Organización CKM
    let { rows: orgRows } = await query(`SELECT id FROM organizations WHERE code = 'CKM'`);
    if (orgRows.length === 0) {
      const res = await query(`INSERT INTO organizations (code, name) VALUES ('CKM', 'CKM Consulting') RETURNING id`);
      orgRows = res.rows;
    }
    const ckmOrgId = orgRows[0].id;

    // 2. Obtener IDs de Roles
    const { rows: roles } = await query(`SELECT id, code FROM roles`);
    const roleMap = roles.reduce((acc, curr) => ({ ...acc, [curr.code]: curr.id }), {});

    // 3. Crear Usuarios de Prueba
    const passwordHash = await bcrypt.hash('123456', 10);
    
    const usersData = [
      { email: 'superadmin@ckm.com', nombres: 'Super', apellidos: 'Admin', roleCode: 'SUPER_ADMIN' },
      { email: 'admin@ckm.com', nombres: 'Org', apellidos: 'Admin', roleCode: 'ORG_ADMIN' },
      { email: 'user@ckm.com', nombres: 'Normal', apellidos: 'User', roleCode: 'USER' }
    ];

    const createdUsers = {}; // Para guardar IDs: { 'admin@ckm.com': 'uuid' }

    for (const u of usersData) {
      // Check if user exists
      let { rows: userRows } = await query(`SELECT id FROM users WHERE email = $1`, [u.email]);
      let userId;
      if (userRows.length === 0) {
        const res = await query(
          `INSERT INTO users (organization_id, email, password_hash, nombres, apellidos, is_active) 
           VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
          [ckmOrgId, u.email, passwordHash, u.nombres, u.apellidos]
        );
        userId = res.rows[0].id;
        // Asignar rol
        await query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, roleMap[u.roleCode]]
        );
        console.log(`Usuario creado: ${u.email} con rol ${u.roleCode}`);
      } else {
        userId = userRows[0].id;
      }
      createdUsers[u.email] = userId;
    }

    // 4. Poblar Clientes
    console.log(`Poblando ${clientesConfig.length} clientes...`);
    let insertedClients = 0;
    
    for (const client of clientesConfig) {
      // Por defecto asignamos el org admin como manager
      const managerId = createdUsers['admin@ckm.com'];
      
      const sql = `
        INSERT INTO clients (organization_id, codigo, razon_social, activo, manager_user_id, area_farmacovigilancia, direccion)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (codigo) DO UPDATE 
        SET razon_social = EXCLUDED.razon_social,
            activo = EXCLUDED.activo,
            manager_user_id = EXCLUDED.manager_user_id,
            area_farmacovigilancia = EXCLUDED.area_farmacovigilancia,
            direccion = EXCLUDED.direccion
        RETURNING id;
      `;
      
      const values = [
        ckmOrgId,
        client.id, // codigo
        client.empresa.razonSocial,
        client.activo,
        managerId, 
        client.fv?.area || '',
        client.fv?.direccion || ''
      ];
      
      const clientRes = await query(sql, values);
      insertedClients++;

      // Asignar los clientes activos al usuario normal para que pueda verlos
      if (client.activo) {
        await query(
          `INSERT INTO user_clients (user_id, client_id, role_in_client) VALUES ($1, $2, 'Consultor') ON CONFLICT DO NOTHING`,
          [createdUsers['user@ckm.com'], clientRes.rows[0].id]
        );
      }
    }
    
    console.log(`¡Éxito! ${insertedClients} clientes insertados. El usuario 'user@ckm.com' fue asignado a los clientes activos.`);
    process.exit(0);
  } catch (error) {
    console.error('Error poblando la base de datos:', error);
    process.exit(1);
  }
};

seedAll();
