import fs from 'fs';
import path from 'path';
import { query } from './database.js';

const migrateIPSList = async () => {
    try {
        console.log('Creando tabla ips_list_records...');
        const schema = `
            CREATE TABLE IF NOT EXISTS ips_list_records (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                numero VARCHAR(50),
                rs VARCHAR(100),
                denominacion VARCHAR(255),
                producto VARCHAR(255),
                fabricante VARCHAR(255),
                edad_producto VARCHAR(50),
                fecha_nacimiento_local TIMESTAMP,
                fecha_inicio_datos TIMESTAMP,
                fcd TIMESTAMP,
                fecha_limite TIMESTAMP,
                estado VARCHAR(50),
                anios_periodo VARCHAR(50),
                comentarios TEXT,
                ips_basal VARCHAR(100),
                asignado VARCHAR(100),
                mes VARCHAR(50),
                fecha_entrega VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `;
        await query(schema);
        
        console.log('Buscando el workspace SEVEN PHARMA S.A.C....');
        const { rows: wsRows } = await query(`SELECT id FROM workspaces WHERE name ILIKE '%SEVEN PHARMA%' LIMIT 1`);
        
        if (wsRows.length === 0) {
            console.log('No se encontró el workspace SEVEN PHARMA. Saltando la inserción de datos históricos.');
            process.exit(0);
        }
        
        const workspaceId = wsRows[0].id;
        console.log(`Workspace SEVEN PHARMA encontrado con ID: ${workspaceId}`);
        
        // Leer el JSON
        const jsonPath = path.resolve(process.cwd(), '../src/data/listado_ips.json');
        if (!fs.existsSync(jsonPath)) {
            console.log('No se encontró listado_ips.json en ' + jsonPath);
            process.exit(0);
        }
        
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        
        if (jsonData.length > 0) {
            console.log(`Encontrados ${jsonData.length} registros. Insertando en la BD...`);
            
            // Delete old records for this workspace just in case we run this multiple times
            await query(`DELETE FROM ips_list_records WHERE workspace_id = $1`, [workspaceId]);
            
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
            
            for (const row of jsonData) {
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
            console.log('Registros migrados exitosamente.');
        } else {
            console.log('El archivo JSON está vacío.');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error migrando listado IPS:', error);
        process.exit(1);
    }
};

migrateIPSList();
