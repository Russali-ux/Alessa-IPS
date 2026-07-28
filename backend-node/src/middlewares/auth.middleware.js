import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET || 'secret-key-123', (err, user) => {
        if (err) return res.status(401).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

export const requireWorkspace = async (req, res, next) => {
    const workspaceId = req.headers['x-workspace-id'];
    
    if (!workspaceId) {
        return res.status(403).json({ message: 'Debe seleccionar un Workspace para continuar' });
    }

    try {
        // Validación bypass para Super Admin
        if (req.user.email === 'contact@alessadatabase.cloud') {
            req.user.workspace_id = workspaceId;
            req.user.role = { role_code: 'SUPER_ADMIN', role_name: 'Super Administrador' };
            return next();
        }

        const { rows } = await query(`
            SELECT wm.role_id, r.code as role_code, r.name as role_name
            FROM workspace_members wm
            JOIN roles r ON wm.role_id = r.id
            JOIN workspaces w ON wm.workspace_id = w.id
            WHERE wm.user_id = $1 AND wm.workspace_id = $2 
            AND wm.status = 'ACTIVE' AND w.status = 'ACTIVE'
            AND wm.deleted_at IS NULL AND w.deleted_at IS NULL
        `, [req.user.id, workspaceId]);

        if (rows.length === 0) {
            // Revisa si es super admin global por otro workspace
            const { rows: superAdminRows } = await query(`
                SELECT 1
                FROM workspace_members wm
                JOIN roles r ON wm.role_id = r.id
                WHERE wm.user_id = $1 AND r.code = 'SUPER_ADMIN' AND wm.status = 'ACTIVE' AND wm.deleted_at IS NULL
            `, [req.user.id]);

            if (superAdminRows.length > 0) {
                req.user.workspace_id = workspaceId;
                req.user.role = { role_code: 'SUPER_ADMIN', role_name: 'Super Administrador' };
                return next();
            }

            return res.status(403).json({ message: 'No tiene acceso a este Workspace o ha sido desactivado' });
        }

        req.user.workspace_id = workspaceId;
        req.user.role = rows[0]; // { role_id, role_code, role_name }
        
        next();
    } catch (error) {
        console.error('Error validating workspace:', error);
        return res.status(500).json({ message: 'Error interno validando acceso al Workspace' });
    }
};

export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role || !req.user.role.role_code) {
            return res.status(403).json({ message: 'No se identificaron roles en el Workspace actual' });
        }
        
        const hasRole = roles.includes(req.user.role.role_code);
        if (!hasRole) {
            return res.status(403).json({ message: 'Permisos insuficientes para realizar esta acción' });
        }
        
        next();
    };
};

export const requireSuperAdmin = async (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'No autenticado' });

    // Para el usuario principal
    if (req.user.email === 'contact@alessadatabase.cloud') {
        return next();
    }

    try {
        // Consultar si el usuario tiene rol SUPER_ADMIN en algún workspace
        const { rows } = await query(`
            SELECT 1
            FROM workspace_members wm
            JOIN roles r ON wm.role_id = r.id
            WHERE wm.user_id = $1 AND r.code = 'SUPER_ADMIN' AND wm.status = 'ACTIVE' AND wm.deleted_at IS NULL
        `, [req.user.id]);

        if (rows.length > 0) {
            return next();
        }

        return res.status(403).json({ message: 'Permisos de Super Administrador requeridos' });
    } catch (error) {
        console.error('Error validating super admin:', error);
        return res.status(500).json({ message: 'Error validando permisos globales' });
    }
};
