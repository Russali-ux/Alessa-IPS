import { query } from '../config/database.js';

export const findAllUsers = async () => {
    const sql = `
        SELECT u.id, u.email, u.nombres, u.apellidos, u.telefono, u.is_active, u.created_at
        FROM users u
        WHERE u.deleted_at IS NULL
        ORDER BY u.created_at DESC;
    `;
    const { rows } = await query(sql);
    return rows;
};

export const findUsersInAdminWorkspaces = async (adminUserId) => {
    const sql = `
        SELECT DISTINCT u.id, u.email, u.nombres, u.apellidos, u.telefono, u.is_active, u.created_at
        FROM users u
        JOIN workspace_members wm ON u.id = wm.user_id
        WHERE u.deleted_at IS NULL AND wm.deleted_at IS NULL AND wm.status = 'ACTIVE'
        AND wm.workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members wm2
            JOIN roles r ON wm2.role_id = r.id
            WHERE wm2.user_id = $1 AND wm2.deleted_at IS NULL AND wm2.status = 'ACTIVE'
            AND r.code IN ('SUPER_ADMIN', 'WORKSPACE_ADMIN')
        )
        ORDER BY u.created_at DESC;
    `;
    const { rows } = await query(sql, [adminUserId]);
    return rows;
};

export const findUserById = async (id) => {
    const sql = `
        SELECT u.id, u.email, u.nombres, u.apellidos, u.telefono, u.is_active, u.created_at
        FROM users u
        WHERE u.id = $1 AND u.deleted_at IS NULL
    `;
    const { rows } = await query(sql, [id]);
    return rows[0];
};

export const findUserByEmail = async (email) => {
    const sql = `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL;`;
    const { rows } = await query(sql, [email]);
    return rows[0];
};

export const createUser = async (userData) => {
    const { email, passwordHash, nombres, apellidos, telefono, is_active } = userData;
    const sql = `
        INSERT INTO users (email, password_hash, nombres, apellidos, telefono, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, nombres, apellidos, telefono, is_active, created_at;
    `;
    const { rows } = await query(sql, [email, passwordHash, nombres, apellidos, telefono, is_active]);
    return rows[0];
};

export const assignRoleToUser = async (userId, roleId) => {
    // Role assignment is now handled per workspace in workspace_members.
    // This function is kept for backward compatibility if needed, but it should not be used globally.
    console.warn('assignRoleToUser called globally, this is deprecated.');
    return null;
};

export const deleteRolesByUserId = async (userId) => {
    // Deprecated
    console.warn('deleteRolesByUserId called globally, this is deprecated.');
};

export const updateUser = async (id, updateData) => {
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
        UPDATE users 
        SET ${fields.join(', ')} 
        WHERE id = $${count} AND deleted_at IS NULL 
        RETURNING id, email, nombres, apellidos, telefono, is_active, updated_at;
    `;
    
    const { rows } = await query(sql, values);
    return rows[0];
};

export const deleteUser = async (id) => {
    const sql = `
        UPDATE users 
        SET deleted_at = NOW(), updated_at = NOW(), is_active = FALSE
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id;
    `;
    const { rows } = await query(sql, [id]);
    return rows[0];
};

export const getAllRoles = async () => {
    const sql = `SELECT * FROM roles ORDER BY name ASC;`;
    const { rows } = await query(sql);
    return rows;
};

export const findRoleById = async (id) => {
    const sql = `SELECT * FROM roles WHERE id = $1;`;
    const { rows } = await query(sql, [id]);
    return rows[0];
};

export const getWorkspacesByUser = async (userId) => {
    const sql = `
        SELECT w.id, w.code, w.name, w.company_name, wm.role_id, r.code as role_code, r.name as role_name
        FROM workspaces w
        JOIN workspace_members wm ON w.id = wm.workspace_id
        JOIN roles r ON wm.role_id = r.id
        WHERE wm.user_id = $1 AND w.status = 'ACTIVE' AND wm.status = 'ACTIVE' AND w.deleted_at IS NULL AND wm.deleted_at IS NULL
    `;
    const { rows } = await query(sql, [userId]);
    return rows;
};

