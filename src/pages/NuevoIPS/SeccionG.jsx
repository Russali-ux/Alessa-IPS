import React, { useState, useEffect } from "react";
import { usePersistedState } from "../../hooks/usePersistedState";
import { useToast } from "../../contexts/ToastContext";
import { Accordion } from "../../Components/ui/Accordion";
import { Button } from "../../Components/ui/button";
import DataTable from "../../Components/DataTable";
import { Globe, Play, Plus, Trash2, Cpu, Copy, FileText, CheckCircle2, ArrowUpDown, X } from "lucide-react";
import { parseVigiaccessHTML } from "./utils/VIGIhtmlExtractors/parseSOC";

const Field = ({ label, children }) => (
  <div className="w-full">
    <label className="block text-sm font-medium mb-1.5 text-text-main">{label}</label>
    {children}
  </div>
);

export default function SeccionG() {
  const { showToast } = useToast();
  
  // Persisted state for the Vigiaccess data
  const [vigiaccessData, setVigiaccessData] = usePersistedState("seccionG_vigiaccessData", {
    htmlInput: "",
    tableData: [], // Array of { id, soc, inFT: boolean, inADR: boolean, originalADRs: number, originalPercentage: number }
    analysisText: "",
    claudeResponse: ""
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showIAResult, setShowIAResult] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const sortedTableData = React.useMemo(() => {
    let sortableItems = [...vigiaccessData.tableData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [vigiaccessData.tableData, sortConfig]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // API Keys
  const claudeApiKey = localStorage.getItem("claude_api_key") || "";
  const openaiApiKey = localStorage.getItem("openai_api_key") || "";
  const [aiProvider, setAiProvider] = useState(claudeApiKey ? "claude" : (openaiApiKey ? "openai" : "claude"));

  // Fetch IFA Name for Prompt
  const [ifa, setIfa] = useState(() => {
    const saved = sessionStorage.getItem("seccionA_formData");
    if (saved) {
      try { return JSON.parse(saved).ifaName || ""; } catch(e) { return ""; }
    }
    return "";
  });

  const handleProcessHTML = () => {
    if (!vigiaccessData.htmlInput.trim()) {
      showToast("Por favor, ingresa el código HTML de Vigiaccess.", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const extractedRows = parseVigiaccessHTML(vigiaccessData.htmlInput);
      
      if (extractedRows.length === 0) {
        showToast("No se encontraron registros de Vigiaccess válidos en el HTML.", "error");
        setIsProcessing(false);
        return;
      }

      // Merge new extracted rows with existing rows (keep existing FT markings if possible)
      // Or just append / replace. Let's ask the user? Or let's replace but keep existing manual FT entries.
      // A robust way: Update ADR true for extracted ones.
      
      let newTableData = [...vigiaccessData.tableData];
      
      extractedRows.forEach(extracted => {
        const existingIdx = newTableData.findIndex(r => r.soc.toLowerCase() === extracted.soc.toLowerCase());
        if (existingIdx >= 0) {
          newTableData[existingIdx].inADR = true;
          newTableData[existingIdx].originalADRs = extracted.adrs;
          newTableData[existingIdx].originalPercentage = extracted.percentage;
        } else {
          newTableData.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            soc: extracted.soc,
            inFT: false,
            inADR: true,
            originalADRs: extracted.adrs,
            originalPercentage: extracted.percentage
          });
        }
      });

      setVigiaccessData(prev => ({
        ...prev,
        tableData: newTableData
      }));
      
      showToast("Tabla generada correctamente", "success");
    } catch (error) {
      console.error(error);
      showToast("Error al procesar el HTML", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddManualRow = () => {
    const socName = prompt("Ingrese el nombre del SOC (System Organ Class):");
    if (socName && socName.trim()) {
      setVigiaccessData(prev => ({
        ...prev,
        tableData: [
          ...prev.tableData,
          {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            soc: socName.trim(),
            inFT: false,
            inADR: false,
            originalADRs: 0,
            originalPercentage: 0
          }
        ]
      }));
    }
  };

  const toggleCheckbox = (id, field) => {
    setVigiaccessData(prev => ({
      ...prev,
      tableData: prev.tableData.map(row => 
        row.id === id ? { ...row, [field]: !row[field] } : row
      )
    }));
  };

  const deleteRow = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar esta fila?")) {
      setVigiaccessData(prev => ({
        ...prev,
        tableData: prev.tableData.filter(row => row.id !== id)
      }));
    }
  };

  const SortableHeader = ({ label, sortKey }) => (
    <button 
      onClick={() => handleSort(sortKey)} 
      className="flex items-center gap-1 hover:text-indigo-600 transition-colors bg-transparent border-none cursor-pointer p-0 font-semibold text-[10px]"
    >
      {label} <ArrowUpDown size={12} className="opacity-50" />
    </button>
  );

  const columns = [
    { 
      key: "soc", 
      label: "SOC",
      width: "45%",
      render: (val) => <div className="font-medium text-slate-800 py-1">{val}</div>
    },
    {
      key: "originalPercentage",
      label: <SortableHeader label="%" sortKey="originalPercentage" />,
      width: "10%",
      render: (val) => val + "%"
    },
    {
      key: "originalADRs",
      label: <SortableHeader label="ADRs" sortKey="originalADRs" />,
      width: "15%",
      render: (val) => val.toLocaleString()
    },
    {
      key: "inADR",
      label: "Vigiaccess (ADR)",
      width: "15%",
      filterable: false,
      render: (val, row) => (
        <div className="flex justify-center items-center">
          <input 
            type="checkbox" 
            checked={val} 
            onChange={() => toggleCheckbox(row.id, "inADR")}
            className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
          />
        </div>
      )
    },
    {
      key: "inFT",
      label: "Ficha Técnica (FT)",
      width: "15%",
      filterable: false,
      render: (val, row) => (
        <div className="flex justify-center items-center">
          <input 
            type="checkbox" 
            checked={val} 
            onChange={() => toggleCheckbox(row.id, "inFT")}
            className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
          />
        </div>
      )
    }
  ];

  const handleAnalisisIA = async () => {
    if (!ifa) {
      alert("⚠️ No se ha detectado el nombre del producto (IFA). Verifica la Sección A.");
      return;
    }

    if (vigiaccessData.tableData.length === 0) {
      alert("⚠️ La tabla comparativa está vacía. Procesa el HTML o agrega SOCs manualmente primero.");
      return;
    }

    if (aiProvider === "claude" && !claudeApiKey) {
      alert("No hay API Key configurada para Claude en la pestaña Configuración IA.");
      return;
    }
    if (aiProvider === "openai" && !openaiApiKey) {
      alert("No hay API Key configurada para OpenAI en la pestaña Configuración IA.");
      return;
    }

    setIsAnalyzing(true);

    try {
      // Build Prompt Data
      const ftSOCs = vigiaccessData.tableData.filter(r => r.inFT).map(r => r.soc).join(", ") || "Ninguno marcado";
      const evSOCs = vigiaccessData.tableData.filter(r => r.inADR).map(r => r.soc).join(", ") || "Ninguno marcado";
      
      let comparativaText = "| SOC | FT | ADR |\n|---|---|---|\n";
      vigiaccessData.tableData.forEach(r => {
        comparativaText += `| ${r.soc} | ${r.inFT ? '✔' : '✘'} | ${r.inADR ? '✔' : '✘'} |\n`;
      });

      const prompt = `Actúa como un especialista en farmacovigilancia y elaboración de PSUR/PBRER conforme a ICH E2C(R2) y GVP Module VII.

Analiza la siguiente comparación entre la Ficha Técnica y los datos de EudraVigilance/Vigiaccess.

Producto:
${ifa}

SOC descritos en la FT:
${ftSOCs}

SOC obtenidos de vigiacces:
${evSOCs}

Resultado de la comparación:
${comparativaText}

Elabora un análisis técnico que incluya:

1. Resumen de la comparación.
2. Concordancia entre ambas fuentes.
3. Identificación de SOC presentes únicamente en EudraVigilance.
4. Identificación de SOC descritos en la FT que no aparecen en EudraVigilance.
5. Descripción de los SOC con mayor frecuencia.
6. Interpretación regulatoria.
7. Conclusión adecuada para incorporarse al PSUR.

No concluyas que existe una señal de seguridad únicamente por diferencias en la frecuencia o por la presencia de un SOC. Indica únicamente si los hallazgos justifican una revisión posterior a nivel Preferred Term (PT).`;

      const endpoint = aiProvider === "claude" ? "http://127.0.0.1:5000/api/claude" : "http://127.0.0.1:5000/api/openai";
      const keyToUse = aiProvider === "claude" ? claudeApiKey : openaiApiKey;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: keyToUse, prompt: prompt })
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }

      const data = await response.json();
      if (data.response) {
        setVigiaccessData(prev => ({
          ...prev,
          claudeResponse: data.response
        }));
        setShowIAResult(true);
        showToast("Análisis IA completado", "success");
      } else {
        throw new Error("La API no devolvió una respuesta válida.");
      }
    } catch (err) {
      console.error(err);
      alert(`Error al generar análisis IA: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copiarAlPortapapeles = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      showToast("Copiado al portapapeles", "success");
    } catch (err) {
      alert("❌ Error al copiar");
    }
  };

  return (
    <div className="space-y-12 max-w-[95%] mx-auto pb-24">
      {/* TÍTULO PRINCIPAL */}
      <div>
        <h1 className="text-2xl font-bold text-text-main uppercase tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Globe size={22} />
          </div>
          SECCIÓN G
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-text-muted">Monitoreo Vigiaccess</p>
          <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-medium border border-primary-100">
            IFA: {ifa || "No definido"}
          </span>
        </div>
      </div>

      <Accordion title="1. Procesamiento de HTML Vigiaccess" defaultOpen={true}>
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>Instrucciones:</strong> Copia el código HTML de la tabla de "Adverse drug reactions (ADRs)" desde Vigiaccess. 
            Asegúrate de copiar los elementos que contienen los SOC. El sistema limpiará los caracteres invisibles automáticamente.
          </div>
          
          <Field label="Código HTML Vigiaccess">
            <textarea
              className="w-full min-h-[160px] p-4 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-y shadow-inner"
              placeholder='<span dtid="dashboard-socrow">...</span>'
              value={vigiaccessData.htmlInput}
              onChange={(e) => setVigiaccessData(prev => ({ ...prev, htmlInput: e.target.value }))}
            />
          </Field>

          <div className="flex justify-end">
            <Button 
              onClick={handleProcessHTML} 
              disabled={isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2"
            >
              {isProcessing ? <><Globe size={18} className="animate-spin" /> Procesando...</> : <><Play size={18} /> Procesar HTML</>}
            </Button>
          </div>
        </div>
      </Accordion>

      {vigiaccessData.tableData.length > 0 && (
        <Accordion title="2. Tabla Comparativa (FT vs ADR)" defaultOpen={true}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
              <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                Marca manualmente la casilla de <strong>Ficha Técnica (FT)</strong> para los SOC que estén presentes en la ficha técnica del producto.
                Los SOC obtenidos de Vigiaccess ya tienen marcada su respectiva casilla. Puedes agregar filas extra manualmente.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddManualRow} 
                  variant="outline" 
                  className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm rounded-xl font-medium"
                >
                  <Plus size={16} className="mr-2" />
                  Agregar SOC Manual
                </Button>
              </div>
            </div>

            <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <DataTable
                  title=""
                  columns={columns}
                  data={sortedTableData}
                  showAddButton={false}
                  stickyActions={false}
                  rowsPerPageOptions={[50, 100]}
                  defaultRowsPerPage={50}
               />
            </div>
          </div>
        </Accordion>
      )}

      {vigiaccessData.tableData.length > 0 && (
        <Accordion title="3. Análisis de Datos" defaultOpen={true}>
          <div className="space-y-6">
            
            <div className="flex flex-col gap-4">
              
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">Instrucción:</h3>
                  <p className="text-sm text-slate-600">Describa un análisis entre la información extraída de Vigiaccess y la descrita en la ficha técnica.</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200 shadow-sm">
                  {vigiaccessData.claudeResponse && (
                    <Button
                      onClick={() => setShowIAResult(true)}
                      variant="outline"
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-9"
                    >
                      <FileText size={16} className="mr-2" />
                      Ver IA
                    </Button>
                  )}
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="h-9 text-sm px-3 rounded-md border border-slate-300 bg-white text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  >
                    {claudeApiKey && <option value="claude">Claude (Anthropic)</option>}
                    {openaiApiKey && <option value="openai">ChatGPT (OpenAI)</option>}
                  </select>
                  <Button 
                    onClick={handleAnalisisIA}
                    disabled={isAnalyzing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md border-0 transition-all hover:scale-[1.02]"
                  >
                    <Cpu size={16} className="mr-2" />
                    {isAnalyzing ? "Analizando..." : "Análisis IA"}
                  </Button>
                </div>
              </div>

              <textarea
                className="w-full min-h-[250px] p-4 text-sm bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-y shadow-sm"
                placeholder="Redacte su análisis técnico aquí..."
                value={vigiaccessData.analysisText}
                onChange={(e) => setVigiaccessData(prev => ({ ...prev, analysisText: e.target.value }))}
              />
            </div>

          </div>
        </Accordion>
      )}

      {/* Modal Lateral para ver respuesta de IA */}
      {showIAResult && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-all cursor-pointer"
          onClick={() => setShowIAResult(false)}
        >
          <div 
            className="w-full max-w-[500px] h-full bg-white shadow-2xl flex flex-col animate-slideLeft transform transition-transform duration-300 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" size={20} />
                Análisis Generado (IA)
              </h2>
              <button 
                onClick={() => setShowIAResult(false)}
                className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="prose prose-sm prose-slate max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
                {vigiaccessData.claudeResponse}
              </div>
            </div>

            <div className="p-4 border-t bg-white flex justify-end gap-3">
              <Button 
                onClick={() => copiarAlPortapapeles(vigiaccessData.claudeResponse)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 transition-colors"
              >
                <Copy size={16} /> Copiar texto
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
