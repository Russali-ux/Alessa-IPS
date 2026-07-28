import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Info, X } from "lucide-react";
import { Button } from "../../Components/ui/button";
import { fetchWithAuth, API_URL, handleResponse } from "../../services/api";

export default function SeccionH() {
  const { versionId } = useParams();
  
  const [ifaName, setIfaName] = useState("");
  const [pgxData, setPgxData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // States for toggles
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  // Síntesis del usuario
  const [sintesis, setSintesis] = useState("");
  const [lastSaved, setLastSaved] = useState(null);

  // Intentar obtener el IFA de la Sección A
  useEffect(() => {
    try {
      const storedA = sessionStorage.getItem("seccionA_formData");
      if (storedA) {
        const parsedA = JSON.parse(storedA);
        if (parsedA.ifaName) {
          setIfaName(parsedA.ifaName);
        } else if (parsedA.productName) {
          setIfaName(parsedA.productName);
        }
      }
    } catch (e) {
      console.error("Error leyendo seccionA_formData", e);
    }
  }, []);

  // Cargar datos guardados previamente de la Sección H
  useEffect(() => {
    try {
      const storedH = sessionStorage.getItem("seccionH_pgxData");
      if (storedH) {
        const parsedH = JSON.parse(storedH);
        if (parsedH.sintesis) setSintesis(parsedH.sintesis);
        if (parsedH.snapshot) setPgxData(parsedH.snapshot);
      }
    } catch (e) {
      console.error("Error leyendo seccionH_pgxData", e);
    }
  }, []);

  const handleConsultar = async () => {
    if (!ifaName || ifaName.trim() === "") {
      setError("Por favor, ingresa un IFA válido para consultar.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = `${API_URL}/integrations/pgx/annotations?drug=${encodeURIComponent(ifaName.trim())}`;
      
      const response = await fetchWithAuth(url);
      const data = await handleResponse(response);
      
      setPgxData(data);
      // Save snapshot immediately to draft
      guardarEnBorrador(data, sintesis);
      // Auto open panel if there are results
      if (data && (data.annotationsCount > 0 || data.genesAssociated?.length > 0)) {
         setIsPanelOpen(true);
      }

    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al consultar la API de ClinPGx.");
    } finally {
      setLoading(false);
    }
  };

  const guardarEnBorrador = (snapshot, text) => {
    const draftData = {
      sintesis: text,
      snapshot: snapshot
    };
    sessionStorage.setItem("seccionH_pgxData", JSON.stringify(draftData));
    
    // Format to date instead of time, as requested
    const today = new Date();
    const dateStr = today.toLocaleDateString();
    setLastSaved(dateStr);
  };

  const handleSintesisChange = (e) => {
    const val = e.target.value;
    setSintesis(val);
    guardarEnBorrador(pgxData, val);
  };

  // Helper para estrellas según nivel de evidencia
  const renderStars = (level) => {
    let count = 0;
    if (level.includes('1A') || level.toLowerCase().includes('required')) count = 5;
    else if (level.includes('1B') || level.toLowerCase().includes('recommended')) count = 4;
    else if (level.includes('2A') || level.toLowerCase().includes('actionable')) count = 3;
    else if (level.includes('2B') || level.toLowerCase().includes('informative')) count = 2;
    else if (level.includes('3') || level.includes('4') || level.toLowerCase().includes('no clinical')) count = 1;

    if (count === 0) return <span className="text-gray-400">N/A</span>;
    return (
      <div className="flex text-amber-400">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={i < count ? "text-amber-500" : "text-gray-200"}>★</span>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2">
              Módulo de Monitoreo Farmacogenómico (ClinPGx)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Consulta en tiempo real la evidencia farmacogenómica asociada al IFA y redacta una síntesis clínica para el IPS.
            </p>
            
            <div className="flex items-center gap-4 mt-2">
              <div className="flex-1 max-w-sm">
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Fármaco a consultar (IFA)</label>
                <input 
                  type="text" 
                  value={ifaName}
                  onChange={(e) => setIfaName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ej. Palbociclib"
                />
              </div>
              <div className="mt-5">
                <Button 
                  onClick={handleConsultar} 
                  disabled={loading || !ifaName}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Consultar ClinPGx
                </Button>
              </div>
              <div className="mt-5 ml-auto">
                <Button
                  onClick={() => setIsInfoOpen(true)}
                  variant="outline"
                  className="flex items-center gap-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                  title="Información de Niveles PGx"
                >
                  <Info size={16} />
                  PGx Level
                </Button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL SINGLE COLUMN */}
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            Detalle de Hallazgos
          </h3>
          
          {!pgxData && !loading && !error && (
            <div className="text-center py-10 text-gray-500 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <div className="inline-flex p-4 bg-gray-100 rounded-full mb-3">
                <RefreshCw size={24} className="text-gray-400" />
              </div>
              <p>Presiona "Consultar ClinPGx" para obtener datos.</p>
            </div>
          )}
          
          {pgxData && (
            <>
              {pgxData.annotations?.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200 mb-4">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                      <tr>
                        <th className="px-4 py-3">Gen</th>
                        <th className="px-4 py-3">Fenotipo</th>
                        <th className="px-4 py-3">Nivel</th>
                        <th className="px-4 py-3">Recomendación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pgxData.annotations.slice(0, 10).map((ann, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{ann.gene}</td>
                          <td className="px-4 py-3 text-xs">{ann.phenotype}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${
                              ann.evidence?.includes('Testing Required') ? 'bg-red-600 text-white' :
                              ann.evidence?.includes('Testing Recommended') ? 'bg-amber-500 text-white' :
                              ann.evidence?.includes('Actionable PGx') ? 'bg-emerald-500 text-white' :
                              ann.evidence?.includes('Informative PGx') ? 'bg-blue-500 text-white' :
                              ann.evidence?.includes('No Clinical PGx') ? 'bg-cyan-500 text-white' :
                              ann.evidence?.includes('Criteria Not Met') ? 'bg-gray-200 text-gray-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {ann.evidence}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs" title={ann.recommendation}>
                            {ann.recommendation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pgxData.annotations.length > 10 && (
                    <div className="p-3 bg-gray-50 text-center text-xs text-gray-500 border-t">
                      Mostrando 10 de {pgxData.annotations.length} anotaciones.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200 mb-4">
                  No hay anotaciones detalladas para mostrar.
                </div>
              )}

              {/* PANEL DE EVIDENCIA CONTRAÍBLE */}
              <div className="border border-indigo-100 rounded-lg overflow-hidden">
                <button 
                  onClick={() => setIsPanelOpen(!isPanelOpen)}
                  className="w-full bg-indigo-50/50 hover:bg-indigo-50 px-4 py-3 flex items-center justify-between text-indigo-900 font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <AlertCircle size={18} className="text-indigo-600" />
                    Panel de Evidencia y Resumen Histórico
                  </span>
                  {isPanelOpen ? <ChevronDown size={20} className="text-indigo-400" /> : <ChevronRight size={20} className="text-indigo-400" />}
                </button>
                
                {isPanelOpen && (
                  <div className="p-4 bg-white border-t border-indigo-50 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Genes Asociados</p>
                        <p className="text-xl font-bold text-slate-800">{pgxData.genesAssociated?.length || 0}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Anotaciones</p>
                        <p className="text-xl font-bold text-slate-800">{pgxData.annotationsCount || 0}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Label FDA</p>
                        <p className="text-sm font-bold text-slate-800">{pgxData.labelFDA ? 'Sí' : 'No'}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wide">Evidencia Máx</p>
                        <div className="mt-1">{renderStars(pgxData.maxEvidence)}</div>
                        <p className="text-xs text-slate-600 mt-1">Nivel {pgxData.maxEvidence}</p>
                      </div>
                    </div>

                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                      <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                        Resumen de Cambios (Histórico)
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-2">
                        <li className="flex justify-between items-center bg-white p-2 rounded shadow-sm border border-blue-50/50">
                          <span>Nuevos genes asociados</span>
                          <span className="font-bold text-green-600">+0</span>
                        </li>
                        <li className="flex justify-between items-center bg-white p-2 rounded shadow-sm border border-blue-50/50">
                          <span>Nuevas anotaciones clínicas</span>
                          <span className="font-bold text-slate-600">0</span>
                        </li>
                      </ul>
                      <p className="text-xs text-blue-700/80 mt-3 italic">
                        * Comparado contra el último snapshot local.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">Análisis Farmacogenético</h3>
            {lastSaved && (
              <div className="flex items-center gap-1.5 text-xs text-gray-300 opacity-60 hover:opacity-100 transition-opacity">
                <CheckCircle2 size={12} />
                Guardado el {lastSaved}
              </div>
            )}
          </div>
          
          <textarea
            className="w-full h-64 p-4 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y transition-shadow"
            placeholder="Escribe aquí la síntesis sobre las interacciones farmacogenómicas, cambios respecto a versiones anteriores y recomendaciones clínicas..."
            value={sintesis}
            onChange={handleSintesisChange}
          ></textarea>
          
          <p className="text-xs text-gray-500 mt-3">
            Recuerda revisar la Ficha Técnica (FT) actualizada del producto para encontrar discrepancias o nueva información y realizar el monitoreo de literatura. Esta síntesis quedará registrada de manera permanente.
          </p>
        </div>
      </div>

      {/* PGX LEVEL LATERAL BAR (OVERLAY) */}
      {isInfoOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsInfoOpen(false)}></div>
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">PGx Level</h2>
              <button onClick={() => setIsInfoOpen(false)} className="text-gray-500 hover:text-gray-800">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-gray-700">
              
              <div>
                <span className="inline-block bg-red-600 text-white font-semibold px-2 py-1 rounded text-xs mb-2">Testing Required</span>
                <p>La etiqueta indica o implica que, antes de usar este medicamento, se debe realizar algún tipo de prueba genética, proteica o cromosómica, incluyendo análisis genéticos, ensayos funcionales de proteínas, estudios citogenéticos, etc., sobre el gen o producto génico mencionado en la anotación. Este requisito puede aplicarse únicamente a un subgrupo específico de pacientes. Si la etiqueta indica que se "debería" realizar una prueba, se interpreta como una prueba obligatoria.</p>
              </div>

              <div>
                <span className="inline-block bg-amber-500 text-white font-semibold px-2 py-1 rounded text-xs mb-2">Testing Recommended</span>
                <p>La etiqueta indica o implica que se recomienda realizar algún tipo de prueba genética, proteica o cromosómica, incluyendo pruebas genéticas, ensayos funcionales de proteínas, estudios citogenéticos, etc., sobre el gen o producto génico mencionado en la anotación antes de usar este medicamento. Esta recomendación puede aplicarse únicamente a un subgrupo específico de pacientes. ClinPGx considera que las etiquetas que indican que se "debería considerar" realizar pruebas o "considerar la genotipificación o fenotipificación" constituyen una recomendación para realizar dichas pruebas.</p>
              </div>

              <div>
                <span className="inline-block bg-emerald-500 text-white font-semibold px-2 py-1 rounded text-xs mb-2">Actionable PGx</span>
                <p>La etiqueta incluye información sobre ajustes de dosis, contraindicaciones, recomendaciones de medicamentos alternativos u otras indicaciones para pacientes con un genotipo o fenotipo metabólico específico, si se conoce. Sin embargo, la etiqueta no exige ni recomienda realizar pruebas de genotipo o fenotipo antes de usar el medicamento.</p>
                <p className="mt-2 opacity-80 text-xs">Los criterios para la farmacogenómica procesable se actualizaron en agosto de 2024: las etiquetas de la FDA, la EMA y el HCSC que anteriormente se clasificaban como farmacogenómica procesable pero no incluían información para la prescripción, se reclasificaron como farmacogenómica informativa. Esta actualización no se aplicó a las anotaciones de las etiquetas suizas y japonesas.</p>
              </div>

              <div>
                <span className="inline-block bg-blue-500 text-white font-semibold px-2 py-1 rounded text-xs mb-2">Informative PGx</span>
                <p>La etiqueta contiene información sobre un gen, proteína, variante o fenotipo específico que puede afectar el metabolismo o la concentración del fármaco, la frecuencia de los efectos secundarios (p. ej., carvedilol) o el riesgo general para el paciente (p. ej., avatrombopag), sin ofrecer más indicaciones sobre cómo actuar en esta situación. Un médico puede considerar útil esta información (p. ej., evitando el fármaco en esa población de pacientes), pero la etiqueta no proporciona ninguna indicación al respecto.</p>
                <p className="mt-2 opacity-80 text-xs">Los criterios para la farmacogenómica informativa se actualizaron en agosto de 2024: las etiquetas de la FDA, la EMA y el HCSC que anteriormente se clasificaban como farmacogenómicas procesables pero carecían de información para la prescripción, se reclasificaron como farmacogenómicas informativas. Las etiquetas de la FDA, la EMA y el HCSC que anteriormente se clasificaban como farmacogenómicas informativas pasaron a clasificarse como "Sin farmacogenómica clínica". Esta actualización no se aplicó a las anotaciones de las etiquetas suizas y japonesas.</p>
              </div>

              <div>
                <span className="inline-block bg-cyan-500 text-white font-semibold px-2 py-1 rounded text-xs mb-2">No Clinical PGx</span>
                <p>La etiqueta contiene información que indica que ciertos genes, proteínas, variantes o fenotipos metabólicos no afectan la eficacia, la dosis, el metabolismo ni la toxicidad del medicamento. O bien, la etiqueta indica que ciertas variantes o fenotipos sí afectan la eficacia, la dosis, el metabolismo o la toxicidad del medicamento, pero este efecto no es clínicamente significativo.</p>
                <p className="mt-2 opacity-80 text-xs">Este nivel de farmacogenómica (PGx) se creó en agosto de 2024: las etiquetas de la FDA, la EMA y el HCSC que anteriormente se clasificaban como farmacogenómicas informativas pasaron a clasificarse como "Sin farmacogenómica clínica". Esta actualización no se aplicó a las etiquetas suizas y japonesas.</p>
              </div>

              <div>
                <span className="inline-block bg-gray-200 text-gray-700 font-semibold px-2 py-1 rounded text-xs mb-2">Criteria Not Met</span>
                <p>La etiqueta no cumple los criterios para otros niveles de PGx. ClinPGx anota todas las etiquetas que aparecen en la lista de biomarcadores de la FDA, independientemente de si las anotaríamos de otro modo, y luego consulta las bases de datos de la Agencia Europea de Medicamentos (EMA) y Health Canada/Santé Canada (HCSC) para la misma etiqueta del medicamento. Muchas etiquetas que aparecen en la lista de biomarcadores de la FDA (o etiquetas equivalentes de otras agencias reguladoras) no cumplen los criterios para otros niveles de PGx y, por lo tanto, se les asigna el estado "Criterios no cumplidos".</p>
              </div>

              <div className="pt-4 border-t border-gray-200 text-center">
                <a href="https://www.clinpgx.org/page/drugLabelLegend" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center justify-center gap-1">
                  Ver definiciones oficiales en ClinPGx <Info size={14}/>
                </a>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
