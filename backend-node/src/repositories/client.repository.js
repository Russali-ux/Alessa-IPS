import { query } from '../config/database.js';

export const findAllClients = async (orgId = null) => {
    let whereClause = "WHERE c.deleted_at IS NULL";
    const params = [];
    if (orgId) {
        params.push(orgId);
        whereClause += ` AND c.organization_id = $1`;
    }
    const sql = `
        SELECT c.*, u.nombres as manager_nombres, u.apellidos as manager_apellidos, o.name as org_name
        FROM clients c
        LEFT JOIN users u ON c.manager_user_id = u.id
        LEFT JOIN organizations o ON c.organization_id = o.id
        ${whereClause}
        ORDER BY c.created_at DESC;
    `;
    const { rows } = await query(sql, params);
    return rows;
};

export const findClientById = async (id, orgId = null) => {
    let whereClause = "WHERE id = $1 AND deleted_at IS NULL";
    const params = [id];
    if (orgId) {
        params.push(orgId);
        whereClause += ` AND organization_id = $2`;
    }
    const sql = `
        SELECT * FROM clients
        ${whereClause};
    `;
    const { rows } = await query(sql, params);
    return rows[0];
};

export const createClient = async (clientData) => {
    const { organization_id, codigo, razon_social, activo, manager_user_id, area_farmacovigilancia, direccion } = clientData;
    const sql = `
        INSERT INTO clients (organization_id, codigo, razon_social, activo, manager_user_id, area_farmacovigilancia, direccion)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
    `;
    const { rows } = await query(sql, [organization_id, codigo, razon_social, activo, manager_user_id, area_farmacovigilancia, direccion]);
    return rows[0];
};

export const updateClient = async (id, updateData) => {
    const fields = [];
    const values = [];
    let count = 1;
    
    for (const [key, value] of Object.entries(updateData)) {
        fields.push(`${key} = $${count}`);
        values.push(value);
        count++;
    }
    
    if (fields.length === 0) return null;
    
    fields.push(`updated_at = NOW()`);
    values.push(id);
    
    const sql = `
        UPDATE clients 
        SET ${fields.join(', ')} 
        WHERE id = $${count} AND deleted_at IS NULL 
        RETURNING *;
    `;
    
    const { rows } = await query(sql, values);
    return rows[0];
};

export const deleteClient = async (id) => {
    // Soft delete
    const sql = `
        UPDATE clients 
        SET deleted_at = NOW(), updated_at = NOW(), activo = FALSE
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id;
    `;
    const { rows } = await query(sql, [id]);
    return rows[0];
};

export const assignUserToClient = async (userId, clientId, roleInClient) => {
    const sql = `
        INSERT INTO user_clients (user_id, client_id, role_in_client)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, client_id) 
        DO UPDATE SET role_in_client = $3, assigned_at = NOW()
        RETURNING *;
    `;
    const { rows } = await query(sql, [userId, clientId, roleInClient]);
    return rows[0];
};

export const findClientsByUserId = async (userId) => {
    const sql = `
        SELECT c.*, uc.role_in_client, uc.assigned_at, o.name as org_name
        FROM clients c
        JOIN user_clients uc ON c.id = uc.client_id
        LEFT JOIN organizations o ON c.organization_id = o.id
        WHERE uc.user_id = $1 AND c.deleted_at IS NULL;
    `;
    const { rows } = await query(sql, [userId]);
    return rows;
};

export const findUsersByClientId = async (clientId) => {
    const sql = `
        SELECT u.id, u.email, u.nombres, u.apellidos, uc.role_in_client, uc.assigned_at
        FROM users u
        JOIN user_clients uc ON u.id = uc.user_id
        WHERE uc.client_id = $1 AND u.deleted_at IS NULL;
    `;
    const { rows } = await query(sql, [clientId]);
    return rows;
};
