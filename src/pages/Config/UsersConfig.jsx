import { useState, useEffect } from "react";
import DataTable from "../../Components/DataTable";
import { usersApi, rolesApi } from "../../services/api";
import { Button } from "../../Components/ui/button";
import UserForm from "./UserForm";
import UserClientAssignment from "./UserClientAssignment";
import { Loader2 } from "lucide-react";

export default function UsersConfig({ isMasterAdmin }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [showAssign, setShowAssign] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([usersApi.getAll(), rolesApi.getAll()]);
      setUsers(u);
      setRoles(r);
    } catch (error) {
      console.error("Error loading users/roles", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedUser(null);
    setShowForm(true);
  };

  const handleCreated = (newUser) => {
    setShowForm(false);
    setSelectedUser(newUser);
    setShowAssign(true);
    loadData();
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowForm(true);
  };

  const handleToggleStatus = async (user) => {
    try {
      await usersApi.updateStatus(user.id, !user.is_active);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (user) => {
    if(confirm("¿Estás seguro de eliminar este usuario?")) {
      try {
        await usersApi.delete(user.id);
        loadData();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const columns = [
    { key: "nombres", label: "Nombres", render: (_, row) => `${row.nombres} ${row.apellidos || ''}` },
    { key: "email", label: "Email" },
    { key: "telefono", label: "Teléfono" },
    { key: "org_name", label: "Organización", render: (val) => val || 'N/A' },
    { key: "roles", label: "Roles", render: (val) => val ? val.map(r => r.name).join(", ") : "N/A" },
    { key: "is_active", label: "Estado", render: (val) => (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${val ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
        {val ? 'ACTIVO' : 'INACTIVO'}
      </span>
    ) }
  ];

  const actions = [];
  if (isMasterAdmin) {
    actions.push({ label: "Editar", onClick: handleEdit });
    actions.push({ label: "Asignar Workspaces", onClick: (row) => { setSelectedUser(row); setShowAssign(true); } });
    actions.push({ label: "Cambiar Estado", onClick: handleToggleStatus });
    actions.push({ label: "Eliminar", onClick: handleDelete, className: "text-red-600" });
  } else {
    actions.push({ label: "Gestionar Accesos", onClick: (row) => { setSelectedUser(row); setShowAssign(true); } });
    // Workspace Admins cannot edit basic details, change global status or perform global delete.
  }

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-primary-600" /></div>;

  if (showForm) {
    return <UserForm user={selectedUser} roles={roles} isMasterAdmin={isMasterAdmin} onBack={() => { setShowForm(false); loadData(); }} onCreated={handleCreated} />;
  }

  if (showAssign && selectedUser) {
    return <UserClientAssignment user={selectedUser} isMasterAdmin={isMasterAdmin} onBack={() => setShowAssign(false)} />;
  }

  return (
    <div className="space-y-4">
      <DataTable 
        title="Gestión de Usuarios" 
        columns={columns} 
        data={users} 
        actions={actions}
        showAddButton={true}
        onAdd={handleAdd}
      />
    </div>
  );
}
