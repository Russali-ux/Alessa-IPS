import { useState, useEffect } from "react";
import { usersApi, workspacesApi, workspaceMembersApi, rolesApi, fetchWithAuth, API_URL } from "../../services/api";
import { Button } from "../../Components/ui/button";
import { ArrowLeft, Save, Loader2, Check, X } from "lucide-react";

export default function UserClientAssignment({ user, onBack, isMasterAdmin }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [userWorkspaces, setUserWorkspaces] = useState({}); // { workspaceId: { role_code: '...', ... } }
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mantenemos un estado de los cambios realizados localmente
  // para enviarlos de forma individual (add/updateRole/remove)
  const [pendingChanges, setPendingChanges] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchWorkspaces = isMasterAdmin ? workspacesApi.getAll() : fetchWithAuth(`${API_URL}/workspaces/my-admin`);
      
      const [allWorkspaces, uWorkspaces, allRoles] = await Promise.all([
        fetchWorkspaces,
        usersApi.getWorkspaces(user.id),
        rolesApi.getAll()
      ]);
      setWorkspaces(allWorkspaces);
      setRoles(allRoles);

      const uMap = {};
      uWorkspaces.forEach(w => {
        uMap[w.id] = w;
      });
      setUserWorkspaces(uMap);
    } catch (error) {
      console.error(error);
      alert("Error al cargar los datos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWorkspace = (workspaceId) => {
    setPendingChanges(prev => {
      const changes = { ...prev };
      const currentConfig = changes[workspaceId] || userWorkspaces[workspaceId];

      if (currentConfig && !currentConfig.isRemoved) {
        // Estaba activado -> lo removemos
        changes[workspaceId] = { ...currentConfig, isRemoved: true };
      } else if (currentConfig && currentConfig.isRemoved) {
        // Estaba removido localmente -> lo restauramos
        changes[workspaceId] = { ...currentConfig, isRemoved: false };
      } else {
        // Es nuevo
        changes[workspaceId] = { 
          isNew: true, 
          role_code: roles.length > 0 ? roles[0].code : '' 
        };
      }
      return changes;
    });
  };

  const handleRoleChange = (workspaceId, newRoleCode) => {
    setPendingChanges(prev => {
      const changes = { ...prev };
      const currentConfig = changes[workspaceId] || userWorkspaces[workspaceId];
      changes[workspaceId] = { ...currentConfig, role_code: newRoleCode };
      return changes;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Por cada cambio pendiente, hacemos la llamada a la API
      for (const [workspaceId, config] of Object.entries(pendingChanges)) {
        const isCurrentlyInUser = !!userWorkspaces[workspaceId];

        if (config.isRemoved && isCurrentlyInUser) {
          // Desasignar
          await workspaceMembersApi.remove(workspaceId, user.id);
        } else if (config.isNew && !config.isRemoved) {
          // Asignar nuevo
          await workspaceMembersApi.add(workspaceId, user.id, config.role_code);
        } else if (isCurrentlyInUser && !config.isRemoved && config.role_code !== userWorkspaces[workspaceId].role_code) {
          // Actualizar rol
          await workspaceMembersApi.updateRole(workspaceId, user.id, config.role_code);
        }
      }
      alert("Asignaciones guardadas correctamente");
      onBack();
    } catch (error) {
      alert("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary-600" /></div>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-4 mb-6 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft size={20}/></Button>
        <div>
          <h2 className="text-xl font-bold">Asignar Workspaces y Roles</h2>
          <p className="text-sm text-slate-500">Usuario: {user.nombres} {user.apellidos}</p>
        </div>
      </div>

      <div className="max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {workspaces.map(workspace => {
            const originalConfig = userWorkspaces[workspace.id];
            const pendingConfig = pendingChanges[workspace.id];
            const isAssigned = pendingConfig ? !pendingConfig.isRemoved : !!originalConfig;
            const roleCode = pendingConfig ? pendingConfig.role_code : (originalConfig ? originalConfig.role_code : '');

            return (
              <div 
                key={workspace.id} 
                className={`flex flex-col gap-3 p-4 rounded-xl border transition-colors ${isAssigned ? 'border-primary-500 bg-primary-50' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-start justify-between">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-primary-600 rounded"
                      checked={isAssigned}
                      onChange={() => handleToggleWorkspace(workspace.id)}
                    />
                    <div>
                      <p className="font-bold text-sm text-slate-800">{workspace.name}</p>
                      <p className="text-xs text-slate-500">{workspace.code} {workspace.company_name ? `• ${workspace.company_name}` : ''}</p>
                    </div>
                  </label>
                </div>
                
                {isAssigned && (
                  <div className="ml-8">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Rol en este Workspace:</p>
                    <select 
                      value={roleCode}
                      onChange={(e) => handleRoleChange(workspace.id, e.target.value)}
                      className="text-sm px-3 py-1.5 border rounded-lg bg-white w-full shadow-sm"
                    >
                      {roles.map(r => (
                        <option key={r.code} value={r.code}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {workspaces.length === 0 && (
          <div className="p-8 text-center border rounded-xl mb-6 text-slate-500">
            No hay Workspaces disponibles en el sistema.
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onBack}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />}
            Guardar Asignaciones
          </Button>
        </div>
      </div>
    </div>
  );
}
