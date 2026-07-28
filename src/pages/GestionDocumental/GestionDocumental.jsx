import { useState, useEffect } from "react";
import DataTable from "@/Components/DataTable";
import { gestionColumns } from "./gestionColumns";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth, API_URL } from "@/services/api";

export default function GestionDocumental() {
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const workspaceId = localStorage.getItem('currentWorkspaceId');
      if (!workspaceId) return;

      const data = await fetchWithAuth(`${API_URL}/ips-cases/workspace/${workspaceId}`).then(res => {
        if (!res.ok) throw new Error("Error en respuesta");
        return res.json();
      });
      setTableData(data);
    } catch (error) {
      console.error("Error cargando Gestión Documental:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEditar = (row) => {
    if (row.latest_version_id) {
        navigate(`/app/ips/edit/${row.latest_version_id}`);
    } else {
        alert("No se encontró una versión para editar.");
    }
  };

  const handleNuevaVersion = async (row) => {
    if (!row.latest_version_id) return;
    
    if (window.confirm("¿Deseas crear una nueva versión heredando los datos permanentes de la actual?")) {
        try {
            // Ejemplo de payload, en un caso real se podría abrir un modal para definir el nuevo periodo
            const response = await fetchWithAuth(`${API_URL}/ips-cases/${row.id}/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    previous_version_id: row.latest_version_id,
                    new_version_data: {
                        version: {
                            // Se podrían setear los nuevos periodos aquí
                        }
                    }
                }),
            });
            
            if (response.ok) {
                const newVersion = await response.json();
                navigate(`/app/ips/edit/${newVersion.id}`);
            } else {
                alert("Error al crear nueva versión.");
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión.");
        }
    }
  };

  const handleEliminar = async (row) => {
    if (window.confirm("¿Está seguro de que desea eliminar este expediente y todas sus versiones de forma permanente?")) {
        try {
            const response = await fetchWithAuth(`${API_URL}/ips-cases/${row.id}`, {
                method: "DELETE",
            });
            
            if (response.ok) {
                alert("Expediente eliminado correctamente.");
                // Recargar datos
                loadData();
            } else {
                alert("Error al eliminar el expediente.");
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión al intentar eliminar.");
        }
    }
  };

  const actions = [
    {
      label: "Continuar Edición",
      onClick: (row) => handleEditar(row),
    },
    {
      label: "Crear Nueva Versión",
      onClick: (row) => handleNuevaVersion(row),
    },
    {
      label: "Eliminar",
      className: "text-red-500 hover:text-red-700 font-medium",
      onClick: (row) => handleEliminar(row),
    }
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-text-main">
          Gestión Documental
        </h1>
        <p className="text-text-muted mt-1">
          Administración de Expedientes y Versiones de IPS
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">Cargando...</div>
      ) : (
        <DataTable
          title="Expedientes IPS"
          columns={gestionColumns}
          data={tableData}
          actions={actions}
          defaultRowsPerPage={25}
          stickyActions
        />
      )}
    </div>
  );
}
