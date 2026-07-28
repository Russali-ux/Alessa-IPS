import { useState, useRef, useCallback, useEffect } from "react";
import { useIPSStore } from "../../store/ipsStore";
import {
  Upload, FileText, FolderOpen, CheckCircle2, XCircle,
  Loader2, Download, Trash2, Plus, AlertTriangle, RefreshCcw,
  Building2, ChevronRight, File, RotateCcw
} from "lucide-react";

// ── Utilidades ──────────────────────────────────────────────────────────────

const ACCEPTED_EXTS = [".doc", ".docx"];
const SESSION_KEY_CLIENT = "seccionF_clientName";
const SESSION_KEY_ITEMS  = "seccionF_fileItems";

function getFileExt(name) {
  return name.slice(name.lastIndexOf(".")).toLowerCase();
}

function isValidFile(name) {
  return ACCEPTED_EXTS.includes(getFileExt(name));
}

function getBaseName(name) {
  return name.slice(0, name.lastIndexOf("."));
}

function buildOutputName(name) {
  return `${getBaseName(name)} FT FIXED.docx`;
}

/**
 * Serializa un item para guardarlo en sessionStorage.
 * El objeto File no es serializable; se omite y se marca el status
 * como "needs_reupload" si el item estaba pendiente.
 */
function serializeItem(item) {
  const { file, ...rest } = item;
  // Si tenía archivo y estaba pendiente/error, indicar que necesita re-subir
  if (file && (rest.status === "pending" || rest.status === "processing")) {
    return { ...rest, status: "needs_reupload" };
  }
  return rest;
}

/**
 * Restaura items desde sessionStorage.
 * Los items "needs_reupload" no tienen File, el resto está completo.
 */
function deserializeItems(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(item => ({ ...item, file: null }))
      : [];
  } catch {
    return [];
  }
}


