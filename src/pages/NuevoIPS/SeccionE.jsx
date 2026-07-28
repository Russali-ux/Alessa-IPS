import React, { useState, useEffect } from "react";
import { usePersistedState } from "../../hooks/usePersistedState";
import { useToast } from "../../contexts/ToastContext";
import { Accordion } from "../../Components/ui/Accordion";
import { Input } from "../../Components/ui/input";
import { Button } from "../../Components/ui/button";
import DataTable from "../../Components/DataTable";
import { Upload, ClipboardList, Download, Copy, Trash2, Cpu, X, BookOpen } from "lucide-react";
import { zoteroService } from "../../services/zotero.service";
import { FLASK_API_URL } from "../../services/api";
import ZoteroExplorerModal from "../../Components/Zotero/ZoteroExplorerModal";

const Field = ({ label, children }) => (
  <div className="w-full">
    <label className="block text-sm font-medium mb-1.5 text-text-main">{label}</label>
    {children}
  </div>
);

export default function SeccionE() {
  const { showToast } = useToast();
  
  // 1. Inicialización perezosa (Lazy Init) para evitar pérdida de datos al montar
  const [ifa, setIfa] = useState(() => {
    const saved = sessionStorage.getItem("seccionA_formData");
    if (saved) {
      try { return JSON.parse(saved).ifaName || ""; } catch(e) { return ""; }
    }
    return "";
  });

  const [indicacionesList, setIndicacionesList] = useState(() => {
    const saved = sessionStorage.getItem("seccionA_formData");
    if (saved) {
      try { return JSON.parse(saved).indicacionesList || []; } catch(e) { return []; }
    }
    return [];
  });

  const [analyses, setAnalyses] = usePersistedState("seccionE_analyses", {});
  const claudeApiKey = localStorage.getItem("claude_api_key") || "";
  const openaiApiKey = localStorage.getItem("openai_api_key") || "";
  const [aiProvider, setAiProvider] = useState(claudeApiKey ? "claude" : (openaiApiKey ? "openai" : "claude"));
  const [analysisProgress, setAnalysisProgress] = useState({ isAnalyzing: false, current: 0, total: 0, indicacionIndex: null });
  const [selectedClaudeResponse, setSelectedClaudeResponse] = useState(null);

  // Zotero states
  const [isZoteroConnected, setIsZoteroConnected] = useState(false);
  const [isZoteroModalOpen, setIsZoteroModalOpen] = useState(false);
  const [zoteroTargetIndex, setZoteroTargetIndex] = useState(null);

  useEffect(() => {
    // Check Zotero connection status
    zoteroService.getStatus().then(status => {
      setIsZoteroConnected(status.connected);
    }).catch(() => setIsZoteroConnected(false));
  }, []);

  // 2. Sincronizar IFA e Indicaciones si el usuario vuelve a la pestaña (opcional pero recomendado)
  useEffect(() => {
    const checkSession = () => {
      const savedSeccionA = sessionStorage.getItem("seccionA_formData");
      if (savedSeccionA) {
        try {
          const parsedA = JSON.parse(savedSeccionA);
          if (parsedA.ifaName !== ifa) setIfa(parsedA.ifaName || "");
          // Nota: La comparación de arrays es más compleja, pero esto ayuda a mantener sincronía básica
          if (JSON.stringify(parsedA.indicacionesList) !== JSON.stringify(indicacionesList)) {
            setIndicacionesList(parsedA.indicacionesList || []);
          }
        } catch (e) {}
      }
    };

    window.addEventListener('focus', checkSession);
    return () => window.removeEventListener('focus', checkSession);
  }, [ifa, indicacionesList]);

  // 3. Guardar análisis en sessionStorage cuando cambien (ya manejado por el hook)

  const handleFileUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyses(prev => ({
      ...prev,
      [index]: { ...prev[index], isUploading: true }
    }));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${FLASK_API_URL}/convert`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      
      if (data.error) {
        alert("Error: " + data.error);
        return;
      }
      
      const processedData = data.csvData.map((row, idx) => ({
        ...row,
        _id: `${index}_${Date.now()}_${idx}`, // ID único combinando indicación, timestamp y fila
        inclusion: "N/A"
      }));
      
      setAnalyses(prev => {
        const existingData = prev[index]?.data || [];
        return {
          ...prev,
          [index]: { data: [...existingData, ...processedData], isUploading: false }
        };
      });
    } catch (error) {
      console.error("Error al subir archivo:", error);
      alert("Error de conexión con el servidor Python. Verifica que app.py esté corriendo y accesible.");
      setAnalyses(prev => ({
        ...prev,
        [index]: { ...prev[index], isUploading: false }
      }));
    } finally {
      e.target.value = ""; // Reset input para permitir subir el mismo archivo de nuevo
    }
  };

  const handleZoteroImport = (importedRows) => {
    if (zoteroTargetIndex === null) return;
    
    setAnalyses(prev => {
      const existingData = prev[zoteroTargetIndex]?.data || [];
      return {
        ...prev,
        [zoteroTargetIndex]: { data: [...existingData, ...importedRows], isUploading: false }
      };
    });
    
    showToast(`✅ ${importedRows.length} elementos de Zotero importados exitosamente.`);
  };

  const handleInclusionChange = (index, rowId, newValue) => {
    setAnalyses(prev => {
      const currentData = prev[index]?.data || [];
      const newData = currentData.map(row => {
        if (row._id === rowId) {
          const updatedRow = { ...row, inclusion: newValue };
          if (newValue !== "excluido") {
            updatedRow.motivoExclusion = "";
          }
          return updatedRow;
        }
        return row;
      });
      return {
        ...prev,
        [index]: { ...prev[index], data: newData }
      };
    });
  };

  const handleMotivoChange = (index, rowId, newMotivo) => {
    setAnalyses(prev => {
      const currentData = prev[index]?.data || [];
      const newData = currentData.map(row => 
        row._id === rowId ? { ...row, motivoExclusion: newMotivo } : row
      );
      return {
        ...prev,
        [index]: { ...prev[index], data: newData }
      };
    });
  };

  const limpiarRegistros = (index) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar todos los registros para esta indicación?")) {
      setAnalyses(prev => ({
        ...prev,
        [index]: { ...prev[index], data: [] }
      }));
    }
  };

  const copiarAlPortapapeles = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      alert("✅ Prompt copiado al portapapeles. ¡Pégalo en Claude/ChatGPT!");
    } catch (err) {
      alert("❌ Error al copiar");
    }
  };

  const getPromptText = (row, currentIndicacion) => {
    if (!ifa || !currentIndicacion) return null;
    return `Para el artículo con PMID: ${row.PMID || 'N/A'}, titulado "${row.TI || 'N/A'}", disponible en: ${row.URL || 'N/A'}

Indica si evalúa la eficacia y/o seguridad de ${ifa} en ${currentIndicacion}.

Responder en español:

Si SÍ evalúa:
1. Tipo de estudio
2. Objetivo, población y brazos de tratamiento (colocalo en tiempo pasado)
3. Lista de resultados con sus datos numéricos por cada outcome medido (a modo de párrafo resumido)
4. Qué se puede concluir del estudio

Si NO evalúa:
- Indicar exclusión + motivo

Abstract:
${row.AB || 'N/A'}`;
  };

  const generarPromptIndividual = (row, currentIndicacion) => {
    const prompt = getPromptText(row, currentIndicacion);
    if (prompt) copiarAlPortapapeles(prompt);
    else alert("⚠️ No se ha detectado IFA o Indicación. Verifica la Sección A.");
  };

  const generarPromptGlobal = (index, currentIndicacion) => {
    if (!ifa || !currentIndicacion) {
      alert("⚠️ Error en IFA o Indicación");
      return;
    }

    const tableData = analyses[index]?.data || [];
    const incluidos = tableData.filter(row => row.inclusion === "incluido");
    if (incluidos.length === 0) {
      alert("⚠️ No hay artículos marcados como 'Incluido'");
      return;
    }

    const abstracts = incluidos.map(row => row.AB).filter(ab => ab && ab.trim() !== "");
    
    if (abstracts.length === 0) {
      alert("⚠️ Los artículos incluidos no tienen Abstracts disponibles.");
      return;
    }

    const abstractsTexto = abstracts.join("\n\n");

    const prompt = `${abstractsTexto}

La siguiente información contiene estudios que evaluaron la eficacia de ${ifa} para ${currentIndicacion}, Elabora una respuesta que responda las siguientes preguntas:

Conteniendo una respuesta para cada uno de los siguientes puntos, listando (coloca en formato de párrafo cada una de las respuestas de los numerales A-H)

A- integración de la información de referencia sobre los beneficios del producto farmacéutico  
B- evaluación de los aspectos que apoyan la evidencia  
C- limitaciones de las mismas sobre la eficacia/efectividad  

Así mismo crea una segunda respuesta listando:

D- importancia clínica del tamaño del efecto  
E- generalización de la respuesta al tratamiento en la población general (mencionar qué tipo de población se estudió en los ensayos)  
F- existe relación dosis-respuesta, de ser así qué se puede concluir  
G- cuál es la duración del efecto  
H- cuál es la conclusión de la eficacia comparativa con otros fármacos (con qué fármacos se ha comparado y qué se puede concluir)  

Así mismo crea una tercera respuesta listando:

I- cuáles fueron los beneficios (outcomes) importantes identificados e indica los datos de los resultados obtenidos  
J- certeza de la evidencia  
K- impacto de los beneficios  
L- riesgos identificados y su impacto`;

    copiarAlPortapapeles(prompt);
  };

  const analizarTodos = async (index, currentIndicacion) => {
    if (aiProvider === "claude" && !claudeApiKey) {
      alert("No hay API Key configurada para Claude en la pestaña Configuración IA.");
      return;
    }
    if (aiProvider === "openai" && !openaiApiKey) {
      alert("No hay API Key configurada para OpenAI en la pestaña Configuración IA.");
      return;
    }

    const tableData = analyses[index]?.data || [];
    if (tableData.length === 0) return;

    setAnalysisProgress({ isAnalyzing: true, current: 0, total: tableData.length, indicacionIndex: index });

    let updatedData = [...tableData];
    
    for (let i = 0; i < updatedData.length; i++) {
      const row = updatedData[i];
      setAnalysisProgress(prev => ({ ...prev, current: i + 1 }));
      
      if (row.claudeResponse) continue; // No re-analizar si ya tiene respuesta

      const prompt = getPromptText(row, currentIndicacion);
      if (!prompt) {
        alert("⚠️ No se ha detectado IFA o Indicación. Verifica la Sección A.");
        break; // Detener el bucle si no hay IFA
      }

      try {
        const endpoint = aiProvider === "claude" ? `${FLASK_API_URL}/api/claude` : `${FLASK_API_URL}/api/openai`;
        const keyToUse = aiProvider === "claude" ? claudeApiKey : openaiApiKey;
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: keyToUse, prompt: prompt })
        });
        
        if (!response.ok) {
          const errText = await response.text();
          console.error("Error API:", errText);
          alert(`Error de API en el artículo ${i+1}: ${errText}`);
          break; // Detener el bucle si hay error (ej. API Key inválida, límite de rate)
        }

        const data = await response.json();
        if (data.response) {
          updatedData[i] = { ...updatedData[i], claudeResponse: data.response };
          setAnalyses(prev => ({
            ...prev,
            [index]: { ...prev[index], data: [...updatedData] }
          }));
        } else {
          alert(`La API no devolvió una respuesta válida para el artículo ${i+1}.`);
          console.error("Data sin response:", data);
          break;
        }
      } catch (err) {
        console.error("Error al llamar a la IA:", err);
        alert(`Error de red en el artículo ${i+1}. ¿Está el backend (Python) ejecutándose en el puerto 5000?`);
        break;
      }
    }
    
    setAnalysisProgress({ isAnalyzing: false, current: 0, total: 0, indicacionIndex: null });
    // Solo mostramos completado si todos fueron procesados o ya tenían respuesta
    const procesados = updatedData.filter(r => r.claudeResponse).length;
    showToast(`Análisis finalizado. Procesados: ${procesados}/${updatedData.length}`);
  };

  const descargarCSV = (index, currentIndicacion) => {
    const tableData = analyses[index]?.data || [];
    if (tableData.length === 0) return;
    
    const headers = ["PMID", "TI", "AU", "YYYY", "MMM", "AB", "JT", "PT", "DP", "DOI", "URL", "Inclusión"];
    const rows = tableData.map(row => [
      row.PMID || "N/A",
      row.TI || "N/A",
      row.AU || "N/A",
      row.YYYY || "N/A",
      row.MMM || "N/A",
      row.AB || "N/A",
      row.JT || "N/A",
      row.PT || "N/A",
      row.DP || "N/A",
      row.DOI || "N/A",
      row.URL || "N/A",
      row.inclusion
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(item => `"${String(item).replace(/"/g, '""').replace(/\n/g, ' ')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${fecha}_${ifa.toUpperCase() || 'IFA'}_${currentIndicacion.toUpperCase() || 'INDICACION'}.csv`;
    link.setAttribute("download", filename);
    
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para obtener las columnas de la tabla para una indicación específica
  const getColumns = (index, currentIndicacion) => [
    { key: "PMID", label: "PMID" },
    { key: "TI", label: "Título", render: (val) => <div className="min-w-[150px]">{val}</div> },
    { key: "AU", label: "Autores", render: (val) => <div className="min-w-[100px] truncate max-w-[150px]" title={val}>{val}</div> },
    { key: "YYYY", label: "Año" },
    { key: "MMM", label: "Mes" },
    { 
      key: "AB", 
      label: "Abstract",
      render: (val) => (
        <div className="max-w-[150px] truncate" title={val}>{val || "N/A"}</div>
      )
    },
    { key: "JT", label: "Revista", render: (val) => <div className="truncate max-w-[120px]" title={val}>{val}</div> },
    { key: "PT", label: "Tipo" },
    { key: "DP", label: "Fecha" },
    { key: "DOI", label: "DOI" },
    { 
      key: "URL", 
      label: "URL",
      render: (val) => val ? <a href={val} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline truncate inline-block max-w-[60px]" title={val}>Link</a> : "N/A"
    },
    {
      key: "acciones",
      label: "Análisis",
      filterable: false,
      render: (_, row) => (
        <div className="flex flex-col gap-1.5 min-w-[80px]">
          <Button 
            variant="default" 
            size="sm" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7 py-0 px-2 w-full"
            onClick={() => generarPromptIndividual(row, currentIndicacion)}
            title="Copiar Prompt"
          >
            <Copy size={12} className="mr-1" /> Prompt
          </Button>
          {row.claudeResponse && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 py-0 px-2 text-xs border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-bold w-full"
              onClick={() => setSelectedClaudeResponse(row)}
            >
              Ver IA
            </Button>
          )}
        </div>
      )
    },
    {
      key: "inclusion",
      label: "Inclusión",
      filterable: false,
      render: (val, row) => (
        <div className="flex flex-col gap-2 min-w-[140px]">
          <select
            className="h-8 text-xs px-2 rounded-md border border-border bg-surface text-text-main focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            value={val || "N/A"}
            onChange={(e) => handleInclusionChange(index, row._id, e.target.value)}
          >
            <option value="N/A">N/A</option>
            <option value="incluido">Incluido</option>
            <option value="excluido">Excluido</option>
          </select>
          {val === "excluido" && (
            <input
              type="text"
              placeholder="Motivo de exclusión..."
              className="h-8 text-xs px-2 rounded-md border border-border bg-surface text-text-main focus:border-red-400 focus:ring-2 focus:ring-red-400/20 outline-none transition-all"
              value={row.motivoExclusion || ""}
              onChange={(e) => handleMotivoChange(index, row._id, e.target.value)}
            />
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 max-w-[95%] mx-auto pb-24">
      {/* TÍTULO PRINCIPAL */}
      <div>
        <h1 className="text-2xl font-bold text-text-main uppercase tracking-tight">SECCIÓN E</h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-text-muted">Análisis Beneficio Riesgo</p>
          <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-medium border border-primary-100">
            IFA: {ifa || "No definido"}
          </span>
        </div>
      </div>

      {indicacionesList.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center shadow-sm">
          <div className="bg-primary-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="text-primary-600" size={32} />
          </div>
          <h2 className="text-xl font-semibold text-text-main">No hay indicaciones registradas</h2>
          <p className="text-text-muted mt-2 max-w-md mx-auto">
            Por favor, ve a la <strong>Sección A.3</strong> y registra al menos una indicación para comenzar el análisis.
          </p>
          <Button 
            className="mt-6" 
            variant="outline"
            onClick={() => window.location.hash = "#/app/ips/new/a"} // Fallback simple para navegación
          >
            Ir a Sección A
          </Button>
        </div>
      ) : (
        indicacionesList.map((item, index) => {
          const currentAnalysis = analyses[index] || { data: [], isUploading: false };
          const tableData = currentAnalysis.data || [];
          const isUploading = currentAnalysis.isUploading;

          return (
            <div key={index} className="space-y-6 border-b border-border pb-12 last:border-0">
              <div className="flex items-center gap-4">
                <div className="bg-primary-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-primary-200">
                  {index + 1}
                </div>
                <h2 className="text-xl font-bold text-text-main">
                  E.1 Análisis Beneficio Riesgo - {item.indicacion || `Indicación #${index + 1}`}
                </h2>
              </div>

              <Accordion title="Configuración de Análisis y Carga" defaultOpen={true}>
                <div className="space-y-6">
                  {/* Info Row (Read Only) */}
                  <div className="flex flex-col gap-4 p-5 border border-border rounded-xl bg-surface shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field label="Nombre IFA (Automático)">
                        <div className="h-10 px-3 flex items-center bg-surface-hover border border-border rounded-lg text-text-muted font-medium italic">
                          {ifa || "Pendiente definir en Sección A"}
                        </div>
                      </Field>
                      <Field label="Indicación (Automático)">
                        <div className="h-10 px-3 flex items-center bg-surface-hover border border-border rounded-lg text-text-muted font-medium italic">
                          {item.indicacion || "Pendiente definir en Sección A"}
                        </div>
                      </Field>
                    </div>
                    
                    <div className="mt-4 space-y-4">
                      <Field label="Estrategia de búsqueda">
                        <textarea
                          className="w-full min-h-[100px] p-3 text-sm bg-white border border-border rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-y"
                          placeholder="Ingresa la estrategia de búsqueda..."
                          value={currentAnalysis.estrategiaBusqueda || ""}
                          onChange={(e) => {
                            setAnalyses(prev => ({
                              ...prev,
                              [index]: { ...prev[index], estrategiaBusqueda: e.target.value }
                            }));
                          }}
                        />
                      </Field>
                      
                      <label className="flex items-center gap-2 cursor-pointer w-max">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
                          checked={currentAnalysis.sinResultados || false}
                          onChange={(e) => {
                            setAnalyses(prev => ({
                              ...prev,
                              [index]: { ...prev[index], sinResultados: e.target.checked }
                            }));
                          }}
                        />
                        <span className="text-sm font-medium text-text-main">
                          No se encontraron resultados para esta estrategia
                        </span>
                      </label>
                    </div>

                    <div className="flex justify-end mt-2">
                      <Button
                        variant="outline"
                        className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 shadow-sm"
                        onClick={() => {
                          if (!ifa || !item.indicacion) {
                            alert("⚠️ Faltan datos de IFA o Indicación para generar el prompt.");
                            return;
                          }
                          const prompt = `elabora una estrategia de busqueda PICO para pubmed que evalue la eficacia de ${ifa} en ${item.indicacion}`;
                          copiarAlPortapapeles(prompt);
                        }}
                      >
                        <Copy size={16} className="mr-2" /> Búsqueda PICO
                      </Button>
                    </div>
                  </div>

                  {/* Upload / Import Area */}
                  <div className="flex flex-col md:flex-row items-center gap-4 p-5 border border-border border-dashed rounded-xl bg-surface-hover">
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-main italic">Agregar Literatura de Referencia</h3>
                      <p className="text-xs text-text-muted mt-1">Específico para esta indicación.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isZoteroConnected && (
                        <Button 
                          disabled={isUploading} 
                          onClick={() => {
                            setZoteroTargetIndex(index);
                            setIsZoteroModalOpen(true);
                          }}
                          className="bg-[#CC0000] hover:bg-[#AA0000] text-white shadow-sm hover:scale-[1.02] transition-transform"
                        >
                          <BookOpen size={16} className="mr-2" /> Importar de Zotero
                        </Button>
                      )}

                      <div className="relative overflow-hidden inline-block">
                        <Button disabled={isUploading} className="relative z-0" variant={isZoteroConnected ? "outline" : "default"}>
                          {isUploading ? "Procesando..." : <><Upload size={16} className="mr-2" /> Subir Archivo (.nbib, .ris)</>}
                        </Button>
                        <input
                          type="file"
                          accept=".nbib,.ris"
                          onChange={(e) => handleFileUpload(e, index)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          disabled={isUploading}
                          title="Subir archivo"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Accordion>

              {tableData.length > 0 && (
                <Accordion title={`E.2 Resultados de Búsqueda - ${item.indicacion || index + 1}`} defaultOpen={true}>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        {(claudeApiKey || openaiApiKey) && (
                          <div className="flex items-center gap-2 bg-surface-hover p-1 rounded-lg border border-border">
                            <select
                              value={aiProvider}
                              onChange={(e) => setAiProvider(e.target.value)}
                              className="h-9 text-sm px-3 rounded-md border border-border bg-white text-text-main focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                              disabled={analysisProgress.isAnalyzing && analysisProgress.indicacionIndex === index}
                            >
                              {claudeApiKey && <option value="claude">Claude (Anthropic)</option>}
                              {openaiApiKey && <option value="openai">ChatGPT (OpenAI)</option>}
                            </select>
                            <Button 
                              onClick={() => analizarTodos(index, item.indicacion)} 
                              disabled={analysisProgress.isAnalyzing && analysisProgress.indicacionIndex === index}
                              className={`text-white border-0 shadow-md transition-all ${
                                analysisProgress.isAnalyzing && analysisProgress.indicacionIndex === index 
                                ? "bg-emerald-400 cursor-not-allowed" 
                                : "bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02]"
                              }`}
                            >
                              <Cpu size={16} className="mr-2" />
                              {analysisProgress.isAnalyzing && analysisProgress.indicacionIndex === index 
                                ? `Analizando (${analysisProgress.current}/${analysisProgress.total})...`
                                : "Analizar Todos"}
                            </Button>
                          </div>
                        )}
                        <Button 
                          onClick={() => generarPromptGlobal(index, item.indicacion)} 
                          className="bg-primary-600 hover:bg-primary-700 text-white border-0 shadow-md transition-all hover:scale-[1.02]"
                        >
                          <ClipboardList size={16} className="mr-2" />
                          Análisis Global
                        </Button>
                        <Button 
                          onClick={() => descargarCSV(index, item.indicacion)} 
                          variant="outline" 
                          className="bg-surface hover:bg-surface-hover"
                        >
                          <Download size={16} className="mr-2" />
                          Exportar CSV
                        </Button>
                        <Button 
                          onClick={() => limpiarRegistros(index)} 
                          variant="outline" 
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Limpiar
                        </Button>
                      </div>
                      <p className="text-sm text-text-muted bg-surface-hover px-3 py-1 rounded-md border border-border">
                        Registros: <strong>{tableData.length}</strong>
                      </p>
                    </div>

                    <div className="w-full">
                      <DataTable
                        title="Artículos Procesados"
                        columns={getColumns(index, item.indicacion)}
                        data={tableData}
                        showAddButton={false}
                        hiddenColumns={["MMM", "JT", "PT", "DP"]} // Manteniendo la lógica anterior de ocultar estas columnas
                      />
                    </div>
                  </div>
                </Accordion>
              )}
            </div>
          );
        })
      )}
      
      {/* Modal Lateral para ver respuesta de Claude */}
      {selectedClaudeResponse && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-all cursor-pointer"
          onClick={() => setSelectedClaudeResponse(null)}
        >
          <div 
            className="w-full max-w-[500px] h-full bg-white shadow-2xl flex flex-col animate-slideLeft transform transition-transform duration-300 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Cpu size={18} />
                </div>
                Resultados del Análisis IA
              </h3>
              <button onClick={() => setSelectedClaudeResponse(null)} className="p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              <div className="mb-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl shadow-sm">
                <p className="font-bold text-indigo-900 flex items-center gap-2 mb-2">
                  <ClipboardList size={16} /> Artículo Procesado
                </p>
                <p className="text-xs text-indigo-800 font-medium mb-1 line-clamp-3" title={selectedClaudeResponse.TI}>{selectedClaudeResponse.TI}</p>
                <div className="flex gap-4 mt-3 pt-3 border-t border-indigo-100/50">
                  <p className="text-xs text-indigo-600 font-mono bg-indigo-100 px-2 py-1 rounded">PMID: {selectedClaudeResponse.PMID}</p>
                </div>
              </div>
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 border-b pb-2">
                <Cpu size={16} className="text-emerald-600" /> Evaluación de Claude
              </h4>
              <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-li:my-1">
                {selectedClaudeResponse.claudeResponse}
              </div>
            </div>
            <div className="p-4 border-t border-border bg-slate-50 flex justify-end gap-3">
              <Button 
                onClick={() => copiarAlPortapapeles(selectedClaudeResponse.claudeResponse)} 
                className="bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
              >
                <Copy size={16} className="mr-2" /> Copiar Análisis
              </Button>
              <Button onClick={() => setSelectedClaudeResponse(null)} variant="outline" className="text-slate-600 border-slate-300 hover:bg-slate-100">Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Zotero Modal */}
      <ZoteroExplorerModal 
        isOpen={isZoteroModalOpen} 
        onClose={() => {
          setIsZoteroModalOpen(false);
          setZoteroTargetIndex(null);
        }} 
        onImport={handleZoteroImport} 
      />
    </div>
  );
}