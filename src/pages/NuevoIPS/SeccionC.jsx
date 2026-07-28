import { useState, useEffect } from "react";
import { usePersistedState } from "../../hooks/usePersistedState";
import { Accordion } from "../../Components/ui/Accordion";
import { Input } from "../../Components/ui/input";
import { Select } from "../../Components/ui/Select";
import { Plus, Trash2 } from "lucide-react";
import DataTable from "../../Components/DataTable";

// Helper component for fields
const Field = ({ label, children }) => (
  <div className="w-full">
    <label className="block text-sm font-medium mb-1.5 text-text-main">{label}</label>
    {children}
  </div>
);

export default function SeccionC() {
  // Leer datos de la Sección A para jalar productos y DDD
  const [seccionAData] = usePersistedState("seccionA_formData", {});

  const [formData, setFormData] = usePersistedState("seccionC_formData", {
    huboExpEstudiosClinicos: "",
    estudiosClinicosList: [], // { id, numeroEstudio, tituloEstudio, numPacientesTratamiento, numPacientesComparador, hallazgos }
    huboUnidadesComercializadas: "",
    postComercializacionList: [], // { rs, presentacion, unidadesVendidas, ddd, pacientesExpuestos }
  });

  // --- SINCRONIZACIÓN CON SECCIÓN A PARA C.2 ---
  useEffect(() => {
    if (seccionAData?.productosList) {
      const currentProducts = seccionAData.productosList;

      const hasDdd = seccionAData.hasDdd === "SI";
      const defaultDddNum = seccionAData.dddList?.[0]?.numero || "";
      const defaultDddUnit = seccionAData.dddList?.[0]?.unidad || "";
      const dddString = hasDdd && defaultDddNum ? `${defaultDddNum} ${defaultDddUnit}`.trim() : "No definida";

      setFormData(prev => {
        const newList = currentProducts.map(prod => {
          const existing = prev.postComercializacionList.find(p => p.rs === prod.rs);

          const presentacionVal = prod.formaFarmaceutica || "N/A";
          const unidadesVendidasVal = existing?.unidadesVendidas || "";
          const dddVal = dddString; // Sincronizado siempre con Sección A

          let pacientesExpuestosVal = existing?.pacientesExpuestos || "";

          // Cálculo automático
          const uVendidas = parseFloat(unidadesVendidasVal) || 0;
          if (uVendidas > 0) {
            const presMatch = String(presentacionVal).match(/[\d,.]+/);
            const presentacionNum = presMatch ? parseFloat(presMatch[0].replace(',', '.')) : 0;
            let dddNum = parseFloat(dddVal);

            if (isNaN(dddNum) || dddNum === 0 || String(dddVal).includes("No definida")) {
              pacientesExpuestosVal = uVendidas.toString();
            } else {
              const result = (uVendidas * presentacionNum) / dddNum;
              pacientesExpuestosVal = isNaN(result) ? "" : Number.isInteger(result) ? result.toString() : result.toFixed(2);
            }
          } else {
            pacientesExpuestosVal = "";
          }

          return {
            rs: prod.rs,
            presentacion: presentacionVal,
            unidadesVendidas: unidadesVendidasVal,
            ddd: dddVal,
            pacientesExpuestos: pacientesExpuestosVal
          };
        });

        // Solo actualizar si la lista ha cambiado (evitar loops)
        if (JSON.stringify(newList) !== JSON.stringify(prev.postComercializacionList)) {
          return { ...prev, postComercializacionList: newList };
        }
        return prev;
      });
    }
  }, [seccionAData, setFormData]);

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handlers para Estudios Clínicos (C.1)
  const addEstudio = () => {
    setFormData(prev => ({
      ...prev,
      estudiosClinicosList: [
        ...prev.estudiosClinicosList,
        {
          id: Date.now(),
          numeroEstudio: "",
          tituloEstudio: "",
          numPacientesTratamiento: "",
          numPacientesComparador: "",
          hallazgos: ""
        }
      ]
    }));
  };

  const removeEstudio = (id) => {
    setFormData(prev => ({
      ...prev,
      estudiosClinicosList: prev.estudiosClinicosList.filter(e => e.id !== id)
    }));
  };

  const updateEstudio = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      estudiosClinicosList: prev.estudiosClinicosList.map(e =>
        e.id === id ? { ...e, [field]: value } : e
      )
    }));
  };

  // Handlers para Post-Comercialización (C.2)
  const updatePostComercializacion = (rs, field, value) => {
    setFormData(prev => ({
      ...prev,
      postComercializacionList: prev.postComercializacionList.map(item => {
        if (item.rs === rs) {
          const updatedItem = { ...item, [field]: value };

          if (field === "unidadesVendidas" || field === "ddd") {
            const uVendidas = parseFloat(updatedItem.unidadesVendidas) || 0;
            if (uVendidas > 0) {
              const presMatch = String(updatedItem.presentacion).match(/[\d,.]+/);
              const presentacionNum = presMatch ? parseFloat(presMatch[0].replace(',', '.')) : 0;
              let dddNum = parseFloat(updatedItem.ddd);

              if (isNaN(dddNum) || dddNum === 0 || String(updatedItem.ddd).includes("No definida")) {
                updatedItem.pacientesExpuestos = uVendidas.toString();
              } else {
                const result = (uVendidas * presentacionNum) / dddNum;
                updatedItem.pacientesExpuestos = isNaN(result) ? "" : Number.isInteger(result) ? result.toString() : result.toFixed(2);
              }
            } else {
              updatedItem.pacientesExpuestos = "";
            }
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  // --- COLUMNAS TABLA C.2 ---
  const postComercializacionColumns = [
    { key: "rs", label: "Registro Sanitario" },
    { key: "presentacion", label: "Presentación Producto" },
    {
      key: "unidadesVendidas",
      label: "Unidades Vendidas*",
      render: (val, row) => (
        <Input
          className="h-8 text-xs"
          value={val}
          onChange={(e) => updatePostComercializacion(row.rs, "unidadesVendidas", e.target.value)}
        />
      )
    },
    {
      key: "ddd",
      label: "DDD**",
      render: (val, row) => (
        <Input
          className="h-8 text-xs"
          value={val}
          onChange={(e) => updatePostComercializacion(row.rs, "ddd", e.target.value)}
        />
      )
    },
    {
      key: "pacientesExpuestos",
      label: "Pacientes expuestos",
      render: (val, row) => (
        <Input
          className="h-8 text-xs bg-slate-50 cursor-not-allowed"
          value={val}
          readOnly
          onChange={(e) => updatePostComercializacion(row.rs, "pacientesExpuestos", e.target.value)}
        />
      )
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* TÍTULO PRINCIPAL */}
      <div>
        <h1 className="text-2xl font-bold text-text-main">SECCIÓN C</h1>
        <p className="text-text-muted mt-1">Pacientes Expuestos</p>
      </div>

      {/* =======================================
          C.1 EXPOSICIÓN EN ENSAYOS CLÍNICOS
      ======================================= */}
      <Accordion title="C.1 Exposición acumulada del paciente en ensayos clínicos" defaultOpen={true}>
        <div className="space-y-6">
          <div className="max-w-md">
            <Select
              label="¿Hubieron pacientes expuestos en estudios clínicos durante el periodo cubierto?"
              name="huboExpEstudiosClinicos"
              value={formData.huboExpEstudiosClinicos}
              onChange={handleChange}
              options={["SI", "NO"]}
            />
          </div>

          {formData.huboExpEstudiosClinicos === "SI" && (
            <div className="space-y-6 fade-in animate-in duration-300">
              <div className="space-y-4">
                {formData.estudiosClinicosList.map((estudio, index) => (
                  <div
                    key={estudio.id}
                    className="group relative p-6 border border-border rounded-xl bg-surface shadow-sm hover:border-primary-200 transition-all"
                  >
                    <button
                      onClick={() => removeEstudio(estudio.id)}
                      className="absolute top-4 right-4 p-2 text-text-muted hover:text-error-500 hover:bg-error-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>

                    <div className="space-y-4">
                      {/* Fila 1 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Número de estudio">
                          <Input
                            value={estudio.numeroEstudio}
                            onChange={(e) => updateEstudio(estudio.id, "numeroEstudio", e.target.value)}
                            placeholder="Ej: EST-001"
                          />
                        </Field>
                        <Field label="Título de estudio">
                          <Input
                            value={estudio.tituloEstudio}
                            onChange={(e) => updateEstudio(estudio.id, "tituloEstudio", e.target.value)}
                            placeholder="Ingrese el título..."
                          />
                        </Field>
                      </div>

                      {/* Fila 2 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Número de pacientes (Tratamiento)">
                          <Input
                            type="number"
                            value={estudio.numPacientesTratamiento}
                            onChange={(e) => updateEstudio(estudio.id, "numPacientesTratamiento", e.target.value)}
                          />
                        </Field>
                        <Field label="Número de pacientes (Comparador / Placebo)">
                          <Input
                            type="number"
                            value={estudio.numPacientesComparador}
                            onChange={(e) => updateEstudio(estudio.id, "numPacientesComparador", e.target.value)}
                          />
                        </Field>
                      </div>

                      {/* Fila 3 */}
                      <Field label="Hallazgos de eficacia y seguridad">
                        <textarea
                          value={estudio.hallazgos}
                          onChange={(e) => updateEstudio(estudio.id, "hallazgos", e.target.value)}
                          className="w-full border rounded-lg border-border bg-surface px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 min-h-[100px] text-text-main"
                          placeholder="Describa los hallazgos..."
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addEstudio}
                className="w-full py-4 border-2 border-dashed border-border rounded-xl text-text-muted hover:text-primary-600 hover:border-primary-500 hover:bg-primary-50 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Plus size={20} /> Agregar otro estudio clínico
              </button>
            </div>
          )}
        </div>
      </Accordion>

      {/* =======================================
          C.2 EXPOSICIÓN POST-COMERCIALIZACIÓN
      ======================================= */}
      <Accordion title="C.2 Exposición de pacientes acumulada durante la post-comercialización" defaultOpen={true}>
        <div className="space-y-6">
          <div className="max-w-md">
            <Select
              label="¿Hubo unidades comercializadas para el producto durante el periodo cubierto?"
              name="huboUnidadesComercializadas"
              value={formData.huboUnidadesComercializadas}
              onChange={handleChange}
              options={["SI", "NO"]}
            />
          </div>

          {formData.huboUnidadesComercializadas === "SI" && (
            <div className="fade-in animate-in duration-300">
              <DataTable
                title="Consolidado de Unidades y Pacientes Expuestos"
                columns={postComercializacionColumns}
                data={formData.postComercializacionList}
              />
              <div className="mt-4 space-y-1 text-xs text-text-muted italic">
                <p>* Corresponde al total de cantidad de sustancia (mg o g totales vendidos).</p>
                <p>** Cuando no se ha definido la DDD la estimación de pacientes expuestos se da en función de número de unidades comercializadas.</p>
                <p>*** Los datos de Registro Sanitario y Presentación se sincronizan automáticamente con la Sección A.</p>
              </div>
            </div>
          )}
        </div>
      </Accordion>
    </div>
  );
}