// ── Badge de estado ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    pending:       { label: "Pendiente",        cls: "bg-slate-100 text-slate-500",   icon: null },
    processing:    { label: "Procesando…",     cls: "bg-amber-100 text-amber-700",   icon: <Loader2 size={12} className="animate-spin" /> },
    success:       { label: "Procesado ✓",      cls: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 size={12} /> },
    error:         { label: "Error",            cls: "bg-red-100 text-red-600",       icon: <XCircle size={12} /> },
    rejected:      { label: "No válido",        cls: "bg-orange-100 text-orange-600", icon: <AlertTriangle size={12} /> },
    needs_reupload:{ label: "Re-subir archivo", cls: "bg-violet-100 text-violet-700", icon: <RotateCcw size={12} /> },
  };
  const { label, cls, icon } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cls}`}>
      {icon}{label}
    </span>
  );
}

// ── Toast simple ─────────────────────────────────────────────────────────────

function Toast({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto
            ${t.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
          style={{ animation: "slideInRight 0.3s ease" }}
        >
          {t.type === "success" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
          <span>{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="ml-2 opacity-70 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Tarjeta de archivo ────────────────────────────────────────────────────────

function FileCard({ item, index, onFolderNameChange, onRemove, onDownload }) {
  const isProcessed    = item.status === "success";
  const isProcessing   = item.status === "processing";
  const needsReupload  = item.status === "needs_reupload";

  return (
    <div className={`relative rounded-2xl border transition-all duration-300
      ${item.status === "success"       ? "border-emerald-200 bg-emerald-50/40" :
        item.status === "error"         ? "border-red-200 bg-red-50/30" :
        item.status === "rejected"      ? "border-orange-200 bg-orange-50/30" :
        item.status === "needs_reupload"? "border-violet-200 bg-violet-50/30" :
        "border-slate-200 bg-white"}
      shadow-sm hover:shadow-md`}
    >
      {/* Barra superior de color por estado */}
      <div className={`h-1 rounded-t-2xl w-full
        ${item.status === "success"        ? "bg-emerald-400" :
          item.status === "error"          ? "bg-red-400" :
          item.status === "processing"     ? "bg-amber-400 animate-pulse" :
          item.status === "rejected"       ? "bg-orange-400" :
          item.status === "needs_reupload" ? "bg-violet-400" :
          "bg-slate-200"}`}
      />

      <div className="p-4">
        {/* Fila principal */}
        <div className="flex items-start gap-3">
          {/* Ícono */}
          <div className={`p-2.5 rounded-xl shrink-0
            ${item.status === "success"       ? "bg-emerald-100 text-emerald-600" :
              item.status === "error"         ? "bg-red-100 text-red-500" :
              item.status === "needs_reupload"? "bg-violet-100 text-violet-600" :
              "bg-blue-50 text-blue-600"}`}
          >
            <FileText size={20} />
          </div>

          {/* Info y controles */}
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Nombre + badge */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800 truncate max-w-[260px]" title={item.name}>
                {item.name}
              </span>
              <StatusBadge status={item.status} />
            </div>

            {/* Aviso de re-subida */}
            {needsReupload && (
              <p className="text-[11px] text-violet-700 bg-violet-50 rounded-lg px-3 py-2 leading-relaxed border border-violet-200">
                ⚠️ Este archivo estaba pendiente. Por favor arrástralo nuevamente al área de carga para procesarlo.
              </p>
            )}

            {/* Preview nombre de salida */}
            {item.status !== "rejected" && item.status !== "needs_reupload" && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ChevronRight size={11} />
                <span className="font-mono text-indigo-500 font-medium">{buildOutputName(item.name)}</span>
              </div>
            )}

            {/* Input nombre de carpeta */}
            {item.status !== "rejected" && (
              <div className="flex items-center gap-2">
                <FolderOpen size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={item.folderName}
                  onChange={e => onFolderNameChange(index, e.target.value)}
                  disabled={isProcessed || isProcessing}
                  placeholder="Nombre de carpeta destino"
                  className={`flex-1 h-8 text-xs px-3 rounded-lg border transition-all outline-none
                    ${isProcessed
                      ? "border-slate-200 bg-slate-50 text-slate-400 cursor-default"
                      : "border-slate-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"}
                  `}
                />
              </div>
            )}

            {/* Ruta destino (cuando procesado) */}
            {item.status === "success" && item.destDir && (
              <p className="text-[10px] text-slate-400 font-mono break-all leading-relaxed">
                📁 {item.destDir}
              </p>
            )}

            {/* Mensaje de error */}
            {item.status === "error" && item.errorMsg && (
              <p className="text-[11px] text-red-500 bg-red-50 rounded-lg px-3 py-2 leading-relaxed border border-red-200">
                {item.errorMsg}
              </p>
            )}

            {/* Mensaje de rechazo */}
            {item.status === "rejected" && (
              <p className="text-[11px] text-orange-600">
                Solo se aceptan archivos <strong>.doc</strong> o <strong>.docx</strong>
              </p>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-1.5 shrink-0">
            {item.status === "success" && (
              <button
                onClick={() => onDownload(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700
                  text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
                title="Descargar Word procesado"
              >
                <Download size={13} />
                Descargar
              </button>
            )}
            {!isProcessed && !isProcessing && (
              <button
                onClick={() => onRemove(index)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Eliminar de la lista"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function SeccionF() {
  // ── Inicialización desde sessionStorage ──────────────────────────────────

  const [clientName, setClientName] = useState(() => {
    // Prioridad: valor guardado previamente en Sección F
    const saved = sessionStorage.getItem(SESSION_KEY_CLIENT);
    if (saved) return saved;
    // Fallback: pre-cargar desde Sección A
    try {
      const secA = JSON.parse(sessionStorage.getItem("seccionA_formData") || "{}");
      return secA.trsName || "";
    } catch { return ""; }
  });

  const [fileItems, setFileItems] = useState(() => {
    const raw = sessionStorage.getItem(SESSION_KEY_ITEMS);
    return raw ? deserializeItems(raw) : [];
  });

  const [isDragging, setIsDragging] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const fileInputRef = useRef(null);
  const toastCounterRef = useRef(0);

  // ── Persistencia automática en sessionStorage ─────────────────────────────

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY_CLIENT, clientName);
  }, [clientName]);

  useEffect(() => {
    const serialized = fileItems.map(serializeItem);
    sessionStorage.setItem(SESSION_KEY_ITEMS, JSON.stringify(serialized));
  }, [fileItems]);

  // ── Toast helpers ──────────────────────────────────────────────────────────

  const addToast = useCallback((message, type = "success") => {
    const id = ++toastCounterRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // ── Agregar archivos ───────────────────────────────────────────────────────

  const addFiles = useCallback((newFiles) => {
    const items = Array.from(newFiles).map(file => ({
      file,
      name: file.name,
      folderName: getBaseName(file.name),
      status: isValidFile(file.name) ? "pending" : "rejected",
      outputPath: null,
      destDir: null,
      errorMsg: null,
    }));

    // Evitar duplicados por nombre;
    // si el item existía como needs_reupload, reemplazarlo con el nuevo File
    setFileItems(prev => {
      const result = [...prev];
      items.forEach(newItem => {
        const existingIdx = result.findIndex(i => i.name === newItem.name);
        if (existingIdx === -1) {
          result.push(newItem);
        } else if (result[existingIdx].status === "needs_reupload") {
          // Restaurar el item con el nuevo archivo
          result[existingIdx] = {
            ...result[existingIdx],
            file: newItem.file,
            status: "pending",
          };
        }
        // Si ya existe y no necesita re-subir, ignorar duplicado
      });
      return result;
    });
  }, []);

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e) => {
    if (e.target.files.length) addFiles(e.target.files);
    e.target.value = "";
  };

  // ── Cambiar nombre de carpeta ──────────────────────────────────────────────

  const handleFolderNameChange = (index, value) => {
    setFileItems(prev => prev.map((item, i) =>
      i === index ? { ...item, folderName: value } : item
    ));
  };

  // ── Eliminar archivo ───────────────────────────────────────────────────────

  const handleRemove = (index) => {
    setFileItems(prev => prev.filter((_, i) => i !== index));
  };

  // ── Limpiar todo ───────────────────────────────────────────────────────────

  const handleClearAll = () => {
    setFileItems([]);
    sessionStorage.removeItem(SESSION_KEY_ITEMS);
  };

  // ── Descargar archivo individual ───────────────────────────────────────────

  const handleDownload = async (item) => {
    if (!item.outputPath) return;
    try {
      const url = `http://127.0.0.1:5000/api/download-ft?path=${encodeURIComponent(item.outputPath)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("No se pudo descargar el archivo");
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = item.outputFilename || buildOutputName(item.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      addToast(`Error al descargar: ${err.message}`, "error");
    }
  };

  // ── Procesar todo ──────────────────────────────────────────────────────────

  const handleProcessAll = async () => {
    // Solo items con objeto File real (pendientes no restaurados desde sessionStorage)
    const currentPending = fileItems.filter(i => i.status === "pending" && i.file);

    if (!currentPending.length) {
      const needReupload = fileItems.filter(i => i.status === "needs_reupload");
      if (needReupload.length > 0) {
        addToast(`⚠️ ${needReupload.length} archivo(s) deben cargarse nuevamente antes de procesar`, "error");
      } else {
        addToast("No hay archivos pendientes para procesar.", "error");
      }
      return;
    }

    if (!clientName.trim()) {
      addToast("Por favor ingresa el nombre del cliente antes de procesar.", "error");
      return;
    }

    setIsProcessingAll(true);

    // Marcar como "processing" solo los que tienen File real
    setFileItems(prev => prev.map(item =>
      (item.status === "pending" && item.file) ? { ...item, status: "processing" } : item
    ));

    // Construir FormData
    const formData = new FormData();
    formData.append("clientName", clientName.trim());

    currentPending.forEach(item => {
      formData.append("files[]", item.file, item.name);
      formData.append("folderNames[]", item.folderName || getBaseName(item.name));
    });

    try {
      const response = await fetch("http://127.0.0.1:5000/api/process-ft", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error del servidor");
      }

      const data = await response.json();
      const results = data.results || [];

      // Crear mapa de resultados por nombre de archivo
      const resultMap = {};
      results.forEach(r => { resultMap[r.filename] = r; });

      setFileItems(prev => prev.map(item => {
        if (item.status !== "processing") return item;
        const result = resultMap[item.name];
        if (!result) return { ...item, status: "error", errorMsg: "Sin respuesta del servidor" };
        if (result.status === "success") {
          addToast(`✓ ${item.name} procesado correctamente`, "success");
          return {
            ...item,
            status: "success",
            outputPath: result.outputPath,
            outputFilename: result.outputFilename,
            destDir: result.destDir,
            errorMsg: null,
          };
        } else {
          addToast(`✗ Error en ${item.name}`, "error");
          return {
            ...item,
            status: "error",
            errorMsg: result.error || "Error desconocido",
          };
        }
      }));

    } catch (err) {
      // Marcar todos como error
      setFileItems(prev => prev.map(item =>
        item.status === "processing"
          ? { ...item, status: "error", errorMsg: err.message }
          : item
      ));
      addToast(`Error: ${err.message}`, "error");
    } finally {
      setIsProcessingAll(false);
    }
  };

  // ── Reintentar archivos con error ─────────────────────────────────────────

  const handleRetryErrors = () => {
    setFileItems(prev => prev.map(item =>
      item.status === "error" ? { ...item, status: "pending", errorMsg: null } : item
    ));
  };

  // ── Estadísticas ───────────────────────────────────────────────────────────

  const stats = {
    total:        fileItems.length,
    pending:      fileItems.filter(i => i.status === "pending" && i.file).length,
    needsReupload:fileItems.filter(i => i.status === "needs_reupload").length,
    success:      fileItems.filter(i => i.status === "success").length,
    error:        fileItems.filter(i => i.status === "error").length,
    rejected:     fileItems.filter(i => i.status === "rejected").length,
  };

  const hasErrors    = stats.error > 0;
  const hasPending   = stats.pending > 0 || stats.needsReupload > 0;
  const hasAny       = stats.total > 0;
  const canProcess   = stats.pending > 0;  // Solo si hay items con File real

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .ft-card-enter { animation: fadeInUp 0.25s ease; }
      `}</style>

      <div className="space-y-8 pb-12">

        {/* ── TÍTULO ─────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-text-main">SECCIÓN F</h1>
          <p className="text-text-muted mt-1">Procesador de Fichas Técnicas — Conversión a <strong>FT FIXED</strong></p>
        </div>

        {/* ── PANEL CLIENTE ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Datos del Cliente</h2>
              <p className="text-xs text-slate-400">Se usará para organizar la carpeta de destino</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <label className="text-xs font-semibold text-slate-600 shrink-0 w-32">Nombre del cliente</label>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Ej: Laboratorios AlphaPharma S.A."
              className="flex-1 h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white
                outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
            />
          </div>

          {/* Ruta base de destino */}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <FolderOpen size={12} />
            <span>
              E:\Escritorio GC\word to md\
              <span className="text-indigo-500 font-semibold">{clientName.trim() || "<cliente>"}</span>
              \<span className="text-slate-400">&lt;carpeta por archivo&gt;</span>
            </span>
          </div>
        </div>

        {/* ── ZONA DE CARGA ───────────────────────────────────────────────── */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessingAll && fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
            flex flex-col items-center justify-center py-12 px-6 text-center
            ${isDragging
              ? "border-indigo-400 bg-indigo-50 scale-[1.01]"
              : "border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"}
            ${isProcessingAll ? "pointer-events-none opacity-60" : ""}
          `}
        >
          <div className={`p-4 rounded-2xl mb-4 transition-colors
            ${isDragging ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}
          >
            <Upload size={32} />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {isDragging ? "Suelta los archivos aquí" : "Arrastra y suelta archivos Word aquí"}
          </p>
          <p className="text-xs text-slate-400 mt-1">o haz clic para seleccionar</p>
          <div className="mt-3 flex gap-2">
            {[".doc", ".docx"].map(ext => (
              <span key={ext} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-bold font-mono">
                {ext}
              </span>
            ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".doc,.docx"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* ── LISTA DE ARCHIVOS ───────────────────────────────────────────── */}
        {hasAny && (
          <div className="space-y-4">

            {/* Barra de resumen + acciones */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="text-slate-600">{stats.total} archivo{stats.total !== 1 ? "s" : ""}</span>
                {stats.success > 0       && <span className="text-emerald-600">✓ {stats.success} procesados</span>}
                {stats.pending > 0       && <span className="text-amber-600">⏳ {stats.pending} pendientes</span>}
                {stats.needsReupload > 0 && <span className="text-violet-600">🔄 {stats.needsReupload} re-subir</span>}
                {stats.error > 0         && <span className="text-red-500">✗ {stats.error} con error</span>}
                {stats.rejected > 0      && <span className="text-orange-500">⚠ {stats.rejected} rechazados</span>}
              </div>
              <div className="flex gap-2">
                {hasErrors && (
                  <button
                    onClick={handleRetryErrors}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                      text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <RefreshCcw size={12} /> Reintentar errores
                  </button>
                )}
                <button
                  onClick={handleClearAll}
                  disabled={isProcessingAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                    text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={12} /> Limpiar todo
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                    text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Plus size={12} /> Agregar más
                </button>
              </div>
            </div>

            {/* Tarjetas */}
            <div className="space-y-3">
              {fileItems.map((item, idx) => (
                <div key={`${item.name}-${idx}`} className="ft-card-enter">
                  <FileCard
                    item={item}
                    index={idx}
                    onFolderNameChange={handleFolderNameChange}
                    onRemove={handleRemove}
                    onDownload={handleDownload}
                  />
                </div>
              ))}
            </div>

            {/* Barra de progreso global */}
            {stats.total > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Progreso</span>
                  <span>{stats.success} / {stats.total - stats.rejected}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats.total > stats.rejected ? (stats.success / (stats.total - stats.rejected)) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BOTÓN PROCESAR TODO ─────────────────────────────────────────── */}
        {hasPending && (
          <div className="sticky bottom-[80px] z-20">

            {/* Banner informativo cuando hay archivos que necesitan re-subirse */}
            {stats.needsReupload > 0 && stats.pending === 0 && (
              <div className="mb-3 flex items-center gap-2.5 px-4 py-3 bg-violet-50 border border-violet-200 rounded-2xl text-sm text-violet-700">
                <RotateCcw size={15} className="shrink-0" />
                <span>
                  <strong>{stats.needsReupload} archivo{stats.needsReupload !== 1 ? "s" : ""}</strong> necesitan cargarse nuevamente.
                  Arrástralos al área de carga — se asociarán automáticamente.
                </span>
              </div>
            )}

            <button
              onClick={handleProcessAll}
              disabled={isProcessingAll || !canProcess}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm
                transition-all duration-300 shadow-lg
                ${isProcessingAll || !canProcess
                  ? "bg-indigo-300 text-white cursor-not-allowed"
                  : "cursor-pointer bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl hover:-translate-y-0.5"
                }`}
            >
              {isProcessingAll
                ? <><Loader2 size={18} className="animate-spin" /> Procesando fichas técnicas…</>
                : <><File size={18} /> Procesar {stats.pending} ficha{stats.pending !== 1 ? "s" : ""} técnica{stats.pending !== 1 ? "s" : ""}</>
              }
            </button>
          </div>
        )}


        {/* ── ESTADO VACÍO ────────────────────────────────────────────────── */}
        {!hasAny && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <div className="p-5 bg-slate-100 rounded-2xl mb-4">
              <FileText size={40} className="opacity-40" />
            </div>
            <p className="text-sm font-semibold">No hay archivos cargados</p>
            <p className="text-xs mt-1">Arrastra archivos <strong>.doc</strong> o <strong>.docx</strong> hacia el área de carga</p>
          </div>
        )}

      </div>

      {/* ── TOASTS ─────────────────────────────────────────────────────────── */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
}
