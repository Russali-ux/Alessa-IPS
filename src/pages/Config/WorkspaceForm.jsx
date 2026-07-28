import { useState, useEffect, useRef, useMemo } from "react";
import { usersApi, workspacesApi, workspaceMembersApi, rolesApi, API_URL } from "../../services/api";
import { Button } from "../../Components/ui/button";
import { Input } from "../../Components/ui/input";
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from "lucide-react";

export default function WorkspaceForm({ workspace, onBack }) {
  const isEditing = !!workspace;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: workspace?.code || "",
    name: workspace?.name || "",
    company_name: workspace?.company_name || "",
    workspace_type: workspace?.workspace_type || "CLIENT",
    status: workspace?.status || "ACTIVE",
    fv_area: workspace?.metadata?.fv?.area || "",
    fv_direccion: workspace?.metadata?.fv?.direccion || "",
  });

  const [files, setFiles] = useState({
    templateWord: null,
    inventoryExcel: null
  });

  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [usersData, rolesData] = await Promise.all([
          usersApi.getAll(),
          rolesApi.getAll()
        ]);
        setAllUsers(usersData);
        setAllRoles(rolesData);
      } catch (e) {
        console.error("Error loading dependencies", e);
      }
    };
    loadDependencies();

    if (isEditing) {
      loadMembers();
    }
  }, [isEditing]);

  const loadMembers = async () => {
    try {
      const data = await workspaceMembersApi.getAll(workspace.id);
      setMembers(data);
    } catch (e) {
      console.error("Error loading members", e);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? 'ACTIVE' : 'INACTIVE') : value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
    } else {
      setFiles(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      if (files.templateWord) submitData.append('templateWord', files.templateWord);
      if (files.inventoryExcel) submitData.append('inventoryExcel', files.inventoryExcel);

      if (isEditing) {
        await fetch(`${API_URL}/workspaces/${workspace.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: submitData
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Error actualizando workspace");
          }
          return res.json();
        });
      } else {
        await fetch(`${API_URL}/workspaces`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: submitData
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Error creando workspace");
          }
          return res.json();
        });
      }
      onBack();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberUserId || !newMemberRole) return;
    try {
      await workspaceMembersApi.add(workspace.id, newMemberUserId, newMemberRole);
      setNewMemberUserId("");
      setNewMemberRole("");
      loadMembers();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleUpdateRole = async (userId, newRoleCode) => {
    try {
      await workspaceMembersApi.updateRole(workspace.id, userId, newRoleCode);
      loadMembers();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("¿Seguro que deseas remover este usuario del Workspace?")) return;
    try {
      await workspaceMembersApi.remove(workspace.id, userId);
      loadMembers();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleImpersonate = () => {
    localStorage.setItem('currentWorkspaceId', workspace.id);
    window.location.href = '/app';
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft size={20}/></Button>
          <h2 className="text-xl font-bold">{isEditing ? 'Configurar Workspace' : 'Nuevo Workspace'}</h2>
        </div>
        {isEditing && (
          <Button onClick={handleImpersonate} className="bg-primary-600 hover:bg-primary-700 text-white">
            Entrar como Administrador →
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FORMULARIO WORKSPACE */}
        <div>
          <h3 className="text-lg font-bold mb-4">Datos del Workspace</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Código</label>
                <Input 
                  name="code" 
                  value={isEditing ? formData.code : (formData.code || "Autogenerado")} 
                  onChange={handleChange} 
                  disabled={!isEditing} 
                  className={!isEditing ? "bg-slate-100 text-slate-500" : ""}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Nombre del Workspace *</label>
                <Input required name="name" value={formData.name} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Empresa Asociada</label>
                <Input name="company_name" value={formData.company_name} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Tipo</label>
                <select 
                  name="workspace_type" 
                  value={formData.workspace_type} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="CLIENT">Cliente</option>
                  <option value="LABORATORIO">Laboratorio</option>
                  <option value="INTERNAL">Interno</option>
                  <option value="PARTNER">Partner</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold">Área de Farmacovigilancia</label>
                <Input name="fv_area" value={formData.fv_area} onChange={handleChange} placeholder="Ej. Área de Farmacovigilancia" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Dirección FV</label>
                <Input name="fv_direccion" value={formData.fv_direccion} onChange={handleChange} placeholder="Ej. Av. Principal 123" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold">Plantilla Word (IPS)</label>
                <Input type="file" name="templateWord" accept=".doc,.docx" onChange={handleFileChange} />
                {isEditing && workspace?.metadata?.plantillas?.ips && (
                  <p className="text-xs text-slate-500">Actual: {workspace.metadata.plantillas.ips}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Listado de Productos (Excel)</label>
                <Input type="file" name="inventoryExcel" accept=".xls,.xlsx" onChange={handleFileChange} />
                {isEditing && workspace?.metadata?.catalogos?.productosFile && (
                  <p className="text-xs text-slate-500">Actual: {workspace.metadata.catalogos.productosFile}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
                <input 
                  type="checkbox" 
                  name="status" 
                  checked={formData.status === 'ACTIVE'} 
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                Workspace Activo
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onBack}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />}
                Guardar Workspace
              </Button>
            </div>
          </form>
        </div>

        {/* PESTAÑAS DERECHA (Solo si está editando) */}
        {isEditing && (
          <div className="border-t lg:border-t-0 lg:border-l pl-0 lg:pl-8 pt-6 lg:pt-0 flex flex-col h-full">
            
            {/* Tabs Header */}
            <div className="flex border-b mb-6">
              <button 
                type="button"
                className="px-4 py-2 border-b-2 font-bold text-sm border-primary-600 text-primary-700"
              >
                Usuarios del Workspace
              </button>
              <button 
                type="button"
                className="px-4 py-2 font-semibold text-sm text-slate-500 hover:text-slate-700"
                onClick={() => alert("La configuración avanzada de roles (RBAC) estará disponible próximamente.")}
              >
                Roles y Permisos
              </button>
            </div>

            {/* TAB USUARIOS */}
            <div>
              {/* AGREGAR MIEMBRO */}
              <div className="bg-slate-50 p-4 rounded-xl border mb-6 space-y-3">
                <h4 className="text-sm font-semibold">Asignar Usuario</h4>
                <div className="flex gap-2">
                  <select 
                    value={newMemberUserId} 
                    onChange={(e) => setNewMemberUserId(e.target.value)}
                    className="flex-1 text-sm px-3 py-2 border rounded-md"
                  >
                    <option value="">-- Seleccionar Usuario --</option>
                    {allUsers.filter(u => !members.some(m => m.id === u.id)).map(u => (
                      <option key={u.id} value={u.id}>{u.nombres} {u.apellidos} ({u.email})</option>
                    ))}
                  </select>
                  <select 
                    value={newMemberRole} 
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-32 text-sm px-3 py-2 border rounded-md"
                  >
                    <option value="">-- Rol --</option>
                    {allRoles.map(r => (
                      <option key={r.code} value={r.code}>{r.name}</option>
                    ))}
                  </select>
                  <Button type="button" onClick={handleAddMember} disabled={!newMemberUserId || !newMemberRole}>
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              {/* LISTA DE MIEMBROS */}
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-xs uppercase font-bold text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-4 py-6 text-center text-slate-500 text-sm">
                          No hay miembros asignados a este Workspace.
                        </td>
                      </tr>
                    ) : (
                      members.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{m.nombres} {m.apellidos}</p>
                            <p className="text-xs text-slate-500">{m.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <select 
                              value={m.role_code} 
                              onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                              className="text-xs px-2 py-1 border rounded"
                            >
                              {allRoles.map(r => (
                                <option key={r.code} value={r.code}>{r.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveMember(m.id)}>
                              <Trash2 size={16} />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
