import zoteroService from '../services/zotero.service.js';
import integrationRepository from '../repositories/integration.repository.js';

// In-memory store for request secrets. In a multi-node production app, use Redis or a temp DB table.
const oauthSecretsMap = new Map();

export const login = async (req, res) => {
  try {
    const { oauth_token, oauth_token_secret, redirectUrl } = await zoteroService.getOAuthRequestToken();
    
    // Store the secret temporarily to use in the callback
    oauthSecretsMap.set(oauth_token, oauth_token_secret);
    
    // Clean up after 10 mins if abandoned
    setTimeout(() => oauthSecretsMap.delete(oauth_token), 10 * 60 * 1000);

    res.json({ redirectUrl });
  } catch (error) {
    res.status(500).json({ message: 'Error initiating Zotero login', error: error.message });
  }
};

export const callback = async (req, res) => {
  try {
    // Note: this route needs authenticateToken so we know WHICH user is connecting Zotero.
    // However, the frontend redirect from Zotero won't have the Bearer token in the callback redirect URL easily if it's a full page redirect.
    // BUT since we decided to use a dedicated frontend callback route (http://localhost:5173/settings/integrations/zotero/callback),
    // the Zotero OAuth redirects to the FRONTEND, and then the Frontend makes an AJAX call to this backend endpoint WITH the Bearer token.
    // This is perfect! The frontend sends `oauth_token` and `oauth_verifier` in the body/query.
    const { oauth_token, oauth_verifier } = req.query;
    const userId = req.user.id; // From authenticateToken middleware
    
    const oauth_token_secret = oauthSecretsMap.get(oauth_token);
    if (!oauth_token_secret) {
      return res.status(400).json({ message: 'Session expirada o token inválido. Por favor, intenta conectar nuevamente.' });
    }

    const { accessToken, userId: providerUserId, username: providerUsername } = await zoteroService.getOAuthAccessToken(oauth_token, oauth_token_secret, oauth_verifier);
    
    // Remove from map
    oauthSecretsMap.delete(oauth_token);

    // Save in database
    const credentials = { apiKey: accessToken };
    await integrationRepository.upsertIntegration(userId, 'zotero', providerUserId, providerUsername, credentials);

    res.json({ message: 'Zotero conectado exitosamente', username: providerUsername });
  } catch (error) {
    res.status(500).json({ message: 'Error en callback de Zotero', error: error.message });
  }
};

export const status = async (req, res) => {
  try {
    const userId = req.user.id;
    const integration = await integrationRepository.getIntegration(userId, 'zotero');
    
    if (integration) {
      res.json({
        connected: true,
        username: integration.provider_username,
        lastSync: integration.updated_at
      });
    } else {
      res.json({ connected: false });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error checking Zotero status', error: error.message });
  }
};

export const disconnect = async (req, res) => {
  try {
    const userId = req.user.id;
    await integrationRepository.deleteIntegration(userId, 'zotero');
    res.json({ message: 'Zotero desconectado' });
  } catch (error) {
    res.status(500).json({ message: 'Error disconnecting Zotero', error: error.message });
  }
};

export const getCollections = async (req, res) => {
  try {
    const userId = req.user.id;
    const integration = await integrationRepository.getIntegration(userId, 'zotero');
    if (!integration) return res.status(401).json({ message: 'Zotero no está conectado' });

    const { apiKey } = integration.credentials;
    const collections = await zoteroService.getCollections(integration.provider_user_id, apiKey);
    
    res.json(collections);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching collections', error: error.message });
  }
};

export const getCollectionItems = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionKey } = req.params;
    
    const integration = await integrationRepository.getIntegration(userId, 'zotero');
    if (!integration) return res.status(401).json({ message: 'Zotero no está conectado' });

    const { apiKey } = integration.credentials;
    const items = await zoteroService.getCollectionItems(integration.provider_user_id, apiKey, collectionKey);
    
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
};

export const importItems = async (req, res) => {
  try {
    const userId = req.user.id;
    const { selectedItems } = req.body; // Array of item keys
    
    if (!selectedItems || !selectedItems.length) {
      return res.status(400).json({ message: 'No items selected' });
    }

    const integration = await integrationRepository.getIntegration(userId, 'zotero');
    if (!integration) return res.status(401).json({ message: 'Zotero no está conectado' });

    const { apiKey } = integration.credentials;
    const fullItems = await zoteroService.getItemsFullMetadata(integration.provider_user_id, apiKey, selectedItems);
    
    // Return full items to the frontend so it can inject them into the IPS form JSON
    res.json(fullItems);
  } catch (error) {
    res.status(500).json({ message: 'Error importing items', error: error.message });
  }
};
