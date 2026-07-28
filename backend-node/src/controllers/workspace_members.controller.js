import { query } from '../config/database.js';

export const getWorkspaceMembers = async (req, res) => {
    try {
        const { rows } = await query(`
            SELECT u.id, u.email, u.nombres, u.apellidos, wm.status, r.code as role_code, r.name as role_name
            FROM workspace_members wm
            JOIN users u ON wm.user_id = u.id
            JOIN roles r ON wm.role_id = r.id
            WHERE wm.workspace_id = $1 AND wm.deleted_at IS NULL
        `, [req.user.workspace_id]);
        
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error obteniendo miembros del workspace' });
    }
};

export const addWorkspaceMember = async (req, res) => {
    try {
        const { user_id, role_code } = req.body;
        
        const { rows: roles } = await query('SELECT id FROM roles WHERE code = $1', [role_code]);
        if (roles.length === 0) return res.status(400).json({ message: 'Rol inválido' });
        
        await query(`
            INSERT INTO workspace_members (workspace_id, user_id, role_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (workspace_id, user_id) DO UPDATE SET deleted_at = NULL, role_id = EXCLUDED.role_id, status = 'ACTIVE'
        `, [req.user.workspace_id, user_id, roles[0].id]);
        
        res.json({ message: 'Miembro agregado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error agregando miembro' });
    }
};

export const updateMemberRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role_code } = req.body;
        
        const { rows: roles } = await query('SELECT id FROM roles WHERE code = $1', [role_code]);
        if (roles.length === 0) return res.status(400).json({ message: 'Rol inválido' });
        
        await query(`
            UPDATE workspace_members 
            SET role_id = $1 
            WHERE workspace_id = $2 AND user_id = $3 AND deleted_at IS NULL
        `, [roles[0].id, req.user.workspace_id, userId]);
        
        res.json({ message: 'Rol actualizado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error actualizando rol' });
    }
};

export const removeWorkspaceMember = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (String(userId) === String(req.user.id)) {
            return res.status(400).json({ message: 'No puedes eliminarte a ti mismo del workspace' });
        }
        
        await query(`
            UPDATE workspace_members 
            SET deleted_at = NOW(), status = 'INACTIVE'
            WHERE workspace_id = $1 AND user_id = $2
        `, [req.user.workspace_id, userId]);
        
        res.json({ message: 'Miembro eliminado exitosamente' });
    } catch (error) {
        console.error('ERROR EN removeWorkspaceMember:', error);
        res.status(500).json({ message: 'Error eliminando miembro: ' + error.message });
    }
};
