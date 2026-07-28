import { useState, useEffect } from "react";
import DataTable from "@/Components/DataTable";
import { ipsColumns } from "@/pages/TablaControl/ipsColumns";
import { importExcel } from "@/utils/excelImporter";
import { excelDateToJSDate } from "@/utils/dateJson";
import { createIPSFromControl } from "@/pages/TablaControl/createIPSFromControl";
import { useNavigate } from "react-router-dom";
import { useIPSStore } from "@/store/ipsStore";
import { Upload, Trash2 } from "lucide-react";
import { fetchWithAuth, API_URL } from "@/services/api";

export default function IPSControlTablePage() {
  // --- STATES & STORE ---
  const tableData = useIPSStore((s) => s.tableData);
  const setTableData = useIPSStore((s) => s.setTableData);
  const setIPSObject = useIPSStore((s) => s.setIPSObject);

  // --- CARGAR DATOS DESDE EL BACKEND ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchWithAuth(`${API_URL}/ips-list`).then(res => {
          if (!res.ok) throw new Error("Error en respuesta");
          return res.json();
        });
        setTableData(data);
      } catch (error) {
        console.error("Error cargando listado IPS:", error);
      }
    };
    loadData();
  }, [setTableData]);

  // --- EXCEL IMPORT HANDLER ---
  const handleImportExcel = async (file) => {
    try {
      const jsonData = await importExcel(file);
      // Eliminar fila de cabeceras
      const rows = jsonData.slice(1);

      // Mapear columnas a formato JSON
      const mappedData = rows.map((row) => ({
        numero: row[0],
        rs: row[1],
        denominacion: row[2],
        producto: row[3],
        fabricante: row[4],
        edadProducto: row[5],
        fechaNacimientoLocal: excelDateToJSDate(row[6], 1),
        fechaInicioDatos: excelDateToJSDate(row[7], 1),
        fcd: excelDateToJSDate(row[8], 1),
        fechaLimite: excelDateToJSDate(row[9], 1),
        estado: row[10],
        aniosPeriodo: row[11],
        comentarios: row[12],
        ipsBasal: row[13],
        asignado: row[14],
        mes: row[15],
        fechaEntrega: row[16],
      }));

      // Guardar en el store persistente
      setTableData(mappedData);

      // Guardar en el backend para persistencia en BD
      try {
        await fetchWithAuth(`${API_URL}/ips-list/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mappedData),
        });
      } catch (err) {
        console.error("No se pudo guardar el listado en el backend:", err);
      }
    } catch (error) {
      console.error("Error importando Excel:", error);
    }
  };

  const navigate = useNavigate();
  
  // --- GENERACIÓN DE NUEVO IPS ---
  const handleCrearIPS = (row) => {
    const ipsObject = createIPSFromControl(row, tableData);
    setIPSObject(ipsObject);
    navigate("/app/ips/new", {
      state: { ipsObject }
    });
  };

  // --- ACCIONES DE CADA FILA ---
  const actions = [
    {
      label: "Editar",
      onClick: (row) => {
        console.log("Editar:", row);
      },
    },
    {
      label: "Crear IPS",
      onClick: (row) => handleCrearIPS(row),
    },
    {
      label: "Eliminar",
      className: "text-red-500 hover:text-red-700 font-medium",
      onClick: (row, idx) => {
        if (window.confirm("¿Está seguro de que desea eliminar este registro de control?")) {
          const updated = [...tableData];
          updated.splice(idx, 1);
          setTableData(updated);
        }
      },
    },
  ];

  // --- BOTONES COMPACTOS DE CABECERA (UX/UI) ---
  const tableHeaderActions = (
    <div className="flex items-center gap-2 ml-4">
      {/* SUBIR ARCHIVO */}
      <div className="relative inline-flex items-center">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) handleImportExcel(file);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-xs font-bold border border-primary-100 shadow-sm"
        >
          <Upload size={14} /> Subir Archivo
        </button>
      </div>

      {/* LIMPIAR LISTADO */}
      <button
        type="button"
        onClick={() => {
          if (window.confirm("¿Está seguro de que desea limpiar todos los registros de control de IPS?")) {
            setTableData([]);
          }
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-bold border border-red-100 shadow-sm"
      >
        <Trash2 size={14} /> Limpiar
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* HEADER PRINCIPAL DE PÁGINA */}
      <div>
        <h1 className="text-3xl font-bold text-text-main">
          Tabla Control IPS
        </h1>
        <p className="text-text-muted mt-1">
          Gestión de informes periódicos de seguridad
        </p>
      </div>

      {/* TABLA DE CONTENIDO CON ACCIONES INTEGRADAS EN CABECERA */}
      <DataTable
        title="Listado de IPS"
        columns={ipsColumns}
        data={tableData}
        actions={actions}
        defaultRowsPerPage={25}
        stickyActions
        headerActions={tableHeaderActions}
        stickyColumnsCount={3}
      />
    </div>
  );
}