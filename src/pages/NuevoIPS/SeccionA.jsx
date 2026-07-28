import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { usePersistedState } from "../../hooks/usePersistedState";
import atcData from "../../data/atc_data.json";
import eurdData from "../../data/eurd_data.json";
import { fetchWithAuth, API_URL, handleResponse } from "../../services/api";

// Importando tus componentes de UI
import DataTable from "../../Components/DataTable";
import { Accordion } from "../../Components/ui/Accordion";
import { Input } from "../../Components/ui/input";
import { Select } from "../../Components/ui/Select";
import { Textarea } from "../../Components/ui/Textarea";

// Iconos
import { Plus, Trash2, Search, X, Info } from "lucide-react";

const ordinales = {
  1: "Primer", 2: "Segundo", 3: "Tercer", 4: "Cuarto", 5: "Quinto",
  6: "Sexto", 7: "Séptimo", 8: "Octavo", 9: "Noveno", 10: "Décimo",
  11: "Décimo Primer", 12: "Décimo Segundo", 13: "Décimo Tercer",
  14: "Décimo Cuarto", 15: "Décimo Quinto", 16: "Décimo Sexto",
  17: "Décimo Séptimo", 18: "Décimo Octavo", 19: "Décimo Noveno",
  20: "Vigésimo", 21: "Vigésimo Primer",
};

// Sub-componente extraído para evitar re-renderizados y pérdida de foco
const Field = ({ label, tooltip, children }) => (
  <div className="w-full">
    <div className="flex items-center gap-2 mb-1.5">
      <label className="block text-sm font-medium text-text-main">{label}</label>
      {tooltip && (
        <div className="group relative flex items-center">
          <Info size={14} className="text-violet-500 cursor-help" />
          <div className="pointer-events-none absolute left-2 bottom-full mb-2 w-64 opacity-0 transition-opacity group-hover:opacity-100 z-50 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg p-3 shadow-xl whitespace-normal break-words">
            {tooltip}
            <svg className="absolute text-slate-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
          </div>
        </div>
      )}
    </div>
    {children}
  </div>
);

// Buscar el grupo jerárquico padre (longitud 5, 4 o 3) en español
const findParentGroup = (code) => {
  if (!code) return "";
  const len5 = code.substring(0, 5);
  const len4 = code.substring(0, 4);
  const len3 = code.substring(0, 3);
  
  const parent5 = atcData.find(item => item.atc_code === len5);
  if (parent5 && parent5.TRAD) return parent5.TRAD;
  if (parent5 && parent5.atc_name) return parent5.atc_name;
  
  const parent4 = atcData.find(item => item.atc_code === len4);
  if (parent4 && parent4.TRAD) return parent4.TRAD;
  if (parent4 && parent4.atc_name) return parent4.atc_name;

  const parent3 = atcData.find(item => item.atc_code === len3);
  if (parent3 && parent3.TRAD) return parent3.TRAD;
  if (parent3 && parent3.atc_name) return parent3.atc_name;
  
  return "";
};

