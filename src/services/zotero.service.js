import { API_URL, fetchWithAuth, handleResponse } from './api';

export const zoteroService = {
  getLoginUrl: async () => {
    return fetchWithAuth(`${API_URL}/integrations/zotero/login`).then(handleResponse);
  },

  handleCallback: async (oauth_token, oauth_verifier) => {
    return fetchWithAuth(`${API_URL}/integrations/zotero/callback?oauth_token=${oauth_token}&oauth_verifier=${oauth_verifier}`).then(handleResponse);
  },

  getStatus: async () => {
    return fetchWithAuth(`${API_URL}/integrations/zotero/status`).then(handleResponse);
  },

  disconnect: async () => {
    return fetchWithAuth(`${API_URL}/integrations/zotero/disconnect`, {
      method: 'POST'
    }).then(handleResponse);
  },

  getCollections: async () => {
    return fetchWithAuth(`${API_URL}/integrations/zotero/collections`).then(handleResponse);
  },

  getCollectionItems: async (collectionKey) => {
    return fetchWithAuth(`${API_URL}/integrations/zotero/collections/${collectionKey}/items`).then(handleResponse);
  },

  importItems: async (selectedItems) => {
    return fetchWithAuth(`${API_URL}/integrations/zotero/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedItems })
    }).then(handleResponse);
  }
};
