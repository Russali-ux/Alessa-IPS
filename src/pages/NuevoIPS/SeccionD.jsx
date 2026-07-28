import { useState } from "react";
import { usePersistedState } from "../../hooks/usePersistedState";
import { Accordion } from "../../Components/ui/Accordion";
import { Select } from "../../Components/ui/Select";
import { Modal } from "../../Components/ui/Modal";
import { Input } from "../../Components/ui/input";
import { TableProperties, Upload, FileSpreadsheet, Plus, Trash2, Copy } from "lucide-react";
import DataTable from "../../Components/DataTable";
import * as XLSX from "xlsx";

export default function SeccionD() {
  const [formData, setFormData] = usePersistedState("seccionD_formData", {
    huboRAM: "",
    ramList: [], // Lista detallada
    ramSummary: [], // Lista agrupada para la tabla de resumen { soc, tp, ... }
  });

  const [activeTab, setActiveTab] = useState("resumen"); // "resumen" o "detalle"
  const [modalOpen, setModalOpen] = useState(false);
  const [showFormatHelp, setShowFormatHelp] = useState(false);

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      // Mapear datos a nuestro formato (añadir ID único)
      const mappedData = data.map((row, index) => ({
        id: Date.now() + index,
        anio: row["AÑO"] || "",
        mes: row["MES"] || "",
        idAlgorit: row["ID_ALGORIT"] || "",
        n: row["N°"] || "",
        listFilt: row["LIST_FILT"] || "",
        codCaso: row["COD_CASO"] || "",
        v: row["V"] || "",
        tipoReporte: row["TIPO_REPORTE"] || "",
        idRam: row["ID_RAM"] || "",
        reaccionAdversa: row["REACCION_ADVERSA"] || "",
        idMed: row["ID_MED"] || "",
        productoSospechoso: row["PRODUCTO_SOSPECHOSO"] || "",
        categoriaCausalidad: row["CATEGORIA_CAUSALIDAD"] || "",
        serioNoSerio: row["SERIO_NO_SERIO"] || "",
        tipoEvento: row["TIPO_EVENTO"] || "",
        socMeddra: row["SOC_MEDDRA"] || "",
        listadoNoListado: row["LISTADO_NO_LISTADO"] || "",
        nombreComercial: row["NOMBRE_COMERCIAL"] || "",
        motivoPrescripcion: row["MOTIVO_PRESCRIPCION"] || "",
        cie10: row["CIE10"] || "",
        sospechaCalidad: row["SOSPECHA_CALIDAD"] || "",
      }));

      setFormData(prev => {
        const newList = [...prev.ramList, ...mappedData];
        return {
          ...prev,
          ramList: newList,
          ramSummary: generateSummary(newList)
        };
      });
    };
    reader.readAsBinaryString(file);
  };

  const generateSummary = (list) => {
    const summaryMap = {};
    list.forEach(item => {
      const soc = item.socMeddra || "SIN SOC";
      const tp = item.reaccionAdversa || "SIN PT";
      const key = `${soc}|||${tp}`;

      if (!summaryMap[key]) {
        summaryMap[key] = {
          id: key,
          soc,
          tp,
          espGravesInt: 0,
          espGravesAcum: 0,
          espNoGravesInt: 0,
          espNoGravesAcum: 0,
          niGravesInt: 0,
          niGravesAcum: 0,
          totalAcum: 0
        };
      }

      const isSerio = item.serioNoSerio === "SERIO";
      // Por defecto asumimos Espontáneas a menos que se defina lo contrario
      const isEspontanea = true; 

      if (isEspontanea) {
        if (isSerio) {
          summaryMap[key].espGravesInt++;
          summaryMap[key].espGravesAcum++;
        } else {
          summaryMap[key].espNoGravesInt++;
          summaryMap[key].espNoGravesAcum++;
        }
      } else {
        if (isSerio) {
          summaryMap[key].niGravesInt++;
          summaryMap[key].niGravesAcum++;
        }
      }
      
      summaryMap[key].totalAcum = summaryMap[key].espGravesAcum + summaryMap[key].espNoGravesAcum + summaryMap[key].niGravesAcum;
    });

    return Object.values(summaryMap).sort((a, b) => {
      const socCompare = (a.soc || "").localeCompare(b.soc || "");
      if (socCompare !== 0) return socCompare;
      return (a.tp || "").localeCompare(b.tp || "");
    });
  };

  const updateSummary = (id, field, value) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => {
      const newSummary = prev.ramSummary.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: numValue };
          // Recalcular Total Acumulado
          updatedItem.totalAcum = updatedItem.espGravesAcum + updatedItem.espNoGravesAcum + updatedItem.niGravesAcum;
          return updatedItem;
        }
        return item;
      });
      return { ...prev, ramSummary: newSummary };
    });
  };

  const updateRAM = (id, field, value) => {
    setFormData(prev => {
      const newList = prev.ramList.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      );
      return {
        ...prev,
        ramList: newList,
        ramSummary: generateSummary(newList)
      };
    });
  };

  const handleCopyData = async () => {
    if (!formData.ramSummary || formData.ramSummary.length === 0) {
      alert("No hay datos para copiar.");
      return;
    }

    const rows = formData.ramSummary.map(row => [
      row.soc || "",
      row.tp || "",
      row.espGravesInt || 0,
      row.espGravesAcum || 0,
      row.espNoGravesInt || 0,
      row.espNoGravesAcum || 0,
      row.totalAcum || 0,
      row.niGravesInt || 0,
      row.niGravesAcum || 0
    ]);

    const plainText = rows.map(r => r.join("\t")).join("\n");
    const htmlText = `<table>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;

    try {
      const clipboardItem = new ClipboardItem({
        "text/plain": new Blob([plainText], { type: "text/plain" }),
        "text/html": new Blob([htmlText], { type: "text/html" })
      });
      await navigator.clipboard.write([clipboardItem]);
      alert("Datos copiados al portapapeles.");
    } catch (err) {
      console.error("Error al copiar usando ClipboardItem: ", err);
      navigator.clipboard.writeText(plainText).then(() => {
        alert("Datos copiados al portapapeles (formato de texto).");
      }).catch(e => {
        alert("Error al copiar los datos.");
      });
    }
  };

  const removeRAM = (id) => {
    setFormData(prev => {
      const newList = prev.ramList.filter(item => item.id !== id);
      return {
        ...prev,
        ramList: newList,
        ramSummary: generateSummary(newList)
      };
    });
  };

  const addManualRAM = () => {
    setFormData(prev => {
      const newList = [
        ...(prev.ramList || []),
        {
          id: Date.now(),
          anio: new Date().getFullYear(),
          mes: new Date().getMonth() + 1,
          codCaso: "",
          productoSospechoso: "",
          reaccionAdversa: "",
          categoriaCausalidad: "",
          serioNoSerio: "NO SERIO",
          socMeddra: "",
          nombreComercial: "",
        }
      ];
      return {
        ...prev,
        ramList: newList,
        ramSummary: generateSummary(newList)
      };
    });
  };

  // --- COLUMNAS PARA DATATABLE ---
  const ramColumns = [
    { key: "codCaso", label: "CÓDIGO CASO", render: (val, row) => (
      <Input className="h-8 text-xs min-w-[100px]" value={val} onChange={(e) => updateRAM(row.id, "codCaso", e.target.value)} />
    )},
    { key: "productoSospechoso", label: "PRODUCTO SOSPECHOSO", render: (val, row) => (
      <Input className="h-8 text-xs min-w-[150px]" value={val} onChange={(e) => updateRAM(row.id, "productoSospechoso", e.target.value)} />
    )},
    { key: "reaccionAdversa", label: "REACCIÓN ADVERSA", render: (val, row) => (
      <Input className="h-8 text-xs min-w-[180px]" value={val} onChange={(e) => updateRAM(row.id, "reaccionAdversa", e.target.value)} />
    )},
    { key: "categoriaCausalidad", label: "CAUSALIDAD", render: (val, row) => (
      <Input className="h-8 text-xs min-w-[100px]" value={val} onChange={(e) => updateRAM(row.id, "categoriaCausalidad", e.target.value)} />
    )},
    { key: "serioNoSerio", label: "SERIEDAD", render: (val, row) => (
      <select 
        className="h-8 text-xs border border-border rounded px-2 bg-surface"
        value={val} 
        onChange={(e) => updateRAM(row.id, "serioNoSerio", e.target.value)}
      >
        <option value="SERIO">SERIO</option>
        <option value="NO SERIO">NO SERIO</option>
      </select>
    )},
    { key: "socMeddra", label: "SOC MEDDRA", render: (val, row) => (
      <Input className="h-8 text-xs min-w-[180px]" value={val} onChange={(e) => updateRAM(row.id, "socMeddra", e.target.value)} />
    )},
    {
      key: "actions",
      label: "",
      render: (_, row) => (
        <button onClick={() => removeRAM(row.id)} className="p-1 text-text-muted hover:text-error-500 transition-colors">
          <Trash2 size={16} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* TÍTULO PRINCIPAL */}
      <div>
        <h1 className="text-2xl font-bold text-text-main">SECCIÓN D</h1>
        <p className="text-text-muted mt-1">Reacciones Adversas</p>
      </div>

      {/* D.1 REACCIONES ADVERSAS CARD */}
      <div className="p-5 border border-border rounded-xl bg-surface shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text-main">D.1 Reporte de Reacciones Adversas (RAM)</h3>
          
          {formData.huboRAM === "SI" && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium shadow-sm"
            >
              <TableProperties size={16} /> Ver Tabla ({(formData.ramList || []).length})
            </button>
          )}
        </div>

        <div className="max-w-md">
          <Select
            label="¿Hubo reacciones adversas reportadas durante el periodo cubierto?"
            name="huboRAM"
            value={formData.huboRAM}
            onChange={handleChange}
            options={["SI", "NO"]}
          />
        </div>
      </div>

      {/* MODAL PARA LA TABLA TRANSFORMARDA / DETALLADA */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tabulación Global de Reacciones Adversas"
        size="max-w-[95vw]"
      >
        <div className="space-y-6">
          {/* HEADER ACTIONS ROW */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            {/* TABS PARA CAMBIAR VISTA */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab("resumen")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "resumen" ? "bg-white text-primary-600 shadow-sm" : "text-text-muted hover:text-text-main"}`}
              >
                Vista Resumen (Tabulación Global)
              </button>
              <button
                onClick={() => setActiveTab("detalle")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "detalle" ? "bg-white text-primary-600 shadow-sm" : "text-text-muted hover:text-text-main"}`}
              >
                Listado Detallado (Excel) ({formData.ramList?.length || 0})
              </button>
            </div>

            {/* ACCIONES COMPACTAS */}
            <div className="flex items-center gap-2">
              <div className="relative inline-flex items-center">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-xs font-bold border border-primary-100 shadow-sm">
                  <Upload size={14} /> Cargar Archivo
                </button>
              </div>

              <button
                type="button"
                onClick={addManualRAM}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-bold border border-emerald-100 shadow-sm"
              >
                <Plus size={14} /> Agregar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("¿Está seguro de que desea limpiar todos los registros de reacciones adversas?")) {
                    setFormData(prev => ({
                      ...prev,
                      ramList: [],
                      ramSummary: []
                    }));
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-bold border border-red-100 shadow-sm"
              >
                <Trash2 size={14} /> Limpiar
              </button>

              <button
                type="button"
                onClick={() => setShowFormatHelp(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold border shadow-sm ${showFormatHelp ? "bg-amber-600 text-white border-amber-600" : "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100"}`}
              >
                <FileSpreadsheet size={14} /> Formato Esperado
              </button>
            </div>
          </div>

          {showFormatHelp && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 animate-slideDown space-y-1">
              <p className="font-bold flex items-center gap-1">📌 Estructura sugerida para importación de Excel:</p>
              <p className="opacity-90">El archivo cargado debe contener al menos las siguientes columnas (las cabeceras pueden variar ligeramente):</p>
              <code className="block bg-white/60 p-1.5 rounded border border-amber-200/50 font-mono text-[10px] break-all">
                AÑO | MES | COD_CASO | PRODUCTO_SOSPECHOSO | REACCION_ADVERSA | CATEGORIA_CAUSALIDAD | SERIO_NO_SERIO | SOC_MEDDRA
              </code>
            </div>
          )}

          {activeTab === "resumen" ? (
            <div className="space-y-4">
              <div className="overflow-auto border border-border rounded-xl max-h-[60vh] relative">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-200 text-text-main font-bold">
                      <th rowSpan={3} className="border border-border p-4 min-w-[200px] sticky top-0 bg-gray-200 z-20">
                        <div className="flex items-center justify-between gap-2">
                          <span>SOC (Sistema Organo Clase)</span>
                          <button onClick={handleCopyData} title="Copiar datos (sin encabezados)" className="p-1.5 text-primary-600 hover:bg-primary-100 rounded transition-colors shadow-sm bg-white">
                            <Copy size={16} />
                          </button>
                        </div>
                      </th>
                      <th rowSpan={3} className="border border-border p-4 min-w-[150px] sticky top-0 bg-gray-200 z-20">TP (Término Preferido)</th>
                      <th colSpan={5} className="border border-border p-2 text-center bg-gray-300 sticky top-0 bg-gray-300 z-20">
                        Espontáneas (incl. Prof. Salud, Pacientes, Titulares y Literatura)
                      </th>
                      <th colSpan={2} className="border border-border p-2 text-center bg-gray-300 sticky top-0 bg-gray-300 z-20">
                        E.A. Graves de Estudios de No Intervención
                      </th>
                    </tr>
                    <tr className="bg-gray-100 text-text-main font-bold">
                      <th colSpan={2} className="border border-border p-2 text-center sticky top-[36px] bg-gray-100 z-20">GRAVES</th>
                      <th colSpan={2} className="border border-border p-2 text-center sticky top-[36px] bg-gray-100 z-20">NO GRAVES</th>
                      <th rowSpan={2} className="border border-border p-2 text-center bg-primary-50 text-primary-700 sticky top-[36px] bg-primary-50 z-20">TOTAL ACUMULADO (***)</th>
                      <th colSpan={2} className="border border-border p-2 text-center sticky top-[36px] bg-gray-100 z-20">GRAVES</th>
                    </tr>
                    <tr className="bg-gray-50 text-text-muted font-semibold">
                      <th className="border border-border p-2 sticky top-[68px] bg-gray-50 z-20">INTERVALO (*)</th>
                      <th className="border border-border p-2 sticky top-[68px] bg-gray-50 z-20">ACUMULADO (**)</th>
                      <th className="border border-border p-2 sticky top-[68px] bg-gray-50 z-20">INTERVALO (*)</th>
                      <th className="border border-border p-2 sticky top-[68px] bg-gray-50 z-20">ACUMULADO (**)</th>
                      <th className="border border-border p-2 sticky top-[68px] bg-gray-50 z-20">INTERVALO (*)</th>
                      <th className="border border-border p-2 sticky top-[68px] bg-gray-50 z-20">ACUMULADO (**)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.ramSummary || []).length > 0 ? (
                      formData.ramSummary.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                          <td className="border border-border p-2 font-medium bg-gray-50/30">{row.soc}</td>
                          <td className="border border-border p-2 italic">{row.tp}</td>
                          {/* Espontáneas Graves */}
                          <td className="border border-border p-0">
                            <input type="number" className="w-full h-full p-2 bg-transparent text-center focus:bg-white outline-none" value={row.espGravesInt} onChange={(e) => updateSummary(row.id, "espGravesInt", e.target.value)} />
                          </td>
                          <td className="border border-border p-0">
                            <input type="number" className="w-full h-full p-2 bg-transparent text-center focus:bg-white outline-none font-semibold" value={row.espGravesAcum} onChange={(e) => updateSummary(row.id, "espGravesAcum", e.target.value)} />
                          </td>
                          {/* Espontáneas No Graves */}
                          <td className="border border-border p-0">
                            <input type="number" className="w-full h-full p-2 bg-transparent text-center focus:bg-white outline-none" value={row.espNoGravesInt} onChange={(e) => updateSummary(row.id, "espNoGravesInt", e.target.value)} />
                          </td>
                          <td className="border border-border p-0">
                            <input type="number" className="w-full h-full p-2 bg-transparent text-center focus:bg-white outline-none font-semibold" value={row.espNoGravesAcum} onChange={(e) => updateSummary(row.id, "espNoGravesAcum", e.target.value)} />
                          </td>
                          {/* Total Acumulado */}
                          <td className="border border-border p-2 text-center bg-primary-50/30 font-bold text-primary-700">
                            {row.totalAcum}
                          </td>
                          {/* No Intervención Graves */}
                          <td className="border border-border p-0">
                            <input type="number" className="w-full h-full p-2 bg-transparent text-center focus:bg-white outline-none" value={row.niGravesInt} onChange={(e) => updateSummary(row.id, "niGravesInt", e.target.value)} />
                          </td>
                          <td className="border border-border p-0">
                            <input type="number" className="w-full h-full p-2 bg-transparent text-center focus:bg-white outline-none font-semibold" value={row.niGravesAcum} onChange={(e) => updateSummary(row.id, "niGravesAcum", e.target.value)} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="border border-border p-8 text-center text-text-muted italic">
                          No hay datos para mostrar. Cargue un archivo Excel para generar el resumen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* PIE DE TABLA CON ACLARACIONES */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-text-muted space-y-1 italic shadow-sm">
                <p className="font-semibold text-[11px] text-text-main not-italic mb-1">Aclaraciones:</p>
                <p><span className="font-bold text-primary-600">*</span> El intervalo comprende el periodo cubierto por el IPS.</p>
                <p><span className="font-bold text-primary-600">**</span> El acumulado comprende desde el inicio de la comercialización hasta FCI del IPS.</p>
                <p><span className="font-bold text-primary-600">***</span> El total acumulado, es la sumatoria del acumulado de notificaciones espontaneas graves y no graves.</p>
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <DataTable
                columns={ramColumns}
                data={formData.ramList || []}
                showAddButton={false}
              />
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}