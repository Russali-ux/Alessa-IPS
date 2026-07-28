import pool from '../config/database.js';

export const createCase = async (workspaceId, productId, scheduleId, initialData, userId, status = 'Borrador') => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Create Case
        const caseResult = await client.query(`
            INSERT INTO ips_cases (workspace_id, product_id, schedule_id, assigned_to, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [workspaceId, productId, scheduleId, userId, status]);
        
        const newCase = caseResult.rows[0];

        // 2. Build initial JSONB
        const formData = {
            metadata: {
                schemaVersion: 2,
                jsonVersion: 3,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: userId,
                generator: "AlessaIPS"
            },
            master: initialData.master || {},
            version: initialData.version || {},
            editable: initialData.editable || {},
            accumulated: initialData.accumulated || {},
            snapshot: initialData.snapshot || {},
            derived: initialData.derived || {}
        };

        // 3. Create Version 1
        const versionResult = await client.query(`
            INSERT INTO ips_versions (case_id, version_number, form_data, created_by, status)
            VALUES ($1, 1, $2, $3, $4)
            RETURNING *
        `, [newCase.id, JSON.stringify(formData), userId, status]);

        const newVersion = versionResult.rows[0];

        // 4. Log History
        await client.query(`
            INSERT INTO ips_history (version_id, user_id, action, details)
            VALUES ($1, $2, 'CREATE', 'Expediente y versión 1 creados')
        `, [newVersion.id, userId]);

        await client.query('COMMIT');
        
        return { case: newCase, version: newVersion };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

export const getCasesByWorkspace = async (workspaceId) => {
    const result = await pool.query(`
        WITH LatestVersions AS (
            SELECT DISTINCT ON (case_id) 
                case_id, id as latest_version_id, form_data, status as version_status
            FROM ips_versions
            ORDER BY case_id, version_number DESC
        )
        SELECT 
            c.id, c.workspace_id, c.status as case_status, c.created_at,
            (SELECT COUNT(*) FROM ips_versions v WHERE v.case_id = c.id) as version_count,
            (SELECT MAX(updated_at) FROM ips_versions v WHERE v.case_id = c.id) as last_updated,
            v.latest_version_id,
            v.version_status,
            v.form_data->'version'->>'ipsNumero' as "numero_ips",
            v.form_data->'master'->>'producto' as "denominacion",
            v.form_data->'version'->>'codigoIps' as "codigo_ips",
            v.form_data->'version'->>'fechaInicioDatos' as "period_start",
            v.form_data->'version'->>'fcd' as "period_end",
            v.form_data->'version'->>'fechaLimite' as "submission_deadline"
        FROM ips_cases c
        LEFT JOIN LatestVersions v ON c.id = v.case_id
        WHERE c.workspace_id = $1
        ORDER BY c.created_at DESC
    `, [workspaceId]);
    return result.rows;
};

export const getCaseVersions = async (caseId) => {
    const result = await pool.query(`
        SELECT id, case_id, version_number, status, created_at, updated_at, created_by 
        FROM ips_versions 
        WHERE case_id = $1 
        ORDER BY version_number DESC
    `, [caseId]);
    return result.rows;
};

export const getVersionById = async (versionId) => {
    const result = await pool.query(`
        SELECT * FROM ips_versions WHERE id = $1
    `, [versionId]);
    return result.rows[0];
};

export const updateVersionData = async (versionId, formData, userId, status) => {
    // We update the JSONB directly. In a real scenario we might merge, 
    // but React will send the full flattened-then-repacked object.
    
    // Update metadata
    if (formData.metadata) {
        formData.metadata.updatedAt = new Date().toISOString();
    }

    let queryStr = `
        UPDATE ips_versions 
        SET form_data = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
    `;
    let params = [JSON.stringify(formData), versionId];

    if (status) {
        queryStr = `
            UPDATE ips_versions 
            SET form_data = $1, status = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        params.push(status);
        
        // Also update case status to match latest version status if provided
        await pool.query(`UPDATE ips_cases SET status = $1 WHERE id = (SELECT case_id FROM ips_versions WHERE id = $2)`, [status, versionId]);
    }

    const result = await pool.query(queryStr, params);

    return result.rows[0];
};

export const createNextVersion = async (caseId, previousVersionId, newVersionData, userId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get previous version
        const prevVersionRes = await client.query(`
            SELECT * FROM ips_versions WHERE id = $1
        `, [previousVersionId]);
        const prevVersion = prevVersionRes.rows[0];

        if (!prevVersion) throw new Error('Versión previa no encontrada');

        // 2. Calculate next version number
        const nextVersionNumber = prevVersion.version_number + 1;

        // 3. Merge rules for JSONB
        // Copiamos master, editable. Resetamos version.
        const prevData = prevVersion.form_data || {};
        const newData = {
            metadata: {
                ...prevData.metadata,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: userId
            },
            master: prevData.master || {}, // Se copia automático
            editable: prevData.editable || {}, // Se copia automático
            
            // Estos vienen del frontend/nuevo periodo:
            version: newVersionData.version || {}, 
            
            // Opcionalmente recalculados
            accumulated: newVersionData.accumulated || prevData.accumulated || {},
            snapshot: newVersionData.snapshot || {},
            derived: newVersionData.derived || {}
        };

        // 4. Create new version
        const newVersionRes = await client.query(`
            INSERT INTO ips_versions (case_id, version_number, form_data, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [caseId, nextVersionNumber, JSON.stringify(newData), userId]);

        const newVersion = newVersionRes.rows[0];

        // 5. Log History
        await client.query(`
            INSERT INTO ips_history (version_id, user_id, action, details)
            VALUES ($1, $2, 'CREATE_VERSION', 'Versión heredada creada a partir de v' || $3)
        `, [newVersion.id, userId, prevVersion.version_number]);

        await client.query('COMMIT');
        return newVersion;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

export const deleteCase = async (caseId) => {
    // La eliminación en cascada elimina ips_versions e ips_history
    const result = await pool.query(`
        DELETE FROM ips_cases WHERE id = $1 RETURNING *
    `, [caseId]);
    return result.rows[0];
};
