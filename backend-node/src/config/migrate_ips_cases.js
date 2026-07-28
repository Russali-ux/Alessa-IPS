import pool from './database.js';

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('Iniciando migración de IPS Cases (Expedientes)...');

        // Tabla de Expedientes (IPS_CASE)
        await client.query(`
            CREATE TABLE IF NOT EXISTS ips_cases (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID NOT NULL,
                product_id UUID,
                schedule_id UUID,
                status VARCHAR(50) DEFAULT 'No iniciado',
                assigned_to UUID,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                submitted_at TIMESTAMP WITH TIME ZONE,
                approved_at TIMESTAMP WITH TIME ZONE
            );
        `);
        console.log('Tabla ips_cases creada o ya existía.');

        // Tabla de Versiones (IPS_VERSION)
        await client.query(`
            CREATE TABLE IF NOT EXISTS ips_versions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                case_id UUID NOT NULL REFERENCES ips_cases(id) ON DELETE CASCADE,
                version_number INT NOT NULL,
                status VARCHAR(50) DEFAULT 'Borrador',
                form_data JSONB DEFAULT '{}',
                created_by UUID,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabla ips_versions creada o ya existía.');

        // Tabla de Historial (Auditoría)
        await client.query(`
            CREATE TABLE IF NOT EXISTS ips_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                version_id UUID NOT NULL REFERENCES ips_versions(id) ON DELETE CASCADE,
                user_id UUID NOT NULL,
                action VARCHAR(100) NOT NULL,
                details TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Tabla ips_history creada o ya existía.');

        await client.query('COMMIT');
        console.log('Migración completada exitosamente.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error durante la migración:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
