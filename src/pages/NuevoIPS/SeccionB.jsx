import { useState, useEffect } from "react";
import { usePersistedState } from "../../hooks/usePersistedState";
import { Accordion } from "../../Components/ui/Accordion";
import { Input } from "../../Components/ui/input";
import { Select } from "../../Components/ui/Select";
import { Modal } from "../../Components/ui/Modal";
import { TableProperties, Plus, Trash2 } from "lucide-react";
import DataTable from "../../Components/DataTable";

// Helper component for fields
const Field = ({ label, children }) => (
  <div className="w-full">
    <label className="block text-sm font-medium mb-1.5 text-text-main">{label}</label>
    {children}
  </div>
);

export default function SeccionB() {
  const [formData, setFormData] = usePersistedState("seccionB_formData", {
    usoInvestigacion: "",
    detalleInvestigacion: "",
    usoComercializacion: "",
    detalleComercializacion: "",
    huboCambiosSeguridad: "",
    tablaCambios: [], // Array de objetos { id, titulo, fecha, detalle }
    tablaAcciones: [],
  });

  // --- MODAL STATE ---
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    tableId: null, // "acciones" o "cambios"
  });

  const openModal = (tableId) => {
    setModalConfig({ isOpen: true, tableId });
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, tableId: null });
  };

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Puedes crear los mismos handlers de array de SeccionA aquí para las tablas
  const handleArrayChange = (listName, index, field, value) => {
    setFormData((prev) => {
      const newList = [...prev[listName]];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, [listName]: newList };
    });
  };

  // --- HANDLERS PARA CAMBIOS DE SEGURIDAD (DINÁMICO) ---
  const addCambio = () => {
    setFormData((prev) => ({
      ...prev,
      tablaCambios: [
        ...prev.tablaCambios,
        { id: Date.now(), titulo: "", fecha: "", detalle: "" },
      ],
    }));
  };

  const removeCambio = (id) => {
    setFormData((prev) => ({
      ...prev,
      tablaCambios: prev.tablaCambios.filter((c) => c.id !== id),
    }));
  };

  const updateCambio = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      tablaCambios: prev.tablaCambios.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  };

  // --- RENDERS DE TABLAS (EJEMPLOS PARA MOSTRAR EN EL MODAL) ---
  const renderActiveTable = () => {
    if (modalConfig.tableId === "investigacion") {
      return (
        <div>
          <p className="text-text-muted mb-4">Tabla para registrar las acciones relacionadas con su uso en investigación.</p>
          <div className="p-8 border-2 border-dashed border-border rounded-xl text-center bg-surface-hover text-text-muted">
            [Aquí irá tu DataTable editable (similar al de SeccionA)]
          </div>
        </div>
      );
    }
    if (modalConfig.tableId === "acciones") {
      return (
        <div>
          <p className="text-text-muted mb-4">Tabla para registrar las acciones relacionadas con la etapa de comercialización.</p>
          <div className="p-8 border-2 border-dashed border-border rounded-xl text-center bg-surface-hover text-text-muted">
            [Aquí irá tu DataTable editable (similar al de SeccionA)]
          </div>
        </div>
      );
    }
    return null;
  };

  const modalTitles = {
    investigacion: "Tabla: Acciones en Investigación",
    acciones: "Tabla: Acciones Etapa de Comercialización",
  };

  return (
    <div className="space-y-8 pb-12">
      {/* TÍTULO PRINCIPAL */}
      <div>
        <h1 className="text-2xl font-bold text-text-main">SECCIÓN B</h1>
        <p className="text-text-muted mt-1">Alertas y Modificatorias</p>
      </div>

      {/* =======================================
          ACCORDION 1: B.1 Acciones adoptadas
      ======================================= */}
      <Accordion title="B.1 Acciones adoptadas por la autoridad reguladora o por el TRS" defaultOpen={true}>
        <div className="space-y-6">
          
          {/* B.1.1 */}
          <div className="p-5 border border-border rounded-xl bg-surface shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-main">B.1.1 Acciones relacionadas con su uso en investigación</h3>
              
              <button
                type="button"
                onClick={() => openModal("investigacion")}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
              >
                <TableProperties size={16} /> Ver Tabla
              </button>
            </div>
            <div className="max-w-xs">
              <Select
                label="¿Hubo acciones?"
                name="usoInvestigacion"
                value={formData.usoInvestigacion}
                onChange={handleChange}
                options={["SI", "NO"]}
              />
            </div>

            {/* Condicional Textarea */}
            {formData.usoInvestigacion === "SI" && (
              <div className="mt-4 fade-in animate-in duration-200">
                <Field label="Detalle de las acciones">
                  <textarea
                    name="detalleInvestigacion"
                    value={formData.detalleInvestigacion}
                    onChange={handleChange}
                    className="w-full border rounded-lg border-border bg-surface px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/10 focus-visible:border-primary-500 transition-all duration-200 min-h-[100px] text-text-main placeholder:text-text-muted"
                    placeholder="Escriba aquí los detalles..."
                  />
                </Field>
              </div>
            )}
          </div>

          {/* B.1.2 */}
          <div className="p-5 border border-border rounded-xl bg-surface shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-main">B.1.2 Acciones relacionadas con la etapa de comercialización</h3>
              
              <button
                type="button"
                onClick={() => openModal("acciones")}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
              >
                <TableProperties size={16} /> Ver Tabla
              </button>
            </div>
            
            <div className="max-w-xs">
              <Select
                label="¿Hubo acciones?"
                name="usoComercializacion"
                value={formData.usoComercializacion}
                onChange={handleChange}
                options={["SI", "NO"]}
              />
            </div>

            {/* Condicional Textarea */}
            {formData.usoComercializacion === "SI" && (
              <div className="mt-4 fade-in animate-in duration-200">
                <Field label="Detalle de las acciones">
                  <textarea
                    name="detalleComercializacion"
                    value={formData.detalleComercializacion}
                    onChange={handleChange}
                    className="w-full border rounded-lg border-border bg-surface px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/10 focus-visible:border-primary-500 transition-all duration-200 min-h-[100px] text-text-main placeholder:text-text-muted"
                    placeholder="Escriba aquí los detalles..."
                  />
                </Field>
              </div>
            )}
          </div>

        </div>
      </Accordion>

      {/* =======================================
          ACCORDION 2: B.2 Cambios en Seguridad
      ======================================= */}
      <Accordion title="B.2 Cambios en la Información de Seguridad del Producto" defaultOpen={true}>
        <div className="space-y-6">
          
          <div className="p-5 border border-border rounded-xl bg-surface shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-main">B.2 Cambios en la Información de Seguridad del Producto</h3>
            </div>
            
            <div className="max-w-md">
              <Select
                label="¿Hubo algún cambio en la información de seguridad durante el periodo?"
                name="huboCambiosSeguridad"
                value={formData.huboCambiosSeguridad}
                onChange={handleChange}
                options={["SI", "NO"]}
              />
            </div>

            {/* Condicional para cambios SI */}
            {formData.huboCambiosSeguridad === "SI" && (
              <div className="mt-6 space-y-6 fade-in animate-in duration-300">
                
                {/* LISTADO DE CARDS */}
                <div className="space-y-4">
                  {formData.tablaCambios.map((cambio, index) => (
                    <div 
                      key={cambio.id} 
                      className="group relative p-6 border border-border rounded-xl bg-surface-hover/30 hover:bg-surface-hover/50 transition-all duration-200"
                    >
                      {/* Botón Eliminar */}
                      <button
                        onClick={() => removeCambio(cambio.id)}
                        className="absolute top-4 right-4 p-2 text-text-muted hover:text-error-500 hover:bg-error-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Eliminar cambio"
                      >
                        <Trash2 size={18} />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-1">
                          <Field label={`#${index + 1} Título del cambio`}>
                            <Input
                              value={cambio.titulo}
                              onChange={(e) => updateCambio(cambio.id, "titulo", e.target.value)}
                              placeholder="Ej: Actualización de advertencias"
                            />
                          </Field>
                        </div>
                        <div className="md:col-span-1">
                          <Field label="Fecha de la modificación">
                            <Input
                              type="date"
                              value={cambio.fecha}
                              onChange={(e) => updateCambio(cambio.id, "fecha", e.target.value)}
                            />
                          </Field>
                        </div>
                        <div className="md:col-span-2">
                          <Field label="Detalle de los cambios realizados">
                            <textarea
                              value={cambio.detalle}
                              onChange={(e) => updateCambio(cambio.id, "detalle", e.target.value)}
                              className="w-full border rounded-lg border-border bg-surface px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/10 focus-visible:border-primary-500 transition-all duration-200 min-h-[120px] text-text-main placeholder:text-text-muted"
                              placeholder="De existir cambios en FT o inserto, los cambios realizados deben contener como mínimo la siguiente información&#10;• Sección actualizada&#10;• Información previa&#10;• Cambios realizados&#10;• Fecha de la modificación"
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón Agregar Nuevo Cambio */}
                <button
                  type="button"
                  onClick={addCambio}
                  className="w-full py-4 border-2 border-dashed border-border rounded-xl text-text-muted hover:text-primary-600 hover:border-primary-500 hover:bg-primary-50 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
                >
                  <Plus size={20} />
                  Agregar otro cambio de seguridad
                </button>

              </div>
            )}
          </div>

        </div>
      </Accordion>

      {/* =======================================
          MODAL GLOBAL PARA TABLAS
      ======================================= */}
      <Modal 
        isOpen={modalConfig.isOpen} 
        onClose={closeModal}
        title={modalTitles[modalConfig.tableId]}
      >
        {renderActiveTable()}
      </Modal>

    </div>
  );
}