import axios from 'axios';
import { OAuth } from 'oauth';

const ZOTERO_API_BASE = 'https://api.zotero.org';
const ZOTERO_CLIENT_KEY = process.env.ZOTERO_CLIENT_KEY || '2c52945c0094a5097f91'; // Fallbacks for dev
const ZOTERO_CLIENT_SECRET = process.env.ZOTERO_CLIENT_SECRET || 'e39907460cdf2c11c886';
const ZOTERO_CALLBACK_URL = process.env.ZOTERO_CALLBACK_URL || 'http://localhost:5173/settings/integrations/zotero/callback';

const oauth = new OAuth(
  'https://www.zotero.org/oauth/request',
  'https://www.zotero.org/oauth/access',
  ZOTERO_CLIENT_KEY,
  ZOTERO_CLIENT_SECRET,
  '1.0A',
  ZOTERO_CALLBACK_URL,
  'HMAC-SHA1'
);

class ZoteroService {
  
  // 1. Get Request Token
  getOAuthRequestToken() {
    return new Promise((resolve, reject) => {
      oauth.getOAuthRequestToken((error, oauth_token, oauth_token_secret) => {
        if (error) {
          console.error("Zotero Request Token Error:", error);
          return reject(error);
        }
        const redirectUrl = `https://www.zotero.org/oauth/authorize?oauth_token=${oauth_token}`;
        resolve({ oauth_token, oauth_token_secret, redirectUrl });
      });
    });
  }

  // 2. Exchange for Access Token
  getOAuthAccessToken(oauth_token, oauth_token_secret, oauth_verifier) {
    return new Promise((resolve, reject) => {
      oauth.getOAuthAccessToken(oauth_token, oauth_token_secret, oauth_verifier, (error, oauth_access_token, oauth_access_token_secret, results) => {
        if (error) {
          console.error("Zotero Access Token Error:", error);
          return reject(error);
        }
        // Zotero sends userID and username in results
        resolve({
          accessToken: oauth_access_token_secret, // API Key is returned here for Zotero
          userId: results.userID,
          username: results.username
        });
      });
    });
  }

  // Fetch all pages using limit=100
  async _fetchAllPages(url, apiKey) {
    let allData = [];
    let start = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const sep = url.includes('?') ? '&' : '?';
      const pageUrl = `${url}${sep}limit=${limit}&start=${start}`;
      
      const response = await axios.get(pageUrl, {
        headers: { 'Zotero-API-Key': apiKey }
      });
      
      const data = response.data;
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = allData.concat(data);
        start += data.length;
        
        // Zotero API provides Total-Results header
        const totalResults = parseInt(response.headers['total-results'] || '0', 10);
        if (allData.length >= totalResults) {
          hasMore = false;
        }
      }
    }
    return allData;
  }

  // 3. Fetch Collections
  async getCollections(userId, apiKey) {
    try {
      const allCollections = await this._fetchAllPages(`${ZOTERO_API_BASE}/users/${userId}/collections`, apiKey);
      return this._buildCollectionTree(allCollections);
    } catch (error) {
      console.error("Error fetching Zotero collections:", error.response?.data || error.message);
      throw new Error("Could not fetch Zotero collections");
    }
  }

  // Helper to build tree from flat list
  _buildCollectionTree(collectionsFlat) {
    const collectionsMap = new Map();
    const roots = [];

    collectionsFlat.forEach(col => {
      collectionsMap.set(col.key, {
        key: col.key,
        name: col.data.name,
        parentCollection: col.data.parentCollection,
        children: []
      });
    });

    collectionsMap.forEach(col => {
      if (col.parentCollection === false || !col.parentCollection) {
        roots.push(col);
      } else {
        const parent = collectionsMap.get(col.parentCollection);
        if (parent) {
          parent.children.push(col);
        } else {
          roots.push(col); // Fallback if parent missing
        }
      }
    });

    // Sort recursively
    const sortCollections = (cols) => {
      cols.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      cols.forEach(col => {
        if (col.children && col.children.length > 0) {
          sortCollections(col.children);
        }
      });
    };
    
    sortCollections(roots);

    return roots;
  }

  // 4. Fetch Items in a collection (simplified list)
  async getCollectionItems(userId, apiKey, collectionKey) {
    try {
      const url = `${ZOTERO_API_BASE}/users/${userId}/collections/${collectionKey}/items?itemType=-attachment || note&format=json`;
      const allItems = await this._fetchAllPages(url, apiKey);
      
      return allItems.map(item => ({
        key: item.key,
        title: item.data.title || '[Sin Título]',
        creators: item.data.creators || [],
        date: item.data.date || '',
        itemType: item.data.itemType
      }));
    } catch (error) {
      console.error("Error fetching Zotero items:", error.response?.data || error.message);
      throw new Error("Could not fetch Zotero items");
    }
  }

  // 5. Fetch Full Items metadata (for import)
  async getItemsFullMetadata(userId, apiKey, itemKeys) {
    try {
      // Chunk requests if there are too many items (max 50 keys per request in Zotero)
      const chunkSize = 50;
      let allItems = [];
      
      for (let i = 0; i < itemKeys.length; i += chunkSize) {
        const chunk = itemKeys.slice(i, i + chunkSize);
        const keysStr = chunk.join(',');
        const response = await axios.get(`${ZOTERO_API_BASE}/users/${userId}/items?itemKey=${keysStr}&format=json`, {
          headers: {
            'Zotero-API-Key': apiKey
          }
        });
        allItems = allItems.concat(response.data);
      }
      
      return allItems;
    } catch (error) {
      console.error("Error fetching full metadata:", error.response?.data || error.message);
      throw new Error("Could not fetch full Zotero items metadata");
    }
  }
}

export default new ZoteroService();
