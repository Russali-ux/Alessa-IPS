export const API_URL = 'http://localhost:3000/api';

export const handleResponse = async (response) => {
  if (response.status === 401) {
    // Si estamos en una página de edición/creación de IPS, respaldamos el avance
    const currentPath = window.location.pathname;
    if (currentPath.includes('/app/ips/edit') || currentPath.includes('/app/ips/new')) {
      const keysToBackup = [
        "seccionA_formData", "seccionB_formData", "seccionC_formData", 
        "seccionD_formData", "seccionE_analyses", "seccionG_vigiaccessData"
      ];
      const backupData = { path: currentPath, data: {} };
      let hasData = false;
      keysToBackup.forEach(key => {
        const val = sessionStorage.getItem(key);
        if (val) {
          backupData.data[key] = val;
          hasData = true;
        }
      });
      if (hasData) {
        localStorage.setItem('alessa_ips_recovery_draft', JSON.stringify(backupData));
      }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('workspaces');
    localStorage.removeItem('currentWorkspaceId');
    window.location.href = '/'; // Redirect to login
  }
  
  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({ message: 'Acceso Denegado' }));
    // Dispatch a custom event to show a floating message in React
    window.dispatchEvent(new CustomEvent('workspace-access-denied', { 
        detail: errorData.message || 'No tienes acceso a este recurso en el Workspace actual.'
    }));
    throw new Error(errorData.message);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(error.message || 'Error occurred');
  }
  return response.json();
};

export const fetchWithAuth = (url, options = {}) => {
  const token = localStorage.getItem('token');
  const currentWorkspaceId = localStorage.getItem('currentWorkspaceId');
  
  // Si no se proveyó x-workspace-id en options.headers, usar el de localStorage
  const finalWorkspaceId = (options.headers && options.headers['x-workspace-id']) 
                            ? options.headers['x-workspace-id'] 
                            : currentWorkspaceId;
                            
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(finalWorkspaceId ? { 'x-workspace-id': finalWorkspaceId } : {})
  };
  return fetch(url, { ...options, headers });
};

export const authApi = {
  login: (credentials) => fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  }).then(handleResponse),
  me: () => fetchWithAuth(`${API_URL}/auth/me`).then(handleResponse),
};

export const usersApi = {
  getAll: () => fetchWithAuth(`${API_URL}/users`).then(handleResponse),
  getById: (id) => fetchWithAuth(`${API_URL}/users/${id}`).then(handleResponse),
  create: (data) => fetchWithAuth(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
  update: (id, data) => fetchWithAuth(`${API_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
  updateStatus: (id, is_active) => fetchWithAuth(`${API_URL}/users/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active })
  }).then(handleResponse),
  delete: (id) => fetchWithAuth(`${API_URL}/users/${id}`, { method: 'DELETE' }).then(handleResponse),
  getWorkspaces: (id) => fetchWithAuth(`${API_URL}/users/${id}/workspaces`).then(handleResponse),
};

export const rolesApi = {
  getAll: () => fetchWithAuth(`${API_URL}/roles`).then(handleResponse),
};

export const workspacesApi = {
  getAll: () => fetchWithAuth(`${API_URL}/workspaces/all`).then(handleResponse),
  getMyAdmin: () => fetchWithAuth(`${API_URL}/workspaces/my-admin`).then(handleResponse),
  create: (data) => fetchWithAuth(`${API_URL}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
  update: (id, data) => fetchWithAuth(`${API_URL}/workspaces/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
  getCurrent: () => fetchWithAuth(`${API_URL}/workspaces/current`).then(handleResponse),
  updateCurrent: (data) => fetchWithAuth(`${API_URL}/workspaces/current`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
};

export const workspaceMembersApi = {
  getAll: (workspaceId) => fetchWithAuth(`${API_URL}/workspace_members`, {
    headers: workspaceId ? { 'x-workspace-id': workspaceId } : {}
  }).then(handleResponse),
  add: (workspaceId, user_id, role_code) => fetchWithAuth(`${API_URL}/workspace_members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}) },
    body: JSON.stringify({ user_id, role_code })
  }).then(handleResponse),
  updateRole: (workspaceId, userId, role_code) => fetchWithAuth(`${API_URL}/workspace_members/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}) },
    body: JSON.stringify({ role_code })
  }).then(handleResponse),
  remove: (workspaceId, userId) => fetchWithAuth(`${API_URL}/workspace_members/${userId}`, { 
    method: 'DELETE',
    headers: workspaceId ? { 'x-workspace-id': workspaceId } : {}
  }).then(handleResponse),
};
