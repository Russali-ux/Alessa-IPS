import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { MoreVertical, Plus, Upload } from "lucide-react";

/**
 * 🔹 DataTable reutilizable (con carga de datos e importación)
 * -------------------------------------------------------------
 * Props principales:
 * - title: string
 * - columns: [{ key, label, filterable?, render? }]
 * - data?: array               (modo controlado)
 * - dataSource?: string        (JSON / endpoint backend)
 * - actions?: [{ label, onClick, className? }]
 * - showAddButton?: boolean
 * - onAdd?: function
 * - enableImport?: boolean
 * - onImport?: function        (hook para CSV/XLS)
 * - rowsPerPageOptions?: number[]
 * - defaultRowsPerPage?: number
 * - stickyActions?: boolean
 */

export default function DataTable({
  title,
  columns = [],
  data: externalData,
  dataSource,
  actions = [],
  showAddButton = false,
  onAdd,
  enableImport = false,
  onImport,
  rowsPerPageOptions = [10, 25, 50, 100],
  defaultRowsPerPage = 25,
  stickyActions = true,
  // New prop: list of column keys that should NOT be rendered in the UI table
  hiddenColumns = [],
  headerActions,
  stickyColumnsCount = 2,
}) {
  const [data, setData] = useState(externalData || []);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  // Dynamic sticky column offset calculator
  const getLeftOffset = (colIdx) => {
    let offset = 0;
    if (stickyActions && actions.length > 0) {
      offset += 48; // Actions column width
    }
    for (let i = 0; i < colIdx; i++) {
      const prevCol = columns[i];
      if (!hiddenColumns.includes(prevCol.key)) {
        const prevWidth = parseInt(prevCol.width) || (i === 0 ? 100 : 200);
        offset += prevWidth;
      }
    }
    return offset;
  };


  // -------------------------------------------------------------
  // ⚡ Carga de datos (JSON o Backend)
  // -------------------------------------------------------------
  useEffect(() => {
    if (externalData) {
      setData(externalData);
      return;
    }

    if (dataSource) {
      fetch(dataSource)
        .then((res) => res.json())
        .then((json) => setData(json))
        .catch((err) => console.error("Error cargando datos:", err));
    }
  }, [externalData, dataSource]);

  // -------------------------------------------------------------
  // ⚡ Importación CSV / XLS / XLSX (hook)
  // -------------------------------------------------------------
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (onImport) {
      onImport(file, setData);
    } else {
      console.warn("onImport no definido");
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // -------------------------------------------------------------
  // ⚡ Filtrado y Ordenamiento
  // -------------------------------------------------------------
  const filteredData = useMemo(() => {
    let result = data.filter((row) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value || value === "all") return true;
        
        const colDef = columns.find(c => c.key === key);
        if (colDef && colDef.filterOptions) {
          // Exact match for select filters
          return row[key]?.toString() === value;
        }
        
        // Partial match for text filters
        return row[key]?.toString().toLowerCase().includes(value.toLowerCase());
      })
    );

    if (sortConfig !== null) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return result;
  }, [data, filters, sortConfig]);

  // -------------------------------------------------------------
  // 🔹 Paginación
  // -------------------------------------------------------------
  const totalRows = filteredData.length;
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = filteredData.slice(start, end);
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  return (
    <Card className="shadow-xl rounded-2xl w-full">
      <CardContent>

        {/* ------------------------------------------------------- */}
        {/* 🔹 Header                                               */}
        {/* ------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold">{title}</h2>
            {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
          </div>

          <div className="flex items-center gap-2">
            {showAddButton && (
              <Button onClick={onAdd} variant="outline" className="gap-2">
                <Plus size={16} /> Nuevo
              </Button>
            )}

            {enableImport && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  className="hidden"
                  onChange={handleImport}
                />
                <Button variant="outline" className="gap-2">
                  <Upload size={16} /> Importar
                </Button>
              </label>
            )}

            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="border rounded-lg px-2 py-1 text-sm"
            >
              {rowsPerPageOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* 🔹 Tabla                                                */}
        {/* ------------------------------------------------------- */}
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                {actions.length > 0 && (
                  <th 
                    className="border p-2 w-12 text-center bg-gray-100"
                    style={{
                      position: "sticky",
                      top: 0,
                      left: 0,
                      zIndex: 50,
                    }}
                  >
                    <MoreVertical size={18} />
                  </th>
                )}

                {columns.map((col, idx) => {
                  if (hiddenColumns.includes(col.key)) return null;

                  // Calcular cuántas columnas visibles hay antes de esta
                  const visibleBefore = columns.slice(0, idx).filter(c => !hiddenColumns.includes(c.key)).length;
                  const isSticky = visibleBefore < stickyColumnsCount;
                  const leftOffset = isSticky ? getLeftOffset(idx) : 0;
                  const colWidth = col.width || (visibleBefore === 0 ? "100px" : "200px");

                  return (
                    <th 
                      key={col.key} 
                      className="border p-2 bg-gray-100"
                      style={{
                        width: colWidth,
                        minWidth: colWidth,
                        position: "sticky",
                        top: 0,
                        ...(isSticky 
                          ? { left: `${leftOffset}px`, zIndex: 45, backgroundColor: "#ffffff" } 
                          : { zIndex: 40 }
                        )
                      }}
                    >
                      <div className="flex flex-col">
                        <div 
                          className={`flex items-center gap-1 ${col.sortable ? "cursor-pointer hover:text-blue-600" : ""}`}
                          onClick={() => col.sortable && handleSort(col.key)}
                          title={col.sortable ? "Click para ordenar" : ""}
                        >
                          <span className="font-semibold text-[10px]">{col.label}</span>
                          {sortConfig?.key === col.key && (
                            <span className="text-[10px]">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                        {col.filterable !== false && (
                          col.filterOptions ? (
                            <select
                              className="h-5 text-xs mt-1 border rounded border-gray-300"
                              onChange={(e) => setFilters({ ...filters, [col.key]: e.target.value })}
                            >
                              <option value="all">Todos</option>
                              {col.filterOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              className="h-5 text-xs mt-1"
                              placeholder="Filtrar"
                              onChange={(e) =>
                                setFilters({ ...filters, [col.key]: e.target.value })
                              }
                            />
                          )
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {pageData.map((row, index) => (
                <tr key={index} className="group hover:bg-violet-50 transition-colors">
                  {actions.length > 0 && (
                    <td className={`border p-2 text-center bg-white group-hover:bg-violet-50 transition-colors z-30 ${stickyActions ? "sticky left-0" : ""}`}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical size={18} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-white border shadow-lg rounded-md z-50">
                          {actions.map((action, i) => (
                            <DropdownMenuItem
                              key={i}
                              className={action.className}
                              onClick={() => action.onClick(row, index)}
                            >
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}

                  {columns.map((col, idx) => {
                    if (hiddenColumns.includes(col.key)) return null;

                    const visibleBefore = columns.slice(0, idx).filter(c => !hiddenColumns.includes(c.key)).length;
                    const isSticky = visibleBefore < stickyColumnsCount;
                    const leftOffset = isSticky ? getLeftOffset(idx) : 0;
                    const colWidth = col.width || (visibleBefore === 0 ? "100px" : "200px");

                    return (
                      <td 
                        key={col.key} 
                        className={`border p-2 text-xs z-30 transition-colors ${isSticky ? "sticky bg-white group-hover:bg-violet-50" : "group-hover:bg-violet-50"}`}
                        style={{
                          width: colWidth,
                          minWidth: colWidth,
                          ...(isSticky ? { position: "sticky", left: `${leftOffset}px`, zIndex: 30 } : {})
                        }}
                      >
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ------------------------------------------------------- */}
        {/* 🔹 Footer / Paginación                                  */}
        {/* ------------------------------------------------------- */}
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-600">
            Mostrando {Math.min(start + 1, totalRows)}–{Math.min(end, totalRows)} de {totalRows}
          </p>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPage(page - 1)} disabled={page === 1}>
              Anterior
            </Button>
            <span>Página {page} de {totalPages}</span>
            <Button variant="outline" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}