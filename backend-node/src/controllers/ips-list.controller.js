import { query } from '../config/database.js';

export const getIpsList = async (req, res) => {
    try {
        const workspaceId = req.user.workspace_id;
        if (!workspaceId) {
            return res.status(400).json({ message: 'Workspace ID no especificado.' });
        }

        const { rows } = await query(`
            SELECT 
                numero, rs, denominacion, producto, fabricante, 
                edad_producto AS "edadProducto", 
                fecha_nacimiento_local AS "fechaNacimientoLocal", 
                fecha_inicio_datos AS "fechaInicioDatos", 
                fcd, 
                fecha_limite AS "fechaLimite", 
                estado, 
                anios_periodo AS "aniosPeriodo", 
                comentarios, 
                ips_basal AS "ipsBasal", 
                asignado, 
                mes, 
                fecha_entrega AS "fechaEntrega"
            FROM ips_list_records
            WHERE workspace_id = $1
            ORDER BY created_at ASC
        `, [workspaceId]);

        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo listado IPS:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const importIpsList = async (req, res) => {
    try {
        const workspaceId = req.user.workspace_id;
        if (!workspaceId) {
            return res.status(400).json({ message: 'Workspace ID no especificado.' });
        }

        const data = req.body;
        if (!Array.isArray(data)) {
            return res.status(400).json({ message: 'El cuerpo de la petición debe ser un arreglo.' });
        }

        // Parse date helper
        const parseDate = (val) => {
            if (!val) return null;
            
            // Si es un objeto Date válido (poco probable pero por si acaso)
            if (val instanceof Date && !isNaN(val.getTime())) return val;

            let d = new Date(val);
            if (!isNaN(d.getTime())) return d;

            // Si falló, intentar parsear dd-mm-yyyy o dd/mm/yyyy
            const strVal = String(val).trim();
            const parts = strVal.split(/[-/]/);
            if (parts.length === 3) {
                // Asumimos formato dd-mm-yyyy
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Mes en JS es 0-index
                const year = parseInt(parts[2], 10);
                
                // Si el año tiene 2 dígitos (ej. 14 -> 2014)
                const fullYear = year < 100 ? year + 2000 : year;
                
                d = new Date(fullYear, month, day);
                if (!isNaN(d.getTime())) return d;
            }

            return null;
        };

        // Borrar anteriores
        await query(`DELETE FROM ips_list_records WHERE workspace_id = $1`, [workspaceId]);

        // Insertar nuevos
        for (const row of data) {
            await query(`
                INSERT INTO ips_list_records (
                    workspace_id, numero, rs, denominacion, producto, fabricante, 
                    edad_producto, fecha_nacimiento_local, fecha_inicio_datos, fcd, 
                    fecha_limite, estado, anios_periodo, comentarios, ips_basal, 
                    asignado, mes, fecha_entrega
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
                )
            `, [
                workspaceId,
                row.numero || null,
                row.rs || null,
                row.denominacion || null,
                row.producto || null,
                row.fabricante || null,
                row.edadProducto || null,
                parseDate(row.fechaNacimientoLocal),
                parseDate(row.fechaInicioDatos),
                parseDate(row.fcd),
                parseDate(row.fechaLimite),
                row.estado || null,
                row.aniosPeriodo || null,
                row.comentarios || null,
                row.ipsBasal || null,
                row.asignado || null,
                row.mes || null,
                row.fechaEntrega || null
            ]);
        }

        res.json({ success: true, count: data.length });
    } catch (error) {
        console.error('Error importando listado IPS:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
