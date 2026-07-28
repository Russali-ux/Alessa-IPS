import { query } from '../config/database.js';

export const createAuditLog = async (userId, action, entityType, entityId, oldValues, newValues) => {
    const sql = `
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;
    const params = [
        userId || null, 
        action, 
        entityType, 
        entityId, 
        oldValues ? JSON.stringify(oldValues) : null, 
        newValues ? JSON.stringify(newValues) : null
    ];
    const { rows } = await query(sql, params);
    return rows[0];
};
