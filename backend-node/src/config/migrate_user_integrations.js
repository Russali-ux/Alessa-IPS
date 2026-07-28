import pool from './database.js';

const migrateUserIntegrations = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Creating user_integrations table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        provider_user_id VARCHAR(255),
        provider_username VARCHAR(255),
        credentials JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, provider)
      )
    `);
    
    await client.query('COMMIT');
    console.log('Migration successful: user_integrations table created.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
};

migrateUserIntegrations();