export default function SeccionA() {
  const { state } = useLocation();

  const [searchTerm, setSearchTerm] = useState(() => {
    // Intentar inicializar con el nombre traducido del ATC Code guardado en session
    try {
      const savedCode = sessionStorage.getItem("seccionA_formData");
      if (savedCode) {
        const parsed = JSON.parse(savedCode);
        if (parsed.atcCode) {
          const matched = atcData.find(item => item.atc_code === parsed.atcCode);
          if (matched) return matched.TRAD || matched.atc_name || "";
        }
      }
    } catch (e) {}
    return "";
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [productosData, setProductosData] = useState([]);
  const [activeSearchProductRs, setActiveSearchProductRs] = useState(null);
  const [eurdSearchQuery, setEurdSearchQuery] = useState("");

  // Filtrar sugerencias de principios activos (código de longitud 7) con coincidencia más exacta (límite de palabra / prefijo)
  const suggestions = searchTerm.trim().length >= 2
    ? atcData.filter(item => {
        const term = searchTerm.toLowerCase();
        // Usar regex de límite de palabra para coincidencia de inicio de palabra (evita partes medias como monofluoro en fluor)
        const regex = new RegExp(`\\b${term}`, 'i');
        const matchesTrad = item.TRAD && regex.test(item.TRAD);
        const matchesName = item.atc_name && regex.test(item.atc_name);
        const matchesCode = item.atc_code && item.atc_code.toLowerCase().startsWith(term);
        // Sugerir códigos de longitud 7 (sustancias químicas / principios activos)
        return (matchesTrad || matchesName || matchesCode) && item.atc_code.length === 7;
      }).slice(0, 50)
    : [];

  const handleSelectSubstance = (substance) => {
    const parentGroup = findParentGroup(substance.atc_code);

    // Dosis diaria definida (DDD)
    const hasDdd = substance.ddd && substance.ddd !== "NA" ? "SI" : "NO";
    const dddList = hasDdd === "SI"
      ? [{ 
          numero: substance.ddd, 
          unidad: substance.uom !== "NA" && substance.uom ? substance.uom : "mg", 
          viaAdministracion: substance.adm_r !== "NA" && substance.adm_r ? substance.adm_r : "O" 
        }]
      : [{ numero: "", unidad: "", viaAdministracion: "" }];

    setFormData(prev => ({
      ...prev,
      atcCode: substance.atc_code,
      atcGroup: parentGroup || substance.TRAD || substance.atc_name,
      hasDdd,
      dddList
    }));

    setSearchTerm(substance.TRAD || substance.atc_name);
    setShowSuggestions(false);
  };

  // Cargar workspaces dinámicamente desde la sesión (BD) en lugar del archivo estático
  const workspacesStr = localStorage.getItem('workspaces');
  const workspaces = workspacesStr ? JSON.parse(workspacesStr) : [];
  const currentWorkspaceId = localStorage.getItem('currentWorkspaceId');
  const currentWorkspace = workspaces.find(w => String(w.id) === String(currentWorkspaceId));
  
  const workspacesToUse = currentWorkspace ? [currentWorkspace] : workspaces;
  const activeClients = workspacesToUse.map(w => ({
    id: w.id,
    empresa: { razonSocial: w.company_name || w.name },
    fv: { area: w.metadata?.fv?.area || "", direccion: w.metadata?.fv?.direccion || "" },
    plantillas: { ips: w.metadata?.plantillas?.ips || "" },
    catalogos: { productosFile: w.metadata?.catalogos?.productosFile || "" }
  }));

  const clienteInicial = activeClients[0] || {
    id: "",
    empresa: { razonSocial: "" },
    fv: { area: "", direccion: "" },
    plantillas: { ips: "" },
    catalogos: { productosFile: "" }
  };

  const [formData, setFormData] = usePersistedState("seccionA_formData", {
    // --- ACCORDION 1 ---
    clienteId: clienteInicial.id,
    trsName: clienteInicial.empresa?.razonSocial || "",
    uvsName: clienteInicial.fv?.area || "",
    direccion: clienteInicial.fv?.direccion || "",
    templatePath: clienteInicial.plantillas?.ips || "",
    elaborador: "",

    // --- ACCORDION 2: A.1 Generalidades ---
    ifaName: "",
    productName: "",
    codigoIps: "",
    ipsNumero: 1,
    ipsTexto: "Primer",
    pais: "Perú",
    arnName: "DIGEMID",

    // --- ACCORDION 2.1: Clasificación ATC ---
    atcCode: "",
    atcGroup: "",
    hasDdd: "",
    dddList: [{ numero: "", unidad: "", viaAdministracion: "" }],

    // --- ACCORDION 3 ---
    productosList: state?.ipsObject?.records?.map((r) => ({
      rs: r.RS || "",
      ifa: r.denominacionIPS || "",
      nombreComercial: r.nombreProducto || "",
      formaFarmaceutica: r.formaFarmaceutica || "",
      presentacion: r.presentacion || "",
      fechaNacLocal: r.fechaPrimeraAutorizacion || r.fechaNacLocal || r.fechaNacimientoLocal || state?.ipsObject?.fechaNacimientoLocal || "",
      fechaIbd: "",
      estado: "VIGENTE",
      pais: "Perú",
      fechaCancelacion: "",
      incluido: "INCLUIDO"
    })) || [],

    // Metadatos de la Tabla de Control
    fechaInicioDatos: state?.ipsObject?.meta?.fechaInicio || "",
    fcd: state?.ipsObject?.meta?.fcd || "",
    fechaNacimientoLocal: "",
    aniosPeriodo: state?.ipsObject?.meta?.aniosPeriodo || "",
    fechaLimite: state?.ipsObject?.meta?.fechaLimite || "",

    // --- ACCORDION 4: A.3 Indicaciones ---
    indicacionesList: [{ indicacion: "", posologia: "" }],

    // --- ACCORDION 5: A.4 Mecanismo de acción y ATC ---
    mecanismoAccion: "",

    // --- ACCORDION 6: A.5 Forma de administración ---
    formaAdministracion: "",
  });

  // Efecto para forzar la carga de datos si venimos de la Tabla de Control con un nuevo objeto
  useEffect(() => {
    if (state?.ipsObject?.records && formData.productosList.length === 0) {
      setFormData(prev => ({
        ...prev,
        productosList: state.ipsObject.records.map(r => ({
          rs: r.RS || "",
          ifa: r.denominacionIPS || "",
          nombreComercial: r.nombreProducto || "",
          formaFarmaceutica: r.formaFarmaceutica || "",
          presentacion: r.presentacion || "",
          fechaNacLocal: r.fechaPrimeraAutorizacion || r.fechaNacLocal || r.fechaNacimientoLocal || state?.ipsObject?.fechaNacimientoLocal || "",
          fechaIbd: "",
          estado: "VIGENTE",
          pais: "Perú",
          fechaCancelacion: "",
          incluido: "INCLUIDO"
        })),
        fechaInicioDatos: state.ipsObject.fechaInicioDatos || "",
        fcd: state.ipsObject.fcd || "",
        fechaNacimientoLocal: state.ipsObject.fechaNacimientoLocal || "",
        aniosPeriodo: state.ipsObject.aniosPeriodo || "",
        fechaLimite: state.ipsObject.fechaLimite || ""
      }));
    }
  }, [state, setFormData]);

  // Cargar catálogo de productos del cliente actual (desde Postgres vía backend-node)
  useEffect(() => {
    const loadProductos = async () => {
      const clienteId = formData.clienteId;
      const cliente = activeClients.find(c => c.id === clienteId);
      if (!cliente) {
        setProductosData([]);
        return;
      }
      try {
        const data = await fetchWithAuth(`${API_URL}/products/${cliente.id}`).then(handleResponse);
        setProductosData(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error cargando productos:", e);
        setProductosData([]);
      }
    };
    loadProductos();
  }, [formData.clienteId]);

  // Autocompletar datos de productos de A.2 usando el catálogo
  const productosRsKey = JSON.stringify(formData.productosList.map(p => p.rs));
  useEffect(() => {
    if (productosData.length > 0 && formData.productosList.length > 0) {
      setFormData(prev => {
        let changed = false;
        const newList = prev.productosList.map(prod => {
          const match = productosData.find(p => p.rs?.toLowerCase() === prod.rs?.toLowerCase());
          if (match) {
            let updatedProd = { ...prod };
            if (!prod.formaFarmaceutica && match.dosis) {
              updatedProd.formaFarmaceutica = match.dosis;
              changed = true;
            }
            if (!prod.presentacion && match.formafarmaceutica) {
              updatedProd.presentacion = match.formafarmaceutica;
              changed = true;
            }
            return updatedProd;
          }
          return prod;
        });
        if (changed) return { ...prev, productosList: newList };
        return prev;
      });
    }
  }, [productosData, productosRsKey, setFormData]);

  // Autocompletar Fecha IBD desde EURD List de forma inteligente
  const productIfasKey = JSON.stringify(formData.productosList.map(p => ({ rs: p.rs, ifa: p.ifa, fechaIbd: p.fechaIbd })));
  useEffect(() => {
    if (eurdData && eurdData.length > 0 && formData.productosList.length > 0) {
      setFormData(prev => {
        let changed = false;
        const newList = [...prev.productosList];
        newList.forEach((p, idx) => {
          if (!p.fechaIbd && p.ifa) {
            const ifaTerm = p.ifa.toLowerCase().trim();
            const match = eurdData.find(e => {
              if (!e.active_substance) return false;
              const activeLower = e.active_substance.toLowerCase();
              return activeLower === ifaTerm || activeLower.includes(ifaTerm) || ifaTerm.includes(activeLower);
            });
            if (match && match.data_lock_point) {
              p.fechaIbd = match.data_lock_point; // DD/MM/YYYY o YYYY/MM/DD
              changed = true;
            }
          }
        });
        if (changed) return { ...prev, productosList: newList };
        return prev;
      });
    }
  }, [productIfasKey, eurdData]);

  // Sincronizar productName con ifaName si es genérico
  useEffect(() => {
    if (formData.isGeneric && formData.productName !== formData.ifaName) {
      setFormData(prev => ({ ...prev, productName: prev.ifaName }));
    }
  }, [formData.isGeneric, formData.ifaName]);

  // =========================
  // HANDLERS GENERALES
  // =========================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClienteChange = (e) => {
    const clienteId = e.target.value;
    const cliente = activeClients.find((c) => c.id === clienteId);
    if (!cliente) return;

    setFormData((prev) => ({
      ...prev,
      clienteId: cliente.id,
      trsName: cliente.empresa?.razonSocial || "",
      uvsName: cliente.fv?.area || "",
      direccion: cliente.fv?.direccion || "",
      templatePath: cliente.plantillas?.ips || "",
    }));
  };

  const handleIPSNumero = (e) => {
    const numero = Number(e.target.value);
    setFormData((prev) => ({
      ...prev,
      ipsNumero: numero,
      ipsTexto: ordinales[numero],
    }));
  };

  // =========================
  // HANDLERS PARA ARRAYS DINÁMICOS (+ / -)
  // =========================

  const handleArrayChange = (listName, index, field, value) => {
    setFormData((prev) => {
      const newList = [...prev[listName]];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, [listName]: newList };
    });
  };

  const addArrayItem = (listName, emptyItem) => {
    setFormData((prev) => ({
      ...prev,
      [listName]: [...prev[listName], emptyItem]
    }));
  };

  const removeArrayItem = (listName, index) => {
    setFormData((prev) => ({
      ...prev,
      [listName]: prev[listName].filter((_, i) => i !== index)
    }));
  };


  const handleProductChange = (rs, field, value) => {
    setFormData((prev) => ({
      ...prev,
      productosList: prev.productosList.map((prod) =>
        prod.rs === rs ? { ...prod, [field]: value } : prod
      ),
    }));
  };

  const productosColumns = [
    { key: "rs", label: "N° Reg. Sanitario" },
    { key: "ifa", label: "IFA" },
    {
      key: "nombreComercial",
      label: "NOMBRE COMERCIAL",
      render: (val, row) => (
        <Input
          className="h-7 text-xs px-2 min-w-[120px]"
          value={row.nombreComercial}
          onChange={(e) => handleProductChange(row.rs, "nombreComercial", e.target.value)}
        />
      ),
    },
    {
      key: "formaFarmaceutica",
      label: "Forma Farmacéutica",
      render: (val, row) => (
        <Input
          className="h-7 text-xs px-2 min-w-[120px]"
          value={row.formaFarmaceutica}
          onChange={(e) => handleProductChange(row.rs, "formaFarmaceutica", e.target.value)}
        />
      ),
    },
    {
      key: "presentacion",
      label: "Presentación",
      render: (val, row) => (
        <Input
          className="h-7 text-xs px-2 min-w-[120px]"
          value={row.presentacion}
          onChange={(e) => handleProductChange(row.rs, "presentacion", e.target.value)}
        />
      ),
    },
    {
      key: "fechaNacLocal",
      label: "F. Nac Local",
      render: (val, row) => {
        let displayVal = val;
        if (displayVal && displayVal.includes("T")) {
          const d = new Date(displayVal);
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            displayVal = `${day}-${month}-${d.getFullYear()}`;
          }
        }
        return (
          <Input
            type="text"
            placeholder="DD-MM-YYYY"
            className="h-7 text-xs px-2 min-w-[100px]"
            value={displayVal}
            onChange={(e) => handleProductChange(row.rs, "fechaNacLocal", e.target.value)}
          />
        );
      },
    },
    {
      key: "fechaIbd",
      label: "Fecha IBD",
      render: (val, row) => {
        const isOpen = activeSearchProductRs === row.rs;
        
        // Filtrar resultados de búsqueda en EURD
        const searchResults = eurdSearchQuery.trim().length >= 2
          ? eurdData.filter(item => 
              item.active_substance?.toLowerCase().includes(eurdSearchQuery.toLowerCase())
            ).slice(0, 5)
          : [];

        return (
          <div className="relative min-w-[150px] flex items-center gap-1">
            <Input
              type="text"
              placeholder="DD/MM/YYYY"
              className="h-7 text-xs px-2 pr-7 flex-1"
              value={val}
              onChange={(e) => handleProductChange(row.rs, "fechaIbd", e.target.value)}
            />
            
            <button
              type="button"
              onClick={() => {
                if (isOpen) {
                  setActiveSearchProductRs(null);
                } else {
                  setActiveSearchProductRs(row.rs);
                  setEurdSearchQuery(row.ifa || "");
                }
              }}
              className="p-1 rounded bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 transition-colors cursor-pointer shrink-0"
              title="Consultar Catálogo EURD"
            >
              <Search size={12} />
            </button>

            {isOpen && (
              <div className="absolute z-50 right-0 top-8 w-64 p-3 bg-white rounded-xl border border-violet-200 shadow-xl space-y-2 animate-fadeIn text-left">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] font-bold text-violet-700">Buscador EURD List</span>
                  <button
                    type="button"
                    onClick={() => setActiveSearchProductRs(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
                
                <input
                  type="text"
                  placeholder="Buscar sustancia..."
                  className="w-full h-6 text-[10px] px-2 rounded border border-slate-200 outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                  value={eurdSearchQuery}
                  onChange={(e) => setEurdSearchQuery(e.target.value)}
                  autoFocus
                />

                <div className="max-h-36 overflow-y-auto divide-y divide-slate-50 text-[10px]">
                  {searchResults.length > 0 ? (
                    searchResults.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          handleProductChange(row.rs, "fechaIbd", item.eurd);
                          setActiveSearchProductRs(null);
                        }}
                        className="w-full text-left p-1.5 hover:bg-violet-50 transition-colors flex flex-col gap-0.5 rounded cursor-pointer"
                      >
                        <span className="font-semibold text-slate-800 capitalize truncate w-full block">
                          {item.active_substance_display}
                        </span>
                        <span className="text-[9px] text-violet-600 font-mono block">
                          EURD: {item.eurd} | Frec: {item.frequency}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-center text-slate-400 italic">
                      {eurdSearchQuery.trim().length < 2 
                        ? "Escribe 2+ letras..." 
                        : "Sin coincidencias"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "estado",
      label: "ESTADO",
      render: (val, row) => (
        <select
          className="h-8 text-xs px-2 rounded-md border border-border bg-surface text-text-main focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          value={val}
          onChange={(e) => handleProductChange(row.rs, "estado", e.target.value)}
        >
          <option value="VIGENTE">VIGENTE</option>
          <option value="CANCELADO">CANCELADO</option>
        </select>
      ),
    },
    {
      key: "pais",
      label: "País",
      render: (val, row) => (
        <select
          className="h-8 text-xs px-2 rounded-md border border-border bg-surface text-text-main focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          value={val}
          onChange={(e) => handleProductChange(row.rs, "pais", e.target.value)}
        >
          <option value="Perú">Perú</option>
          <option value="Colombia">Colombia</option>
          <option value="Ecuador">Ecuador</option>
        </select>
      ),
    },
    {
      key: "fechaCancelacion",
      label: "Fecha Cancelación",
      render: (val, row) => (
        <Input
          type="date"
          className="h-7 text-xs px-2 min-w-[110px]"
          value={val}
          onChange={(e) => handleProductChange(row.rs, "fechaCancelacion", e.target.value)}
        />
      ),
    },
    {
      key: "incluido",
      label: "INCLUIDO",
      render: (val, row) => (
        <select
          className="h-8 text-xs px-2 rounded-md border border-border bg-surface text-text-main focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          value={val}
          onChange={(e) => handleProductChange(row.rs, "incluido", e.target.value)}
        >
          <option value="INCLUIDO">INCLUIDO</option>
          <option value="NO INCLUIDO">NO INCLUIDO</option>
        </select>
      ),
    }
  ];

  return (
    <div className="space-y-8 pb-12">

      {/* TÜTULO PRINCIPAL */}
      <div>
        <h1 className="text-2xl font-bold text-text-main">SECCIÓN A</h1>
        <p className="text-text-muted mt-1">Datos del Informe Periódico de Seguridad</p>
      </div>

      {/* ========================================
          ACCORDION 1: DATOS GENERALES
      ======================================== */}
      <Accordion title="Datos Generales" defaultOpen={true}>
        <div className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="TRS Name (Cliente)">
              {/* Usamos un select nativo estilizado como tu UI ya que necesita keys diferentes (id y nombre) */}
              <select
                name="clienteId"
                value={formData.clienteId}
                onChange={handleClienteChange}
                className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main shadow-sm transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 hover:border-border-hover"
              >
                {activeClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.empresa.razonSocial}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Área FV">
              <Input name="uvsName" value={formData.uvsName} onChange={handleChange} />
            </Field>
            <Field label="Dirección">
              <Input name="direccion" value={formData.direccion} onChange={handleChange} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Template Path">
              <Input name="templatePath" value={formData.templatePath} onChange={handleChange} />
            </Field>
            <Field label="Elaborador">
              <Input name="elaborador" value={formData.elaborador} onChange={handleChange} />
            </Field>
          </div>

        </div>
      </Accordion>

      {/* ========================================
          ACCORDION 2: A.1 GENERALIDADES
      ======================================== */}
      <Accordion title="A.1 Generalidades del IPS" defaultOpen={true}>
        <div className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre IFA">
              <Input name="ifaName" value={formData.ifaName} onChange={handleChange} />
            </Field>
            <Field label="Nombre del Producto">
              <Input 
                name="productName" 
                value={formData.isGeneric ? formData.ifaName : formData.productName} 
                onChange={handleChange} 
                disabled={formData.isGeneric}
                className={formData.isGeneric ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}
              />
              <label className="flex items-center gap-2 mt-2 text-xs text-slate-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isGeneric || false} 
                  onChange={(e) => setFormData(prev =>({ ...prev, isGeneric: e.target.checked }))} 
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="flex items-center gap-1.5">
                  El producto es genérico (sin marca comercial)
                  <div className="group relative flex items-center">
                    <Info size={14} className="text-violet-500 cursor-help" />
                    <div className="pointer-events-none absolute left-2 bottom-full mb-2 w-64 opacity-0 transition-opacity group-hover:opacity-100 z-50 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg p-3 shadow-xl whitespace-normal break-words">
                      <>Si el medicamento es genérico y <strong>no tiene marca</strong> comercial registrada (ej. Clorpromazina), marque esta casilla. Esto asegura que el nombre del producto tome el valor del IFA para la redacción del reporte.</>
                      <svg className="absolute text-slate-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                    </div>
                  </div>
                </span>
              </label>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Código IPS">
              <Input name="codigoIps" value={formData.codigoIps} onChange={handleChange} />
            </Field>
            <Field label="Versión (Número)">
              <select
                value={formData.ipsNumero}
                onChange={handleIPSNumero}
                className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main shadow-sm transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 hover:border-border-hover"
              >
                {Array.from({ length: 21 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </Field>
            <Field label="Versión (Cardinal)">
              <Input value={formData.ipsTexto} readOnly className="bg-surface-hover text-text-muted border-dashed" />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="País"
              name="pais"
              value={formData.pais}
              onChange={handleChange}
              options={["Perú", "Colombia", "Ecuador"]}
            />
            <Field label="ARN Name">
              <Input name="arnName" value={formData.arnName} onChange={handleChange} />
            </Field>
          </div>
        </div>
      </Accordion>

      {/* =======================================
          ACCORDION 3: A.2 PRODUCTOS DEL IPS
      ======================================= */}
      <Accordion title="A.2 Productos del IPS" defaultOpen={true}>
        <div className="w-full overflow-x-auto">
          <DataTable
            title="Lista de Registros"
            columns={productosColumns}
            data={formData.productosList}
            showAddButton={true}
            onAdd={() => {
              setFormData(prev => ({
                ...prev,
                productosList: [...prev.productosList, {
rs: `RS-NUEVO-${Date.now().toString().slice(-4)}`,
                  ifa: "", nombreComercial: "", formaFarmaceutica: "",
                  presentacion: "", fechaIbd: "", estado: "VIGENTE",
                  pais: "Perú", fechaCancelacion: "", incluido: "INCLUIDO"
                }]
              }));
            }}
          />
        </div>
      </Accordion>

      {/* =======================================
          ACCORDION 4: A.3 INDICACIONES Y POSOLOGÍA
      ======================================= */}
      <Accordion title="A.3 Indicaciones y Posología" defaultOpen={true}>
        <div className="space-y-4">
          {formData.indicacionesList.map((item, index) => (
            <div key={index} className="flex gap-4 items-start border border-border p-5 rounded-xl bg-surface shadow-sm">
              <Field label="Indicación">
                <Input
                  value={item.indicacion}
                  onChange={(e) => handleArrayChange("indicacionesList", index, "indicacion", e.target.value)}
                />
              </Field>
              <Field label="Posología">
                <Input
                  value={item.posologia}
                  onChange={(e) => handleArrayChange("indicacionesList", index, "posologia", e.target.value)}
                />
              </Field>

              {/* Botón Eliminar */}
              {formData.indicacionesList.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayItem("indicacionesList", index)}
                  className="mt-6 p-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => addArrayItem("indicacionesList", { indicacion: "", posologia: "" })}
            className="flex items-center gap-2 text-primary-600 hover:text-primary-800 text-sm font-semibold transition-colors mt-4"
          >
            <Plus size={16} /> Agregar Indicación/Posología
          </button>
        </div>
      </Accordion>

    

      {/* =======================================
          ACCORDION 5: A.4 Mecanismo de acción y ATC
      ======================================= */}
      <Accordion title="A.4 Mecanismo de acción y Clasificación ATC" defaultOpen={true}>
        <div className="space-y-4">
          <Field label="Mecanismo de Acción">
            <Textarea
              name="mecanismoAccion"
              value={formData.mecanismoAccion}
              onChange={handleChange}
              rows={4}
              placeholder="Describa el mecanismo de acción..."
            />
          </Field>


          {/* ACCORDION 2.1: Clasificación ATC */}
          <div className="mt-6 border border-border rounded-xl p-6 bg-surface shadow-sm relative">
            <h3 className="font-semibold text-text-main mb-4">Clasificación ATC</h3>

            {/* Buscador de Principio Activo */}
            <div className="relative mb-6 pb-6 border-b border-border">
              <Field label="Buscar Principio Activo (IFA)">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Escribe el nombre del principio activo (ej. paracetamol, fluoruro...)"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                      // Pequeño delay para registrar clics en las sugerencias antes de cerrar
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    className="w-full pl-10 pr-10"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                    <Search size={18} />
                  </div>
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setShowSuggestions(false);
                        setFormData(prev => ({
                          ...prev,
                          atcCode: "",
                          atcGroup: ""
                        }));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Lista de sugerencias recuperadas por la búsqueda (Soporta múltiples códigos para un mismo IFA) */}
                {showSuggestions && searchTerm.trim().length >= 2 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-white shadow-xl divide-y divide-border animate-fadeIn">
                    {suggestions.length > 0 ? (
                      suggestions.map((item, index) => {
                        const parentGroup = findParentGroup(item.atc_code);
                        return (
                          <button
                            key={`${item.atc_code}-${index}`}
                            type="button"
                            onClick={() => handleSelectSubstance(item)}
                            className="w-full text-left p-3 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors group border-b border-slate-100 last:border-0"
                          >
                            <div className="space-y-0.5">
                              <p className="text-sm font-semibold text-text-main group-hover:text-primary-600 transition-colors">
                                {item.TRAD || item.atc_name}
                              </p>
                              {item.TRAD && item.atc_name && (
                                <p className="text-[11px] text-text-muted italic">{item.atc_name}</p>
                              )}
                              {parentGroup && (
                                <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
                                  Grupo: {parentGroup}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {item.adm_r && item.adm_r !== "NA" && (
                                <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold uppercase border border-slate-200">
                                  Vía: {item.adm_r}
                                </span>
                              )}
                              {item.ddd && item.ddd !== "NA" && (
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">
                                  DDD: {item.ddd} {item.uom}
                                </span>
                              )}
                              <span className="font-mono text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100 font-bold shrink-0">
                                {item.atc_code}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-text-muted text-sm italic">
                        No se encontraron principios activos para "{searchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Field label="ATC Code">
                <Input name="atcCode" value={formData.atcCode} onChange={handleChange} />
              </Field>
              <Field label="ATC Group">
                <Input name="atcGroup" value={formData.atcGroup} onChange={handleChange} />
              </Field>
            </div>

            <Select
              label="¿Dosis diaria definida (DDD)?"
              name="hasDdd"
              value={formData.hasDdd}
              onChange={handleChange}
              options={["SI", "NO"]}
            />

            {/* Lógica Condicional: Solo si el usuario elige "SI" */}
            {formData.hasDdd === "SI" && (
              <div className="space-y-4 mt-6 pt-6 border-t border-border">
                {formData.dddList.map((item, index) => (
                  <div key={index} className="flex gap-3 items-start border border-border p-5 rounded-xl bg-surface shadow-sm">
                    <Field label="DDD (Número)">
                      <Input
                        type="number"
                        value={item.numero}
                        onChange={(e) => handleArrayChange("dddList", index, "numero", e.target.value)}
                      />
                    </Field>
                    <div className="w-full">
                      <Select
                        label="Unidades"
                        value={item.unidad}
                        onChange={(e) => handleArrayChange("dddList", index, "unidad", e.target.value)}
                        options={["mg", "g", "ml", "UI"]}
                        placeholder="Elegir..."
                      />
                    </div>
                    <Field label="Vía Administración">
                      <Input
                        value={item.viaAdministracion}
                        onChange={(e) => handleArrayChange("dddList", index, "viaAdministracion", e.target.value)}
                      />
                    </Field>

                    {/* Botón Eliminar Fila (Solo se muestra si hay más de 1 fila) */}
                    {formData.dddList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem("dddList", index)}
                        className="mt-6 p-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        title="Eliminar fila"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addArrayItem("dddList", { numero: "", unidad: "", viaAdministracion: "" })}
                  className="flex items-center gap-2 text-primary-600 hover:text-primary-800 text-sm font-semibold transition-colors mt-2"
                >
                  <Plus size={16} /> Agregar otra Dosis (DDD)
                </button>
              </div>
            )}
          </div>
        </div>
      </Accordion>

      {/* =======================================
          ACCORDION 6: A.5 Forma de administración
      ======================================= */}
      <Accordion title="A.5 Forma de administración" defaultOpen={true}>
        <div className="space-y-4">
          <Field label="Forma de administración (según FT)">
            <Textarea
              name="formaAdministracion"
              value={formData.formaAdministracion}
              onChange={handleChange}
              rows={4}
              placeholder="Describa la forma de administración..."
            />
          </Field>
        </div>
      </Accordion>
    </div>
  );
}
