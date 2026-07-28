import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { FileDown, FileUp, XCircle, ChevronLeft, ChevronRight, ClipboardList, AlertTriangle, FileText, CheckSquare, BarChart4, Wrench, Globe, Dna } from "lucide-react";

const sections = [
  { id: "a", label: "Sección A", icon: ClipboardList },
  { id: "b", label: "Sección B", icon: AlertTriangle },
  { id: "c", label: "Sección C", icon: FileText },
  { id: "d", label: "Sección D", icon: CheckSquare },
  { id: "e", label: "Sección E", icon: BarChart4 },
  { id: "f", label: "Sección F — Fichas Técnicas", icon: Wrench },
  { id: "g", label: "Sección G — Vigiaccess", icon: Globe },
  { id: "h", label: "Farmacogenómica", icon: Dna },
];

export default function NuevoIPSSidebar({ isCollapsed, onToggle, versionId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = versionId ? `/app/ips/edit/${versionId}` : `/app/ips/new`;

  const handleSalir = () => {
    const confirmacion = window.confirm(
      "¿Estás seguro de que deseas salir? Se perderán todos los datos no guardados de este formulario."
    );

    if (confirmacion) {
      // Limpiar todas las claves de sessionStorage relacionadas con el formulario IPS
      const keysToRemove = [
        "seccionA_formData",
        "seccionB_formData",
        "seccionC_formData",
        "seccionD_formData",
        "seccionE_analyses",
        "seccionG_vigiaccessData",
        "seccionH_pgxData"
      ];
      
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      // Navegar de regreso a la tabla de control
      navigate("/app/ips-control");
    }
  };

  const handleExportar = () => {
    const keys = [
      "seccionA_formData",
      "seccionB_formData",
      "seccionC_formData",
      "seccionD_formData",
      "seccionE_analyses",
      "seccionG_vigiaccessData",
      "seccionH_pgxData"
    ];
    const data = {};
    keys.forEach(key => {
      const val = sessionStorage.getItem(key);
      if (val) {
        try {
          data[key] = JSON.parse(val);
        } catch (e) {
          data[key] = val;
        }
      }
    });

    if (Object.keys(data).length === 0) {
      alert("No hay datos en el formulario para exportar.");
      return;
    }

    // Intentar obtener el nombre del IFA o Producto para el nombre del archivo
    let namePart = "Borrador";
    if (data.seccionA_formData) {
      const info = data.seccionA_formData;
      if (info.ifaName) namePart = info.ifaName;
      else if (info.productName) namePart = info.productName;
    }

    // Limpiar nombre del archivo de caracteres no permitidos
    const cleanName = namePart.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `IPS_${cleanName}_${dateStr}.json`;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportar = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const expectedKeys = [
          "seccionA_formData",
          "seccionB_formData",
          "seccionC_formData",
          "seccionD_formData",
          "seccionE_analyses",
          "seccionG_vigiaccessData",
          "seccionH_pgxData"
        ];
        
        let importedCount = 0;
        expectedKeys.forEach(key => {
          if (data[key]) {
            const valStr = typeof data[key] === "object" ? JSON.stringify(data[key]) : data[key];
            sessionStorage.setItem(key, valStr);
            importedCount++;
          }
        });

        if (importedCount === 0) {
          alert("Error: El archivo JSON no contiene una estructura válida de borrador de AlessaIPS.");
          return;
        }

        alert(`🎉 ¡Borrador importado correctamente! Se cargaron ${importedCount} secciones. La pantalla se recargará para refrescar la información.`);
        window.location.reload();
      } catch (err) {
        alert("Ocurrió un error al procesar el archivo JSON: " + err.message);
      }
    };
    reader.readAsText(file);
    // Limpiar el input para permitir volver a cargar el mismo archivo si es necesario
    e.target.value = "";
  };

  return (
    <>

      <div className={`bg-[#312E81] h-full flex flex-col transition-all duration-300 ${isCollapsed ? "w-20" : "w-72"}`}>

      {/* HEADER & TOGGLE */}
      <div className={`pt-6 pb-4 px-6 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed && (
          <div className="flex-1 overflow-hidden pr-2">
            <h1 className="text-[17px] font-bold leading-tight text-white truncate">
              Nuevo IPS
            </h1>
            <p className="text-[13px] text-white/80 mt-0.5 truncate">
              Formulario de creación
            </p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
          title={isCollapsed ? "Expandir" : "Contraer"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <hr className="mx-6 border-white/20" />

      {/* SECCIONES */}
      <div className="flex-1 p-4 overflow-auto scrollbar-hide">
        <nav className="flex flex-col gap-2">
          {sections.map((section, idx) => {
            const linkPath = `${basePath}/${section.id}`;
            return (
            <NavLink
              key={section.id}
              to={linkPath}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                  isActive || (idx === 0 && location.pathname === basePath) // Highlight A when at root
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-white hover:bg-white/10"
                } ${isCollapsed ? "justify-center px-0 mx-2" : "mx-4"}`
              }
              title={isCollapsed ? section.label : ""}
            >
              <section.icon size={22} className="flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                  {section.label}
                </span>
              )}
            </NavLink>
          )})}
        </nav>
      </div>

      {/* FOOTER ACTIONS */}
      <hr className="mx-6 border-white/20" />
      <div className="mt-2 mb-4 flex flex-col gap-1">

        <button
          onClick={handleExportar}
          className={`flex items-center gap-3 px-6 py-3 text-white hover:bg-white/10 transition-colors ${isCollapsed ? "justify-center px-0 mx-2 w-auto rounded-xl" : "rounded-xl mx-4"}`}
          title="Exportar borrador (.json)"
        >
          <FileDown size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="font-medium text-[14px]">Exportar Borrador</span>}
        </button>

        <div className="relative">
          <input 
            type="file" 
            id="import-form-json" 
            accept=".json" 
            onChange={handleImportar} 
            className="hidden" 
          />
          <label
            htmlFor="import-form-json"
            className={`flex items-center gap-3 px-6 py-3 text-white hover:bg-white/10 transition-colors cursor-pointer ${isCollapsed ? "justify-center px-0 mx-2 w-auto rounded-xl" : "rounded-xl mx-4"}`}
            title="Importar borrador (.json)"
          >
            <FileUp size={20} className="flex-shrink-0" />
            {!isCollapsed && <span className="font-medium text-[14px]">Importar Borrador</span>}
          </label>
        </div>

        <button
          onClick={handleSalir}
          className={`flex items-center gap-3 px-6 py-3 text-orange-400 hover:bg-white/10 transition-colors ${isCollapsed ? "justify-center px-0 mx-2 w-auto rounded-xl" : "rounded-xl mx-4 mt-1"}`}
          title="Salir"
        >
          <XCircle size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="font-medium text-[14px]">Salir</span>}
        </button>
      </div>
    </div>
    </>
  );
}