import { query } from './database.js';
import { clientesConfig } from '../../../src/config/clientesConfig.js';

const seedClients = async () => {
  try {
    console.log(`Seeder: Encontrados ${clientesConfig.length} clientes en el archivo de configuración.`);
    
    let inserted = 0;
    for (const client of clientesConfig) {
      const sql = `
        INSERT INTO clients (codigo, razon_social, activo, owner, area_farmacovigilancia, direccion)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (codigo) DO UPDATE 
        SET razon_social = EXCLUDED.razon_social,
            activo = EXCLUDED.activo,
            owner = EXCLUDED.owner,
            area_farmacovigilancia = EXCLUDED.area_farmacovigilancia,
            direccion = EXCLUDED.direccion
        RETURNING id;
      `;
      
      const values = [
        client.id, // codigo
        client.empresa.razonSocial,
        client.activo,
        client.owner || 'No especificado', // owner can be missing
        client.fv?.area || '',
        client.fv?.direccion || ''
      ];
      
      await query(sql, values);
      inserted++;
    }
    
    console.log(`¡Éxito! ${inserted} clientes han sido insertados o actualizados en la base de datos.`);
    process.exit(0);
  } catch (error) {
    console.error('Error poblando la base de datos con clientes:', error);
    process.exit(1);
  }
};

seedClients();
