import { query } from './database.js';

const addMetadataColumn = async () => {
  try {
    console.log('Adding metadata JSONB column to workspaces table...');
    await query(`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`);
    console.log('Successfully added metadata column.');
    process.exit(0);
  } catch (error) {
    console.error('Error adding column:', error);
    process.exit(1);
  }
};

addMetadataColumn();
