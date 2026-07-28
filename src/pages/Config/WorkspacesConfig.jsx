import { useState, useEffect } from "react";
import DataTable from "../../Components/DataTable";
import WorkspaceForm from "./WorkspaceForm";
import { Loader2, FileText, FileSpreadsheet } from "lucide-react";
import { workspacesApi } from "../../services/api";

export default function WorkspacesConfig() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const isSuperAdmin = user?.email === 'contact@alessadatabase.cloud';
      
      const data = isSuperAdmin ? await workspacesApi.getAll() : await workspacesApi.getMyAdmin();
      setWorkspaces(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedWorkspace(null);
    setShowForm(true);
  };

  const handleEdit = (workspace) => {
    setSelectedWorkspace(workspace);
    setShowForm(true);
  };

  const handleToggleStatus = async (workspace) => {
    try {
      await workspacesApi.update(workspace.id, { status: workspace.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const columns = [
    { key: "code", label: "Código", sortable: true },
    { key: "name", label: "Nombre del Workspace" },
    { key: "company_name", label: "Empresa", render: (val) => val || 'N/A' },
    { key: "workspace_type", label: "Tipo", render: (val) => val || 'N/A' },
    { key: "archivos", label: "Archivos", width: "100px", filterable: false, render: (_, row) => {
      const template = row.metadata?.plantillas?.ips;
      const products = row.metadata?.catalogos?.productosFile;
      
      const hasTemplate = !!template && template !== 'undefined' && template !== 'null';
      const hasProducts = !!products && products !== 'undefined' && products !== 'null';

      if (!hasTemplate && !hasProducts) return <span className="text-gray-400">-</span>;

      return (
        <div className="flex gap-2 items-center">
          {hasTemplate && (
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded cursor-help border border-blue-200" title="Cuenta con plantilla Word">
              <FileText size={16} />
            </div>
          )}
          {hasProducts && (
            <div className="p-1.5 bg-green-50 text-green-600 rounded cursor-help border border-green-200" title="Cuenta con listado de productos">
              <FileSpreadsheet size={16} />
            </div>
          )}
        </div>
      );
    } },
    { 
      key: "status", 
      label: "Estado", 
      filterOptions: [
        { label: 'Activo', value: 'ACTIVE' },
        { label: 'Inactivo', value: 'INACTIVE' }
      ],
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${val === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {val === 'ACTIVE' ? 'Activo' : 'Inactivo'}
        </span>
      ) 
    }
  ];

  const actions = [
    { label: "Configurar / Miembros", onClick: handleEdit },
    { label: "Cambiar Estado", onClick: handleToggleStatus },
  ];

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-primary-600" /></div>;

  if (showForm) {
    return <WorkspaceForm workspace={selectedWorkspace} onBack={() => { setShowForm(false); loadData(); }} />;
  }

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isSuperAdmin = user?.email === 'contact@alessadatabase.cloud';

  return (
    <div className="space-y-4">
      <DataTable 
        title="Gestión de Workspaces" 
        columns={columns} 
        data={workspaces} 
        actions={actions}
        showAddButton={isSuperAdmin}
        onAdd={handleAdd}
      />
    </div>
  );
}
