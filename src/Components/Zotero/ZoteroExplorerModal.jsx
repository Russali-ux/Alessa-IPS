import React, { useState, useEffect } from 'react';
import { X, Search, Folder, FolderOpen, ChevronRight, ChevronDown, FileText, Check, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { zoteroService } from '../../services/zotero.service';
import { mapZoteroItemToAlessaRow } from '../../services/zoteroMapper';

const CollectionTree = ({ collections, selectedCollection, onSelectCollection, expandedFolders, toggleFolder }) => {
  if (!collections || collections.length === 0) return null;

  return (
    <ul className="space-y-1">
      {collections.map(col => {
        const isExpanded = expandedFolders.has(col.key);
        const isSelected = selectedCollection === col.key;
        const hasChildren = col.children && col.children.length > 0;

        return (
          <li key={col.key} className="select-none">
            <div 
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${
                isSelected ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-slate-100 text-slate-700'
              }`}
              onClick={() => onSelectCollection(col.key, col.name)}
            >
              <div 
                className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) toggleFolder(col.key);
                }}
              >
                {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <div className="w-3" />}
              </div>
              <div className={isSelected ? 'text-primary-600' : 'text-amber-500'}>
                {isExpanded && hasChildren ? <FolderOpen size={16} fill="currentColor" fillOpacity={0.2} /> : <Folder size={16} fill="currentColor" fillOpacity={0.2} />}
              </div>
              <span className="truncate">{col.name}</span>
            </div>
            
            {isExpanded && hasChildren && (
              <div className="pl-4 mt-1 border-l border-slate-200 ml-3">
                <CollectionTree 
                  collections={col.children} 
                  selectedCollection={selectedCollection}
                  onSelectCollection={onSelectCollection}
                  expandedFolders={expandedFolders}
                  toggleFolder={toggleFolder}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default function ZoteroExplorerModal({ isOpen, onClose, onImport }) {
  const [collections, setCollections] = useState([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedCollectionName, setSelectedCollectionName] = useState("");
  
  const [items, setItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  
  const [selectedItemKeys, setSelectedItemKeys] = useState(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadCollections();
    } else {
      // Reset state on close
      setSelectedCollection(null);
      setSelectedCollectionName("");
      setItems([]);
      setSelectedItemKeys(new Set());
      setSearchQuery("");
    }
  }, [isOpen]);

  const loadCollections = async () => {
    try {
      setIsLoadingTree(true);
      const data = await zoteroService.getCollections();
      setCollections(data);
      // Auto expand first level
      const initialExpanded = new Set();
      data.forEach(c => initialExpanded.add(c.key));
      setExpandedFolders(initialExpanded);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTree(false);
    }
  };

  const toggleFolder = (key) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectCollection = async (key, name) => {
    setSelectedCollection(key);
    setSelectedCollectionName(name);
    setSelectedItemKeys(new Set());
    
    try {
      setIsLoadingItems(true);
      const data = await zoteroService.getCollectionItems(key);
      setItems(data);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleToggleItem = (key) => {
    setSelectedItemKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleAllItems = () => {
    if (selectedItemKeys.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedItemKeys(new Set());
    } else {
      const next = new Set();
      filteredItems.forEach(i => next.add(i.key));
      setSelectedItemKeys(next);
    }
  };

  const handleImport = async () => {
    if (selectedItemKeys.size === 0) return;
    try {
      setIsImporting(true);
      const keysArray = Array.from(selectedItemKeys);
      // 1. Fetch full metadata from backend
      const fullItems = await zoteroService.importItems(keysArray);
      
      // 2. Map to Alessa structure
      const mappedRows = fullItems.map(mapZoteroItemToAlessaRow);
      
      // 3. Callback to SeccionE
      onImport(mappedRows);
      
      // 4. Close
      onClose();
    } catch (err) {
      console.error("Error importing items:", err);
      alert("Error al importar los elementos seleccionados.");
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.creators && item.creators.some(c => (c.lastName || c.name || '').toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-inner">
              <span className="font-serif font-bold text-lg">Z</span>
            </div>
            <h2 className="font-medium text-slate-100">
              {selectedCollectionName ? `Buscando en "${selectedCollectionName}"` : "Explorador de Zotero"}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar elementos..." 
                className="bg-slate-800 border border-slate-700 text-sm text-slate-200 rounded-full pl-9 pr-4 py-1.5 focus:outline-none focus:border-slate-500 focus:bg-slate-700 transition-colors w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Content: 2-pane layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Pane: Collections Tree */}
          <div className="w-72 border-r border-slate-200 bg-slate-50/50 flex flex-col overflow-hidden shrink-0">
            <div className="p-3 border-b border-slate-200 bg-slate-100/50">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mi Biblioteca</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {isLoadingTree ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <Loader2 className="animate-spin mb-2" size={24} />
                  <span className="text-xs">Cargando colecciones...</span>
                </div>
              ) : (
                <CollectionTree 
                  collections={collections}
                  selectedCollection={selectedCollection}
                  onSelectCollection={handleSelectCollection}
                  expandedFolders={expandedFolders}
                  toggleFolder={toggleFolder}
                />
              )}
            </div>
          </div>

          {/* Right Pane: Items Table */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="flex items-center px-4 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
              <span className="text-xs font-semibold text-slate-500">
                {selectedItemKeys.size} elementos seleccionados de {filteredItems.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              {!selectedCollection ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <FolderOpen size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                  <p>Selecciona una colección de la izquierda para ver sus artículos</p>
                </div>
              ) : isLoadingItems ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Loader2 className="animate-spin mb-2" size={32} />
                  <p>Cargando artículos...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <FileText size={48} className="mb-4 text-slate-300" strokeWidth={1} />
                  <p>No se encontraron artículos en esta colección</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 w-12">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                          checked={filteredItems.length > 0 && selectedItemKeys.size === filteredItems.length}
                          onChange={handleToggleAllItems}
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold">Título</th>
                      <th className="px-4 py-3 font-semibold w-1/4">Creador</th>
                      <th className="px-4 py-3 font-semibold w-24">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map(item => (
                      <tr 
                        key={item.key} 
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedItemKeys.has(item.key) ? 'bg-primary-50/50' : ''}`}
                        onClick={() => handleToggleItem(item.key)}
                      >
                        <td className="px-4 py-3">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                            checked={selectedItemKeys.has(item.key)}
                            onChange={() => {}} // Handled by tr onClick
                            onClick={(e) => e.stopPropagation()} // Prevent double trigger
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 flex items-center gap-2">
                          <FileText size={16} className="text-slate-400 shrink-0" />
                          <span className="line-clamp-2" title={item.title}>{item.title}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={item.creators.map(c => c.lastName || c.name).join(', ')}>
                          {item.creators.map(c => c.lastName || c.name).join(', ') || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.date || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isImporting} className="bg-white">
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={selectedItemKeys.size === 0 || isImporting}
            className="bg-primary-600 hover:bg-primary-700 text-white min-w-[140px]"
          >
            {isImporting ? (
              <><Loader2 className="animate-spin mr-2" size={16} /> Importando...</>
            ) : (
              <><Check size={16} className="mr-2" /> Importar {selectedItemKeys.size > 0 ? selectedItemKeys.size : ''} Elementos</>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
