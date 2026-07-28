import { query } from '../config/database.js';

export const getAllWorkspaces = async (req, res) => {
    try {
        const { rows } = await query(`
            SELECT id, code, name, company_name, workspace_type, status, metadata, created_at
            FROM workspaces
            WHERE deleted_at IS NULL
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error obteniendo workspaces' });
    }
};

export const getAdminWorkspaces = async (req, res) => {
    try {
        // Find workspaces where the user has SUPER_ADMIN or WORKSPACE_ADMIN roles
        const { rows } = await query(`
            SELECT w.id, w.code, w.name, w.company_name, w.workspace_type, w.status, w.metadata, w.created_at
            FROM workspaces w
            JOIN workspace_members wm ON w.id = wm.workspace_id
            JOIN roles r ON wm.role_id = r.id
            WHERE wm.user_id = $1 AND w.deleted_at IS NULL AND wm.deleted_at IS NULL AND wm.status = 'ACTIVE'
            AND r.code IN ('SUPER_ADMIN', 'WORKSPACE_ADMIN')
        `, [req.user.id]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error obteniendo workspaces del admin' });
    }
};

export const createWorkspace = async (req, res) => {
    try {
        let { code, name, company_name, workspace_type, fv_area, fv_direccion } = req.body;
        
        // Auto-generate code if not provided
        if (!code) {
            const { rows: maxCodeRows } = await query(`
                SELECT code FROM workspaces 
                WHERE code LIKE 'C%' 
                ORDER BY CAST(SUBSTRING(code FROM 2) AS INTEGER) DESC LIMIT 1
            `);
            if (maxCodeRows.length > 0) {
                const maxCode = maxCodeRows[0].code;
                const num = parseInt(maxCode.substring(1), 10);
                code = `C${String(num + 1).padStart(3, '0')}`;
            } else {
                code = 'C001';
            }
        }
        
        let metadata = {
            fv: {
                area: fv_area || '',
                direccion: fv_direccion || ''
            },
            plantillas: {},
            catalogos: {}
        };
        
        if (req.files) {
            if (req.files.templateWord && req.files.templateWord[0]) {
                metadata.plantillas.ips = req.files.templateWord[0].filename;
            }
            if (req.files.inventoryExcel && req.files.inventoryExcel[0]) {
                metadata.catalogos.productosFile = req.files.inventoryExcel[0].filename;
            }
        }

        const { rows } = await query(`
            INSERT INTO workspaces (code, name, company_name, workspace_type, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, code, name, company_name, metadata
        `, [code, name, company_name, workspace_type, metadata]);
        
        // Auto-assign the creator (SuperAdmin) to this new workspace
        const { rows: superAdminRole } = await query(`SELECT id FROM roles WHERE code = 'SUPER_ADMIN'`);
        
        await query(`
            INSERT INTO workspace_members (workspace_id, user_id, role_id)
            VALUES ($1, $2, $3)
        `, [rows[0].id, req.user.id, superAdminRole[0].id]);
        
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creando workspace' });
    }
};

export const getCurrentWorkspace = async (req, res) => {
    try {
        const { rows } = await query(`
            SELECT id, code, name, company_name, workspace_type, status
            FROM workspaces
            WHERE id = $1 AND deleted_at IS NULL
        `, [req.user.workspace_id]);
        
        if (rows.length === 0) return res.status(404).json({ message: 'Workspace no encontrado' });
        
        res.json({ workspace: rows[0], role: req.user.role });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error obteniendo workspace' });
    }
};

export const updateWorkspace = async (req, res) => {
    try {
        const { name, company_name, status, workspace_type, fv_area, fv_direccion } = req.body;
        const targetId = req.params.id || req.user.workspace_id;
        
        if (!targetId) return res.status(400).json({ message: 'Workspace ID requerido' });

        // Get current metadata
        const { rows: currentRows } = await query(`SELECT metadata FROM workspaces WHERE id = $1`, [targetId]);
        if (currentRows.length === 0) return res.status(404).json({ message: 'Workspace no encontrado' });
        
        let metadata = currentRows[0].metadata || { fv: {}, plantillas: {}, catalogos: {} };
        if (!metadata.fv) metadata.fv = {};
        if (!metadata.plantillas) metadata.plantillas = {};
        if (!metadata.catalogos) metadata.catalogos = {};

        if (fv_area !== undefined) metadata.fv.area = fv_area;
        if (fv_direccion !== undefined) metadata.fv.direccion = fv_direccion;

        if (req.files) {
            if (req.files.templateWord && req.files.templateWord[0]) {
                metadata.plantillas.ips = req.files.templateWord[0].filename;
            }
            if (req.files.inventoryExcel && req.files.inventoryExcel[0]) {
                metadata.catalogos.productosFile = req.files.inventoryExcel[0].filename;
            }
        }

        const { rows } = await query(`
            UPDATE workspaces
            SET name = COALESCE($1, name),
                company_name = COALESCE($2, company_name),
                status = COALESCE($3, status),
                workspace_type = COALESCE($4, workspace_type),
                metadata = $5,
                updated_at = NOW()
            WHERE id = $6 AND deleted_at IS NULL
            RETURNING id, code, name, company_name, status, metadata
        `, [name, company_name, status, workspace_type, metadata, targetId]);
        
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error actualizando workspace' });
    }
};
