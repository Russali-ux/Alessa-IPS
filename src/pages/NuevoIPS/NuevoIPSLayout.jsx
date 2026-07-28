import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import NuevoIPSSidebar from "./NuevoIPSSidebar";
import { ChevronLeft, ChevronRight, Building2, Calendar, Save, FileText, Loader2, CheckSquare } from "lucide-react";
import { Button } from "../../Components/ui/button";
import { useIPSStore } from "../../store/ipsStore";
import { useFormAdapter } from "../../hooks/useFormAdapter";
import { fetchWithAuth, API_URL, handleResponse, FLASK_API_URL } from "../../services/api";
import { buildReplacements, buildTables, buildSections } from "../../lib/ipsEngine/generator";
import { useToast } from "../../contexts/ToastContext";

const sections = [
  { id: "a", label: "Sección A" },
  { id: "b", label: "Sección B" },
  { id: "c", label: "Sección C" },
  { id: "d", label: "Sección D" },
  { id: "e", label: "Sección E" },
  { id: "f", label: "Sección F" },
  { id: "g", label: "Sección G" },
  { id: "h", label: "Farmacogenómica" },
];

export default function NuevoIPSLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { versionId } = useParams();
  
  // Store variables (para compatibilidad con componentes hijos si aún lo usan)
  const ipsObject = useIPSStore((s) => s.ipsObject);
  
  // Custom hook for backend integration
  const adapter = useFormAdapter(versionId);
  const { showToast } = useToast();

  useEffect(() => {
    const handleRecovery = () => {
      showToast("Se ha recuperado tu progreso no guardado tras el cierre de sesión.", "success");
    };
    window.addEventListener('draft-recovered', handleRecovery);
    return () => window.removeEventListener('draft-recovered', handleRecovery);
  }, [showToast]);

  // Recovery logic for header data if store is lost on refresh
  let headerInfo = {
    denominacion: "Nuevo IPS",
    fechaInicio: "",
    fcd: ""
  };

  if (!versionId && ipsObject?.meta) {
    headerInfo.denominacion = ipsObject.meta.denominacion || "Sin Denominación";
    headerInfo.fechaInicio = ipsObject.meta.fechaInicio;
    headerInfo.fcd = ipsObject.meta.fcd;
  } else {
    try {
      const storedDataStr = sessionStorage.getItem("seccionA_formData");
      if (storedDataStr) {
        const parsed = JSON.parse(storedDataStr);
        headerInfo.denominacion = parsed.productName || parsed.ifaName || "Sin Denominación";
        headerInfo.fechaInicio = parsed.fechaInicioDatos || "";
        headerInfo.fcd = parsed.fcd || "";
      }
    } catch (e) {}
  }

  
  const handleGuardar = async (status = "Borrador") => {
    if (versionId) {
      // Ya existe, simplemente actualizamos usando el adapter
      const success = await adapter.saveBorrador(status);
      if (success) {
        showToast(`Documento guardado como ${status}`);
      } else {
        alert("Error al guardar el documento");
      }
    } else {
      // Es un caso nuevo, debemos crearlo
      try {
        const workspaceId = localStorage.getItem('currentWorkspaceId');
        
        // Mapeo inicial correcto desde meta
        const metaData = ipsObject?.meta || {};
        
        const initial_data = {
            master: {
                producto: metaData.denominacion || "Nuevo IPS",
            },
            version: {
                codigoIps: "", // Que el usuario lo llene en el formulario o se autogenere
                ipsNumero: 1, // Por defecto siempre el primer IPS, el usuario puede cambiarlo
                fechaInicioDatos: metaData.fechaInicio,
                fcd: metaData.fcd,
                fechaLimite: metaData.fechaLimite
            }
        };

        const responseData = await fetchWithAuth(`${API_URL}/ips-cases`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                workspace_id: workspaceId,
                initial_data,
                status
            })
        }).then(handleResponse);

        const version = responseData.version;
        alert(`Documento creado y guardado como ${status}`);
        navigate(`/app/ips/edit/${version.id}`, { replace: true });
      } catch (error) {
        console.error("Error al crear IPS:", error);
        alert("Hubo un error al generar el documento.");
      }
    }
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return "N/A";
    
    // Si ya viene como un string en formato dd-mm-yyyy o dd/mm/yyyy
    if (typeof dateVal === 'string') {
      const match = dateVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        return `${day}-${month}-${year}`;
      }
    }

    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return String(dateVal);
    }
  };

  const handleGenerarWord = async () => {
    const seccionAStr = sessionStorage.getItem("seccionA_formData");
    if (!seccionAStr) {
      alert("Debes completar al menos la Sección A del formulario para poder generar el documento Word.");
      return;
    }

    setIsGenerating(true);
    const secA = JSON.parse(seccionAStr);

    let replacements = {};
    let tables = {};
    let sections = {};
    try {
      replacements = buildReplacements();
      tables = buildTables();
      sections = buildSections();
    } catch (e) {
      console.error("Error building replacements from engine", e);
      alert("Ocurrió un error al generar las variables del documento: " + e.message);
      setIsGenerating(false);
      return;
    }

    try {
      const response = await fetch(`${FLASK_API_URL}/api/generate-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replacements, tables, sections, templatePath: secA.templatePath })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al generar el documento.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanName = (secA.productName || "IPS").trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
      a.download = `IPS_${cleanName}_Documento.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Error al descargar el documento Word: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const basePath = versionId ? `/app/ips/edit/${versionId}` : `/app/ips/new`;

  // Encontrar el índice de la sección actual
  const getSectionPath = (id) => `${basePath}/${id}`;
  
  let currentIndex = sections.findIndex(s => getSectionPath(s.id) === location.pathname);
  if (currentIndex === -1 && location.pathname === basePath) {
    currentIndex = 0; // Por defecto a la primera sección si estamos en la raíz
  }
  
  const goToNext = () => {
    if (currentIndex < sections.length - 1) {
      navigate(getSectionPath(sections[currentIndex + 1].id));
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      navigate(getSectionPath(sections[currentIndex - 1].id));
    }
  };

  return (
    <>
      {isGenerating && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/40 backdrop-blur-md transition-all duration-300">
          <div className="bg-white/80 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-violet-100">
            <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">Generando Documento...</h3>
              <p className="text-sm text-slate-500 mt-1">Por favor espere, procesando datos e inyectando variables.</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex h-full transition-all duration-300">
        
        {/* Sidebar secundario */}
        <NuevoIPSSidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          versionId={versionId}
        />

        {/* Contenido */}
      <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
        
        {/* ENCABEZADO DE INFORMACIÓN DEL IPS */}
        <div className="bg-white px-6 py-4 border-b flex flex-wrap gap-6 items-center justify-between shadow-sm z-[60] sticky top-0">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">IPS Seleccionado</p>
                <h2 className="text-lg font-bold text-text-main leading-tight">{headerInfo.denominacion}</h2>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">Período del Documento</p>
                <p className="text-sm font-medium text-text-main">
                  {formatDate(headerInfo.fechaInicio)} — {formatDate(headerInfo.fcd)}
                </p>
              </div>
            </div>
          </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerarWord}
                disabled={isGenerating}
                className={`flex items-center gap-2 border border-primary-200 text-primary-700 bg-white rounded-lg px-4 py-2 hover:bg-primary-50 transition-all text-sm font-medium shadow-sm ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <FileText size={16} />
                Generar word
              </button>
              
              <button
                onClick={() => handleGuardar("Borrador")}
                disabled={adapter.isSaving}
                className={`flex items-center gap-2 border border-primary-200 text-primary-700 bg-white rounded-lg px-4 py-2 hover:bg-primary-50 transition-all text-sm font-medium shadow-sm ${adapter.isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Save size={16} />
                Guardar borrador
              </button>

              <button
                onClick={() => handleGuardar("Finalizado")}
                disabled={adapter.isSaving}
                className={`flex items-center gap-2 bg-primary-600 text-white rounded-lg px-6 py-2 hover:bg-primary-700 transition-all text-sm font-medium shadow-sm ${adapter.isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Finalizar
              </button>
            </div>
          </div>

        <div className="flex-1 p-6 pb-24">
          {adapter.loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              <span className="ml-3 text-text-muted font-medium">Cargando borrador...</span>
            </div>
          ) : (
            <Outlet />
          )}
        </div>

        {/* BOTONES DE NAVEGACIÓN (STICKY BOTTOM) */}
        <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t flex justify-between items-center z-10">
          <Button
            variant="outline"
            onClick={goToPrev}
            disabled={currentIndex <= 0}
            className="flex items-center gap-2 px-6"
          >
            <ChevronLeft size={18} />
            Anterior
          </Button>

          <div className="text-sm font-medium text-text-muted">
            Paso {currentIndex + 1} de {sections.length}
          </div>

          <Button
            onClick={goToNext}
            disabled={currentIndex >= sections.length - 1}
            className="flex items-center gap-2 px-6 bg-primary-600 hover:bg-primary-700"
          >
            Siguiente
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}