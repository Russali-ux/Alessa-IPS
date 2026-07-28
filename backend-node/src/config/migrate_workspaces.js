import { query } from './database.js';
import { clientesConfig } from '../../../src/config/clientesConfig.js';

const migrate = async () => {
    try {
        console.log('Migrating workspaces metadata...');
        
        for (const cliente of clientesConfig) {
            const code = cliente.id; // C001, C002, etc.
            
            // fetch current workspace
            const { rows } = await query('SELECT id, metadata FROM workspaces WHERE code = $1', [code]);
            if (rows.length === 0) {
                console.log(`Workspace ${code} not found in DB, skipping...`);
                continue;
            }
            
            const workspace = rows[0];
            let currentMetadata = workspace.metadata || {};
            
            // Merge metadata
            const updatedMetadata = {
                ...currentMetadata,
                fv: {
                    ...currentMetadata.fv,
                    ...cliente.fv
                },
                plantillas: {
                    ...currentMetadata.plantillas,
                    ...cliente.plantillas
                },
                catalogos: {
                    ...currentMetadata.catalogos,
                    ...cliente.catalogos
                }
            };
            
            await query('UPDATE workspaces SET metadata = $1 WHERE id = $2', [updatedMetadata, workspace.id]);
            console.log(`Successfully updated workspace ${code}.`);
        }
        
        console.log('Migration completed.');
        process.exit(0);
    } catch (err) {
        console.error('Error migrating metadata:', err);
        process.exit(1);
    }
};

migrate();
