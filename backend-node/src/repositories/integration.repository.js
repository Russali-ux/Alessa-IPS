import { query } from '../config/database.js';

class IntegrationRepository {
  async upsertIntegration(userId, provider, providerUserId, providerUsername, credentials) {
    const text = `
      INSERT INTO user_integrations (user_id, provider, provider_user_id, provider_username, credentials, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, provider) 
      DO UPDATE SET 
        provider_user_id = EXCLUDED.provider_user_id,
        provider_username = EXCLUDED.provider_username,
        credentials = EXCLUDED.credentials,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const values = [userId, provider, providerUserId, providerUsername, JSON.stringify(credentials)];
    const res = await query(text, values);
    return res.rows[0];
  }

  async getIntegration(userId, provider) {
    const text = 'SELECT * FROM user_integrations WHERE user_id = $1 AND provider = $2';
    const values = [userId, provider];
    const res = await query(text, values);
    return res.rows[0];
  }

  async deleteIntegration(userId, provider) {
    const text = 'DELETE FROM user_integrations WHERE user_id = $1 AND provider = $2 RETURNING *';
    const values = [userId, provider];
    const res = await query(text, values);
    return res.rows[0];
  }
}

export default new IntegrationRepository();
