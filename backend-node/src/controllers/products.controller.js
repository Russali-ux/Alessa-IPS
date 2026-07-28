import { query } from '../config/database.js';

// Devuelve el catálogo de productos de un workspace, buscado por su 'code' (ej. C002).
// Se usa 'code' (no workspace_id) porque el formulario de NuevoIPS todavía selecciona
// el cliente desde clientesConfig.js, cuyo 'id' coincide con el 'code' del workspace.
export const getProductsByCode = async (req, res) => {
    try {
        const { code } = req.params;

        const { rows: wsRows } = await query(`SELECT id FROM workspaces WHERE code = $1 AND deleted_at IS NULL`, [code]);
        if (wsRows.length === 0) {
            return res.json([]); // Cliente sin workspace asociado aún: catálogo vacío, no error
        }
        const workspaceId = wsRows[0].id;

        const { rows } = await query(`
            SELECT rs, marca, dci, dosis, formafarmaceutica, fabricante,
                   paisdefabricacion, faprobacion, fvencimiento, estado, ipsdenominacion
            FROM client_products
            WHERE workspace_id = $1
            ORDER BY created_at ASC
        `, [workspaceId]);

        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo catálogo de productos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Reemplaza por completo el catálogo de productos de un workspace (dado su code).
export const importProducts = async (req, res) => {
    try {
        const { code } = req.params;
        const data = req.body;

        if (!Array.isArray(data)) {
            return res.status(400).json({ message: 'El cuerpo de la petición debe ser un arreglo.' });
        }

        const { rows: wsRows } = await query(`SELECT id FROM workspaces WHERE code = $1 AND deleted_at IS NULL`, [code]);
        if (wsRows.length === 0) {
            return res.status(404).json({ message: `No existe un workspace con code '${code}'.` });
        }
        const workspaceId = wsRows[0].id;

        await query(`DELETE FROM client_products WHERE workspace_id = $1`, [workspaceId]);

        for (const row of data) {
            await query(`
                INSERT INTO client_products (
                    workspace_id, rs, marca, dci, dosis, formafarmaceutica, fabricante,
                    paisdefabricacion, faprobacion, fvencimiento, estado, ipsdenominacion
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
                workspaceId,
                row.rs || null,
                row.marca || null,
                row.dci || null,
                row.dosis || null,
                row.formafarmaceutica || null,
                row.fabricante || null,
                row.paisdefabricacion || null,
                row.faprobacion || null,
                row.fvencimiento || null,
                row.estado || null,
                row.ipsdenominacion || null,
            ]);
        }

        res.json({ success: true, count: data.length });
    } catch (error) {
        console.error('Error importando catálogo de productos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
