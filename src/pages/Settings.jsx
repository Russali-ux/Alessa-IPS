import { useState, useCallback, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  UploadCloud,
  FileSpreadsheet, 
  Database, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  RefreshCw,
  FileDown,
  Eye,
  EyeOff,
  Search,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Package,
  UserSquare,
  Cpu
} from "lucide-react";
import { Button } from "../Components/ui/button";
import { Input } from "../Components/ui/input";
import atcData from "../data/atc_data.json";
import eurdData from "../data/eurd_data.json";
import excipientesData from "../data/excipientes_prospecto_ES_1.json";
import UsersConfig from "./Config/UsersConfig";
import WorkspacesConfig from "./Config/WorkspacesConfig";
import { fetchWithAuth, API_URL, handleResponse } from "../services/api";
import ZoteroSettings from "./Config/ZoteroSettings";

export default function Settings() {
  const isMasterAdmin = window.location.pathname.startsWith('/admin');
  const [activeTab, setActiveTab] = useState(isMasterAdmin ? "workspaces" : "catalogos"); // "catalogos", "usuarios", "workspaces", "ia"

  const [claudeApiKey, setClaudeApiKey] = useState(() => localStorage.getItem("claude_api_key") || "");
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem("openai_api_key") || "");

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" }); // "success", "error"

  // Active Upload Type ("ATC", "PRODUCTOS" o "EURD")
  const [activeUploadType, setActiveUploadType] = useState(null);

  // ESTADOS ATC
  const [showLiveTable, setShowLiveTable] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [tablePage, setTablePage] = useState(1);

  // ESTADOS PRODUCTOS
  const [selectedCliente, setSelectedCliente] = useState(() => {
    const workspacesStr = localStorage.getItem('workspaces');
    const workspaces = workspacesStr ? JSON.parse(workspacesStr) : [];
    const currentWorkspaceId = localStorage.getItem('currentWorkspaceId');
    const currentWorkspace = workspaces.find(w => String(w.id) === String(currentWorkspaceId));
    
    const allClients = workspaces.map(w => ({
      id: w.code,
      empresa: { razonSocial: w.company_name || w.name },
      fv: { area: w.metadata?.fv?.area || "", direccion: w.metadata?.fv?.direccion || "" },
      plantillas: { ips: w.metadata?.plantillas?.ips || "" },
      catalogos: { productosFile: w.metadata?.catalogos?.productosFile || "" }
    }));
    
    // Si no hay workspace (ej. SuperAdmin en dashboard central), muestra todos. Si hay, filtra.
    const activeClients = currentWorkspace 
      ? allClients.filter(c => c.id === currentWorkspace.code)
      : allClients;
      
    return activeClients[0]?.id || (allClients.length > 0 ? allClients[0].id : "");
  });

  const activeClients = useMemo(() => {
    const workspacesStr = localStorage.getItem('workspaces');
    const workspaces = workspacesStr ? JSON.parse(workspacesStr) : [];
    const currentWorkspaceId = localStorage.getItem('currentWorkspaceId');
    const currentWorkspace = workspaces.find(w => String(w.id) === String(currentWorkspaceId));
    
    const allClients = workspaces.map(w => ({
      id: w.code,
      empresa: { razonSocial: w.company_name || w.name },
      fv: { area: w.metadata?.fv?.area || "", direccion: w.metadata?.fv?.direccion || "" },
      plantillas: { ips: w.metadata?.plantillas?.ips || "" },
      catalogos: { productosFile: w.metadata?.catalogos?.productosFile || "" }
    }));
    
    return currentWorkspace 
      ? allClients.filter(c => c.id === currentWorkspace.code)
      : allClients;
  }, []);
  const [productosData, setProductosData] = useState([]);
  const [showLiveTableProductos, setShowLiveTableProductos] = useState(false);
  const [tableSearchQueryProductos, setTableSearchQueryProductos] = useState("");
  const [tablePageProductos, setTablePageProductos] = useState(1);

  // ESTADOS EURD
  const [showLiveTableEURD, setShowLiveTableEURD] = useState(false);
  const [tableSearchQueryEURD, setTableSearchQueryEURD] = useState("");
  const [tablePageEURD, setTablePageEURD] = useState(1);

  // ESTADOS EXCIPIENTES
  const [showLiveTableExcipientes, setShowLiveTableExcipientes] = useState(false);
  const [tableSearchQueryExcipientes, setTableSearchQueryExcipientes] = useState("");
  const [tablePageExcipientes, setTablePageExcipientes] = useState(1);

  const itemsPerPage = 8;

  const workspacesStr = localStorage.getItem('workspaces');
  const workspaces = workspacesStr ? JSON.parse(workspacesStr) : [];
  
  const hasAdminAccess = isMasterAdmin || workspaces.some(w => w.role_code === 'SUPER_ADMIN' || w.role_code === 'WORKSPACE_ADMIN');

  // Carga dinámica del JSON de productos al cambiar de cliente
  useEffect(() => {
    const loadProductos = async () => {
      const cliente = activeClients.find(c => c.id === selectedCliente);
      if (!cliente || !cliente.catalogos?.productosFile) {
        setProductosData([]);
        return;
      }
      try {
        const modules = import.meta.glob("../data/*.json");
        const filePath = `../data/${cliente.catalogos.productosFile}`;
        if (modules[filePath]) {
          const mod = await modules[filePath]();
          setProductosData(mod.default || []);
        } else {
          setProductosData([]);
        }
      } catch (e) {
        console.error("No se pudo cargar el archivo del cliente:", e);
        setProductosData([]);
      }
    };
    loadProductos();
    setShowLiveTableProductos(false); // resetear vista
    setParsedData([]); // resetear upload en curso si cambia de tab
  }, [selectedCliente]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem("claude_api_key", claudeApiKey);
    localStorage.setItem("openai_api_key", openaiApiKey);
    setStatus({ type: "success", message: "Claves de IA guardadas correctamente." });
  };


  // Normalizador ATC
  const normalizeATC = (jsonData) => {
    return jsonData.map(row => {
      const normalizedRow = {
        atc_code: "", atc_name: "", ddd: "NA", uom: "NA", adm_r: "NA", note: "NA", TRAD: ""
      };
      Object.keys(row).forEach(key => {
        const lowerKey = key.toLowerCase().trim();
        const value = String(row[key]).trim();
        if (["atc_code", "atccode", "codigo", "código"].includes(lowerKey)) normalizedRow.atc_code = value;
        else if (["atc_name", "atcname", "nombre", "name"].includes(lowerKey)) normalizedRow.atc_name = value;
        else if (["ddd", "dosis", "dosis diaria"].includes(lowerKey)) normalizedRow.ddd = value || "NA";
        else if (["uom", "unidad", "unit"].includes(lowerKey)) normalizedRow.uom = value || "NA";
        else if (["adm_r", "adm", "via", "vía", "route"].includes(lowerKey)) normalizedRow.adm_r = value || "NA";
        else if (["note", "nota", "comentario"].includes(lowerKey)) normalizedRow.note = value || "NA";
        else if (["trad", "traduccion", "principio"].includes(lowerKey)) normalizedRow.TRAD = value;
      });
      return normalizedRow;
    }).filter(row => row.atc_code && (row.TRAD || row.atc_name));
  };

  // Normalizador PRODUCTOS
  const normalizeProductos = (jsonData) => {
    return jsonData.map(row => {
      const normalizedRow = {
        rs: "", marca: "", dci: "", dosis: "", formafarmaceutica: "",
        fabricante: "", paisdefabricacion: "", faprobacion: "", fvencimiento: "",
        estado: "", ipsdenominacion: ""
      };
      
      Object.keys(row).forEach(key => {
        const lowerKey = key.toLowerCase().replace(/[\s_.-]/g, '');
        const value = String(row[key]).trim();
        
        if (lowerKey.includes("rs") || lowerKey.includes("registro") || lowerKey.includes("sanitario") || lowerKey === "nror" || lowerKey === "nrors") normalizedRow.rs = value;
        else if (lowerKey === "marca" || lowerKey.includes("nombrecomercial") || lowerKey.includes("producto")) normalizedRow.marca = value;
        else if (lowerKey === "dci" || lowerKey.includes("principio") || lowerKey.includes("activo") || lowerKey.includes("sustancia")) normalizedRow.dci = value;
        else if (lowerKey === "dosis" || lowerKey.includes("concentracion") || lowerKey.includes("fuerza")) normalizedRow.dosis = value;
        else if (lowerKey.includes("formafarmaceutic") || lowerKey.includes("forma") || lowerKey === "ff") normalizedRow.formafarmaceutica = value;
        else if (lowerKey.includes("fabricante") || lowerKey.includes("laboratorio") || lowerKey.includes("titular")) normalizedRow.fabricante = value;
        else if (lowerKey.includes("pais") || lowerKey.includes("origen")) normalizedRow.paisdefabricacion = value;
        else if (lowerKey.includes("aprobacion") || lowerKey.includes("emision") || lowerKey.includes("autorizacion")) normalizedRow.faprobacion = value;
        else if (lowerKey.includes("vencimiento") || lowerKey.includes("caducidad") || lowerKey.includes("expiracion")) normalizedRow.fvencimiento = value;
        else if (lowerKey === "estado" || lowerKey.includes("situacion") || lowerKey.includes("condicion")) normalizedRow.estado = value;
        else if (lowerKey.includes("ips") || lowerKey.includes("denominacion")) normalizedRow.ipsdenominacion = value;
      });
      
      // Fallback si no hay cabeceras reconocidas, intentamos mapear por el orden
      if (!normalizedRow.rs && !normalizedRow.dci && !normalizedRow.marca) {
        const vals = Object.values(row);
        if (vals.length > 0) normalizedRow.rs = String(vals[0]).trim();
        if (vals.length > 1) normalizedRow.marca = String(vals[1]).trim();
        if (vals.length > 2) normalizedRow.dci = String(vals[2]).trim();
      }

      return normalizedRow;
    }).filter(row => row.rs || row.dci || row.marca);
  };

  const processFile = (fileToProcess, type) => {
    if (!fileToProcess) return;
    const fileType = fileToProcess.name.split(".").pop().toLowerCase();
    
    if (type === "EXCIPIENTES" && fileType !== "json") {
      setStatus({ type: "error", message: "Formato no soportado para excipientes (.json)." });
      return;
    } else if (type !== "EXCIPIENTES" && !["xlsx", "xls", "csv"].includes(fileType)) {
      setStatus({ type: "error", message: "Formato no soportado (.xlsx, .xls, .csv)." });
      return;
    }

    setFile(fileToProcess);
    setIsParsing(true);
    setStatus({ type: "", message: "" });
    setActiveUploadType(type);

    if (type === "ATC") setShowLiveTable(false);
    if (type === "PRODUCTOS") setShowLiveTableProductos(false);
    if (type === "EURD") setShowLiveTableEURD(false);
    if (type === "EXCIPIENTES") setShowLiveTableExcipientes(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);

        if (type === "EXCIPIENTES") {
          const textDecoder = new TextDecoder('utf-8');
          const jsonString = textDecoder.decode(data);
          const parsed = JSON.parse(jsonString);
          if (!parsed.excipientes || !Array.isArray(parsed.excipientes)) {
            throw new Error("El JSON no tiene el formato correcto (falta array 'excipientes').");
          }
          setParsedData(parsed.excipientes);
          setStatus({
            type: "success",
            message: `¡Archivo EXCIPIENTES procesado! Se cargaron ${parsed.excipientes.length} registros. Presiona "Guardar".`
          });
          return;
        }

        const workbook = XLSX.read(data, { type: "array" });
        
        let cleanData = [];
        if (type === "ATC") {
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          if (rawJson.length === 0) throw new Error("El archivo está vacío.");
          cleanData = normalizeATC(rawJson);
          if (cleanData.length === 0) throw new Error("Columnas ATC no válidas.");
        } else if (type === "PRODUCTOS") {
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          if (rawJson.length === 0) throw new Error("El archivo está vacío.");
          cleanData = normalizeProductos(rawJson);
          if (cleanData.length === 0) throw new Error("Columnas de Productos no válidas (falta RS o DCI).");
        } else if (type === "EURD") {
          const matchedSheetName = workbook.SheetNames.find(s => s.toLowerCase().trim() === "eu reference dates list");
          if (!matchedSheetName) throw new Error("No se encontró la hoja 'EU reference dates list' en el archivo.");
          
          const eurdSheet = workbook.Sheets[matchedSheetName];
          const rows = XLSX.utils.sheet_to_json(eurdSheet, { header: 1, defval: "" });
          
          if (rows.length < 18) throw new Error("El archivo EURDList no tiene suficientes filas de datos.");
          
          // Formateador de fecha Excel serial a DD/MM/YYYY
          const formatExcelDateLocal = (val) => {
            if (val === undefined || val === null || val === "") return "";
            if (typeof val === 'number') {
              const date = new Date(Math.round((val - 25569) * 86400 * 1000));
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              return `${day}/${month}/${year}`;
            }
            return String(val).trim();
          };

          const dataStartIdx = 18;
          for (let i = dataStartIdx; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            if (row[0] === undefined || String(row[0]).trim() === "") continue;
            if (row[1] === undefined || String(row[1]).trim() === "") continue;
            
            cleanData.push({
              id: String(row[0]).trim(),
              active_substance: String(row[1]).trim().toLowerCase(),
              active_substance_display: String(row[1]).trim(),
              eurd: formatExcelDateLocal(row[2]),
              frequency: String(row[3]).trim(),
              dlp: formatExcelDateLocal(row[4]),
              submission_date: formatExcelDateLocal(row[5])
            });
          }
          if (cleanData.length === 0) throw new Error("No se pudieron extraer registros válidos de la lista EURD.");
        }

        setParsedData(cleanData);
        setStatus({
          type: "success",
          message: `¡Archivo ${type} procesado! Se cargaron ${cleanData.length} registros. Presiona "Guardar".`
        });
      } catch (error) {
        setStatus({ type: "error", message: `Error: ${error.message}` });
        setFile(null);
        setParsedData([]);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(fileToProcess);
  };

  const handleFileInputATC = (e) => processFile(e.target.files[0], "ATC");
  const handleFileInputProductos = (e) => processFile(e.target.files[0], "PRODUCTOS");
  const handleFileInputEURD = (e) => processFile(e.target.files[0], "EURD");
  const handleFileInputExcipientes = (e) => processFile(e.target.files[0], "EXCIPIENTES");

  const handleSaveToProject = async () => {
    if (parsedData.length === 0) return;
    setIsSaving(true);
    setStatus({ type: "", message: "" });

    try {
      // PRODUCTOS ahora se guarda en Postgres (vía backend-node), ya no en un JSON local.
      // ATC/EURD/Excipientes siguen siendo catálogos de referencia gestionados por
      // Flask + redeploy (ver nota en el backend sobre por qué se dejaron así).
      if (activeUploadType === "PRODUCTOS") {
        const cliente = clientesConfig.find(c => c.id === selectedCliente);
        const resData = await fetchWithAuth(`${API_URL}/products/${cliente.id}/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedData),
        }).then(handleResponse);

        if (resData.success) {
          setStatus({ type: "success", message: `🎉 Dataset guardado correctamente en el proyecto.` });
          setFile(null);
          setParsedData([]);
          setTimeout(() => window.location.reload(), 1500);
        } else {
          throw new Error(resData.error || "Ocurrió un error al guardar.");
        }
        return;
      }

      let endpoint = "http://127.0.0.1:5000/api/save-atc";
      if (activeUploadType === "EURD") {
        endpoint = "http://127.0.0.1:5000/api/save-eurd";
      } else if (activeUploadType === "EXCIPIENTES") {
        endpoint = "http://127.0.0.1:5000/api/save-excipientes";
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedData),
      });

      const resData = await response.json();
      if (resData.success) {
        setStatus({ type: "success", message: `🎉 Dataset guardado correctamente en el proyecto.` });
        setFile(null);
        setParsedData([]);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error(resData.error || "Ocurrió un error al guardar.");
      }
    } catch (error) {
      setStatus({ type: "error", message: `Error al guardar: ${error.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setParsedData([]);
    setStatus({ type: "", message: "" });
    setActiveUploadType(null);
  };

  const downloadSampleTemplateATC = () => {
    const worksheet = XLSX.utils.json_to_sheet([{ atc_code: "A01AA01", atc_name: "sodium fluoride", ddd: "1.1", uom: "mg", adm_r: "O", note: "0.5 mg fluoride", TRAD: "FLUORURO DE SOCIO" }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "WHO ATC-DDD");
    XLSX.writeFile(workbook, "plantilla_atc.xlsx");
  };

  // Filtros ATC
  const filteredATC = useMemo(() => {
    if (!tableSearchQuery.trim()) return atcData;
    const q = tableSearchQuery.toLowerCase();
    return atcData.filter(i => (i.atc_code?.toLowerCase().includes(q) || i.TRAD?.toLowerCase().includes(q) || i.atc_name?.toLowerCase().includes(q)));
  }, [tableSearchQuery]);

  const paginatedATC = filteredATC.slice((tablePage - 1) * itemsPerPage, tablePage * itemsPerPage);

  // Filtros EURD
  const filteredEURD = useMemo(() => {
    if (!tableSearchQueryEURD.trim()) return eurdData;
    const q = tableSearchQueryEURD.toLowerCase();
    return eurdData.filter(i => (
      i.active_substance?.toLowerCase().includes(q) || 
      i.eurd?.toLowerCase().includes(q) ||
      i.frequency?.toLowerCase().includes(q)
    ));
  }, [tableSearchQueryEURD]);

  const paginatedEURD = filteredEURD.slice((tablePageEURD - 1) * itemsPerPage, tablePageEURD * itemsPerPage);

  // Filtros EXCIPIENTES
  const filteredExcipientes = useMemo(() => {
    const data = excipientesData.excipientes || [];
    if (!tableSearchQueryExcipientes.trim()) return data;
    const q = tableSearchQueryExcipientes.toLowerCase();
    return data.filter(i => (
      i.nombre?.toLowerCase().includes(q) || 
      i.via_administracion?.toLowerCase().includes(q)
    ));
  }, [tableSearchQueryExcipientes]);

  const paginatedExcipientes = filteredExcipientes.slice((tablePageExcipientes - 1) * itemsPerPage, tablePageExcipientes * itemsPerPage);

  // Filtros PRODUCTOS
  const filteredProductos = useMemo(() => {
    if (!tableSearchQueryProductos.trim()) return productosData;
    const q = tableSearchQueryProductos.toLowerCase();
    return productosData.filter(i => (i.rs?.toLowerCase().includes(q) || i.dci?.toLowerCase().includes(q) || i.marca?.toLowerCase().includes(q)));
  }, [tableSearchQueryProductos, productosData]);

  const paginatedProductos = filteredProductos.slice((tablePageProductos - 1) * itemsPerPage, tablePageProductos * itemsPerPage);

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto px-4 py-8">
      {/* HEADER PRINCIPAL */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-700 p-8 text-white shadow-xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <Database size={14} /> Sistema de Catálogos de Referencia
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Catálogos & Configuración</h1>
          <p className="text-primary-100 max-w-2xl text-sm leading-relaxed">
            Administra los conjuntos de datos del proyecto de manera ágil. Sube plantillas para el autocompletado global o específico por cliente.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-white/10 to-transparent pointer-events-none transform translate-x-12 translate-y-12"></div>
      </div>

      <div className="flex space-x-2 border-b pb-2">
        {!isMasterAdmin && (
          <Button variant={activeTab === "catalogos" ? "default" : "outline"} onClick={() => setActiveTab("catalogos")} className={activeTab === "catalogos" ? "bg-primary-600 text-white" : ""}>
            <Database size={16} className="mr-2" /> Catálogos
          </Button>
        )}
        {hasAdminAccess && (
          <>
            <Button variant={activeTab === "usuarios" ? "default" : "outline"} onClick={() => setActiveTab("usuarios")}>
              <UserSquare size={16} className="mr-2" /> Usuarios
            </Button>
            <Button variant={activeTab === "workspaces" ? "default" : "outline"} onClick={() => setActiveTab("workspaces")}>
              <Package size={16} className="mr-2" /> Workspaces
            </Button>
          </>
        )}
        <Button variant={activeTab === "ia" ? "default" : "outline"} onClick={() => setActiveTab("ia")}>
          <Cpu size={16} className="mr-2" /> IA / Integraciones
        </Button>
      </div>

      {activeTab === "catalogos" && (
        <>
          {status.message && (
        <div className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-all duration-300 animate-fadeIn ${
          status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
        }`}>
          {status.type === "success" ? <CheckCircle2 className="mt-0.5 text-emerald-600 shrink-0" size={20} /> : <AlertCircle className="mt-0.5 text-red-600 shrink-0" size={20} />}
          <div className="space-y-1 flex-1">
            <p className="text-sm font-semibold">{status.type === "success" ? "Operación Exitosa" : "Error Detectado"}</p>
            <p className="text-xs leading-relaxed opacity-95">{status.message}</p>
          </div>
          <button onClick={() => setStatus({ type: "", message: "" })} className="text-xs font-medium hover:underline opacity-80 transition-opacity">Cerrar</button>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold tracking-tight text-text-main">Catálogos Disponibles</h2>
            <p className="text-xs text-text-muted">Espacio optimizado para múltiples índices clínicos y sanitarios.</p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CATÁLOGO 1: ATC / DDD */}
        {/* ============================================================== */}
        <div className="rounded-2xl border transition-all duration-300 bg-white shadow-sm hover:shadow-md border-border">
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm"><Database size={24} /></div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-bold text-slate-800">Clasificación ATC / DDD (OMS)</h3>
                  {atcData && atcData.length > 0 ? (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>ACTIVO</span>
                  ) : (
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>SIN DATOS</span>
                  )}
                </div>
                <p className="text-xs text-text-muted">Clasificación oficial de fármacos según órganos y dosis diarias de la OMS.</p>
                <p className="text-[11px] font-semibold text-text-muted mt-1.5">Registros: <span className="font-mono text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-md">{atcData?.length || 0} filas</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative group">
                <input type="file" id="cat-atc-up" accept=".xlsx,.xls,.csv" onChange={handleFileInputATC} className="hidden" />
                <label htmlFor="cat-atc-up" className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm border cursor-pointer bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><UploadCloud size={18} /></label>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded">Subir Dataset ATC</div>
              </div>
              <div className="relative group">
                <button onClick={() => { if (atcData?.length) setShowLiveTable(!showLiveTable); }} className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border transition-all ${showLiveTable ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"}`} disabled={!atcData?.length}>
                  {showLiveTable ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded">{showLiveTable ? "Ocultar" : "Ver"} tabla</div>
              </div>
              <div className="relative group">
                <button onClick={downloadSampleTemplateATC} className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 border hover:bg-slate-600 hover:text-white transition-all"><FileDown size={18} /></button>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded">Descargar Plantilla</div>
              </div>
            </div>
          </div>

          {showLiveTable && (
            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
              <input type="text" value={tableSearchQuery} onChange={e => {setTableSearchQuery(e.target.value); setTablePage(1);}} placeholder="Buscar ATC..." className="w-full max-w-sm px-3 py-1.5 text-xs rounded-xl border mb-4 focus:ring-2 focus:ring-primary-500" />
              <table className="w-full text-left text-[11px] bg-white border">
                <thead className="bg-slate-100 border-b"><tr className="font-bold text-[9px] uppercase"><th className="p-2">ATC</th><th className="p-2">Activo</th><th className="p-2">Inglés</th><th className="p-2">DDD</th></tr></thead>
                <tbody className="divide-y">
                  {paginatedATC.map((r, i) => (<tr key={i}><td className="p-2 font-mono font-bold text-primary-600">{r.atc_code}</td><td className="p-2">{r.TRAD}</td><td className="p-2 text-slate-500">{r.atc_name}</td><td className="p-2 font-mono">{r.ddd}</td></tr>))}
                </tbody>
              </table>
              <div className="mt-2 text-right">
                <button onClick={() => setTablePage(p => Math.max(1, p - 1))} disabled={tablePage === 1} className="mr-2 text-xs">Anterior</button>
                <button onClick={() => setTablePage(p => p + 1)} disabled={tablePage * itemsPerPage >= filteredATC.length} className="text-xs">Siguiente</button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* CATÁLOGO 2: LISTADO DE PRODUCTOS (CLIENTES) */}
        {/* ============================================================== */}
        <div className="rounded-2xl border transition-all duration-300 bg-white shadow-sm hover:shadow-md border-border">
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-sm"><Package size={24} /></div>
              <div className="space-y-1 w-full">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-bold text-slate-800">Catálogo de Productos por Cliente</h3>
                  {productosData.length > 0 ? (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>ACTIVO</span>
                  ) : (
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>SIN DATOS</span>
                  )}
                </div>
                <p className="text-xs text-text-muted">Listado de productos farmacéuticos (RS, DCI, Formas) asociados al cliente seleccionado.</p>
                
                <div className="pt-2">
                  <div className="relative inline-flex items-center">
                    <UserSquare size={14} className="absolute left-2.5 text-slate-400" />
                    <select
                      value={selectedCliente}
                      onChange={(e) => setSelectedCliente(e.target.value)}
                      className="pl-8 pr-8 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none appearance-none"
                    >
                      {activeClients.map(c => (
                        <option key={c.id} value={c.id}>[{c.id}] {c.empresa.razonSocial}</option>
                      ))}
                    </select>
                  </div>
                  <span className="ml-3 text-[11px] font-semibold text-text-muted">Registros en archivo: <span className="font-mono text-orange-600 bg-orange-50/50 px-2 py-0.5 rounded-md">{productosData.length} filas</span></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="relative group">
                <input type="file" id="cat-prod-up" accept=".xlsx,.xls,.csv" onChange={handleFileInputProductos} className="hidden" />
                <label htmlFor="cat-prod-up" className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm border cursor-pointer bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white transition-all"><UploadCloud size={18} /></label>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded whitespace-nowrap">Subir Productos para {selectedCliente}</div>
              </div>
              <div className="relative group">
                <button onClick={() => { if (productosData.length) setShowLiveTableProductos(!showLiveTableProductos); }} className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border transition-all ${showLiveTableProductos ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"}`} disabled={!productosData.length}>
                  {showLiveTableProductos ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded whitespace-nowrap">{showLiveTableProductos ? "Ocultar" : "Ver"} productos de {selectedCliente}</div>
              </div>
            </div>
          </div>

          {showLiveTableProductos && productosData.length > 0 && (
            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
              <input type="text" value={tableSearchQueryProductos} onChange={e => {setTableSearchQueryProductos(e.target.value); setTablePageProductos(1);}} placeholder="Buscar por RS, DCI o Marca..." className="w-full max-w-sm px-3 py-1.5 text-xs rounded-xl border mb-4 focus:ring-2 focus:ring-orange-500" />
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] bg-white border">
                  <thead className="bg-slate-100 border-b"><tr className="font-bold text-[9px] uppercase"><th className="p-2">Reg. Sanitario</th><th className="p-2">Marca</th><th className="p-2">DCI</th><th className="p-2">Dosis</th><th className="p-2">Forma Farmac.</th></tr></thead>
                  <tbody className="divide-y">
                    {paginatedProductos.map((r, i) => (<tr key={i}><td className="p-2 font-mono font-bold text-orange-600">{r.rs}</td><td className="p-2">{r.marca}</td><td className="p-2 text-slate-700 font-semibold">{r.dci}</td><td className="p-2">{r.dosis}</td><td className="p-2">{r.formafarmaceutica}</td></tr>))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-right">
                <button onClick={() => setTablePageProductos(p => Math.max(1, p - 1))} disabled={tablePageProductos === 1} className="mr-2 text-xs font-bold text-slate-600 hover:text-slate-800 disabled:opacity-50">Anterior</button>
                <button onClick={() => setTablePageProductos(p => p + 1)} disabled={tablePageProductos * itemsPerPage >= filteredProductos.length} className="text-xs font-bold text-slate-600 hover:text-slate-800 disabled:opacity-50">Siguiente</button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* CATÁLOGO 3: EURD LIST (EU REFERENCE DATES) */}
        {/* ============================================================== */}
        <div className="rounded-2xl border transition-all duration-300 bg-white shadow-sm hover:shadow-md border-border">
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shadow-sm">
                <Database size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-bold text-slate-800">Lista de Fechas de Referencia de la Unión (EURD List)</h3>
                  {eurdData && eurdData.length > 0 ? (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>ACTIVO
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>SIN DATOS
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  Catálogo oficial de sustancias de la EMA con sus fechas de corte de datos (DLP) y frecuencia de presentación de IPS/PSUR.
                </p>
                <p className="text-[11px] font-semibold text-text-muted mt-1.5">
                  Registros: <span className="font-mono text-violet-600 bg-violet-50/50 px-2 py-0.5 rounded-md">{eurdData?.length || 0} filas</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative group">
                <input type="file" id="cat-eurd-up" accept=".xlsx,.xls,.csv" onChange={handleFileInputEURD} className="hidden" />
                <label htmlFor="cat-eurd-up" className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm border cursor-pointer bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white transition-all">
                  <UploadCloud size={18} />
                </label>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded whitespace-nowrap">
                  Subir Dataset EURD
                </div>
              </div>
              <div className="relative group">
                <button 
                  onClick={() => { if (eurdData?.length) setShowLiveTableEURD(!showLiveTableEURD); }} 
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border transition-all ${showLiveTableEURD ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"}`} 
                  disabled={!eurdData?.length}
                >
                  {showLiveTableEURD ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded whitespace-nowrap">
                  {showLiveTableEURD ? "Ocultar" : "Ver"} tabla EURD
                </div>
              </div>
            </div>
          </div>

          {showLiveTableEURD && eurdData.length > 0 && (
            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
              <input 
                type="text" 
                value={tableSearchQueryEURD} 
                onChange={e => {setTableSearchQueryEURD(e.target.value); setTablePageEURD(1);}} 
                placeholder="Buscar por sustancia activa..." 
                className="w-full max-w-sm px-3 py-1.5 text-xs rounded-xl border mb-4 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none" 
              />
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] bg-white border">
                  <thead className="bg-slate-100 border-b">
                    <tr className="font-bold text-[9px] uppercase">
                      <th className="p-2">ID</th>
                      <th className="p-2">Sustancia Activa (EMA)</th>
                      <th className="p-2">EURD</th>
                      <th className="p-2">Frecuencia</th>
                      <th className="p-2">DLP</th>
                      <th className="p-2">F. Envío</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedEURD.map((r, i) => (
                      <tr key={i}>
                        <td className="p-2 font-mono text-slate-500">{r.id}</td>
                        <td className="p-2 font-semibold text-violet-700 capitalize">{r.active_substance_display}</td>
                        <td className="p-2 font-mono">{r.eurd}</td>
                        <td className="p-2">{r.frequency}</td>
                        <td className="p-2 font-mono text-slate-600">{r.dlp}</td>
                        <td className="p-2 font-mono text-slate-600">{r.submission_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-right">
                <button 
                  onClick={() => setTablePageEURD(p => Math.max(1, p - 1))} 
                  disabled={tablePageEURD === 1} 
                  className="mr-2 text-xs font-bold text-slate-600 hover:text-slate-800 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button 
                  onClick={() => setTablePageEURD(p => p + 1)} 
                  disabled={tablePageEURD * itemsPerPage >= filteredEURD.length} 
                  className="text-xs font-bold text-slate-600 hover:text-slate-800 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* CATÁLOGO 4: EXCIPIENTES EMA */}
        {/* ============================================================== */}
        <div className="rounded-2xl border transition-all duration-300 bg-white shadow-sm hover:shadow-md border-border">
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600 shadow-sm">
                <Database size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-bold text-slate-800">Listado de excipiente para uso humano</h3>
                  {excipientesData?.excipientes && excipientesData.excipientes.length > 0 ? (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>ACTIVO
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>SIN DATOS
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  Catálogo de excipientes (EMA) e información para el prospecto.
                </p>
                <p className="text-[11px] font-semibold text-text-muted mt-1.5">
                  Registros: <span className="font-mono text-pink-600 bg-pink-50/50 px-2 py-0.5 rounded-md">{excipientesData?.excipientes?.length || 0} filas</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative group">
                <input type="file" id="cat-excipientes-up" accept=".json" onChange={handleFileInputExcipientes} className="hidden" />
                <label htmlFor="cat-excipientes-up" className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm border cursor-pointer bg-pink-50 text-pink-600 hover:bg-pink-600 hover:text-white transition-all">
                  <UploadCloud size={18} />
                </label>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded whitespace-nowrap">
                  Subir Dataset Excipientes
                </div>
              </div>
              <div className="relative group">
                <button 
                  onClick={() => { if (excipientesData?.excipientes?.length) setShowLiveTableExcipientes(!showLiveTableExcipientes); }} 
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border transition-all ${showLiveTableExcipientes ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"}`} 
                  disabled={!excipientesData?.excipientes?.length}
                >
                  {showLiveTableExcipientes ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded whitespace-nowrap">
                  {showLiveTableExcipientes ? "Ocultar" : "Ver"} tabla Excipientes
                </div>
              </div>
            </div>
          </div>

          {showLiveTableExcipientes && excipientesData?.excipientes?.length > 0 && (
            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
              <input 
                type="text" 
                value={tableSearchQueryExcipientes} 
                onChange={e => {setTableSearchQueryExcipientes(e.target.value); setTablePageExcipientes(1);}} 
                placeholder="Buscar por excipiente o vía de administración..." 
                className="w-full max-w-sm px-3 py-1.5 text-xs rounded-xl border mb-4 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none" 
              />
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] bg-white border">
                  <thead className="bg-slate-100 border-b">
                    <tr className="font-bold text-[9px] uppercase">
                      <th className="p-2 w-1/5">Nombre</th>
                      <th className="p-2 w-1/6">Vía de Administración</th>
                      <th className="p-2 w-1/12">Umbral</th>
                      <th className="p-2 w-1/4">Info Prospecto</th>
                      <th className="p-2 w-1/4">Comentarios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedExcipientes.map((r, i) => (
                      <tr key={i}>
                        <td className="p-2 font-semibold text-pink-700">{r.nombre}</td>
                        <td className="p-2">{r.via_administracion}</td>
                        <td className="p-2 font-mono text-slate-600">{r.umbral}</td>
                        <td className="p-2"><div className="line-clamp-2" title={r.informacion_prospecto}>{r.informacion_prospecto || "-"}</div></td>
                        <td className="p-2"><div className="line-clamp-2" title={r.comentarios}>{r.comentarios || "-"}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-right">
                <button 
                  onClick={() => setTablePageExcipientes(p => Math.max(1, p - 1))} 
                  disabled={tablePageExcipientes === 1} 
                  className="mr-2 text-xs font-bold text-slate-600 hover:text-slate-800 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button 
                  onClick={() => setTablePageExcipientes(p => p + 1)} 
                  disabled={tablePageExcipientes * itemsPerPage >= filteredExcipientes.length} 
                  className="text-xs font-bold text-slate-600 hover:text-slate-800 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* VISTA COMPARTIDA: PANEL DE VISTA PREVIA (Mapeo preliminar para ambos catálogos) */}
        {parsedData.length > 0 && (
          <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-6 animate-slideDown space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-indigo-200">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 flex items-center gap-2"><FileSpreadsheet className="text-indigo-600 animate-pulse" size={18}/> Vista Previa de Carga: {activeUploadType}</h4>
                <p className="text-[11px] text-text-muted">Se validó la estructura de <strong>{file?.name}</strong>. ({parsedData.length} filas extraídas)</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={resetForm} size="sm" className="h-8 text-xs bg-white text-indigo-700" disabled={isSaving}>Cancelar</Button>
                <Button onClick={handleSaveToProject} size="sm" className="h-8 text-xs bg-primary-600 hover:bg-primary-700 text-white" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar en Proyecto"}</Button>
              </div>
            </div>
            
            <div className="overflow-x-auto bg-white border border-indigo-100 rounded-lg">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 border-b font-bold uppercase text-slate-500 text-[8px]">
                  <tr>
                    {Object.keys(parsedData[0] || {}).slice(0, 7).map(k => <th key={k} className="p-2">{k}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {parsedData.slice(0, 3).map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(row).slice(0, 7).map(k => <td key={k} className="p-2 max-w-[120px] truncate">{row[k]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      </>
      )}

      {activeTab === "usuarios" && hasAdminAccess && <UsersConfig isMasterAdmin={isMasterAdmin} />}
      {activeTab === "workspaces" && hasAdminAccess && <WorkspacesConfig isMasterAdmin={isMasterAdmin} />}
      
      {activeTab === "ia" && (
        <div className="space-y-6">
          {status.message && (
            <div className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-all duration-300 animate-fadeIn ${
              status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
            }`}>
              {status.type === "success" ? <CheckCircle2 className="mt-0.5 text-emerald-600 shrink-0" size={20} /> : <AlertCircle className="mt-0.5 text-red-600 shrink-0" size={20} />}
              <div className="space-y-1 flex-1">
                <p className="text-sm font-semibold">{status.type === "success" ? "Operación Exitosa" : "Error Detectado"}</p>
                <p className="text-xs leading-relaxed opacity-95">{status.message}</p>
              </div>
              <button onClick={() => setStatus({ type: "", message: "" })} className="text-xs font-medium hover:underline opacity-80 transition-opacity">Cerrar</button>
            </div>
          )}
          <div className="rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all duration-300 border-border p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800">
              <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shadow-sm"><Cpu size={20} /></div>
              Configuración de Inteligencia Artificial
            </h3>
            <div className="space-y-5 max-w-lg bg-slate-50/50 p-6 rounded-xl border border-slate-100">
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700">API Key de Anthropic (Claude)</label>
                <Input 
                  type="password" 
                  placeholder="sk-ant-api03-..." 
                  value={claudeApiKey} 
                  onChange={(e) => setClaudeApiKey(e.target.value)} 
                  className="bg-white border-slate-200 focus:ring-primary-500"
                />
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Esta clave se guarda localmente en tu navegador y es utilizada para habilitar el análisis automático de artículos científicos en la Sección E de AlessaIPS usando Claude.
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700">API Key de OpenAI (ChatGPT)</label>
                <Input 
                  type="password" 
                  placeholder="sk-proj-..." 
                  value={openaiApiKey} 
                  onChange={(e) => setOpenaiApiKey(e.target.value)} 
                  className="bg-white border-slate-200 focus:ring-primary-500"
                />
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Opcional. Si proporcionas ambas claves, podrás elegir qué motor usar en la Sección E.
                </p>
              </div>
              <Button onClick={handleSaveApiKey} className="bg-primary-600 hover:bg-primary-700 text-white w-full shadow-sm">
                Guardar Configuración IA
              </Button>
            </div>
          </div>
          <ZoteroSettings />
        </div>
      )}
    </div>
  );
}

