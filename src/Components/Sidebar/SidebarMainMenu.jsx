import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/button";
import {
  LayoutDashboard,
  Table2,
  FilePlus2,
  FolderKanban,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowLeftRight,
  AlertTriangle
} from "lucide-react";

export default function SidebarMainMenu({ isCollapsed, onToggle, isAdmin }) {
  const location = useLocation();
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const handleSwitchWorkspace = () => {
    setIsSwitchModalOpen(true);
  };

  const confirmSwitchWorkspace = () => {
    // Limpiar variables de entorno para evitar cruzar información
    localStorage.removeItem('currentWorkspaceId');
    sessionStorage.clear();
    // Redirigir a /app, lo que forzará al Router (App.jsx) a mostrar el selector de workspaces
    window.location.href = '/app';
  };

  const menu = isAdmin ? [
    {
      icon: LayoutDashboard,
      label: "Panel de Control",
      path: "/admin/",
    },
    {
      icon: SettingsIcon,
      label: "Workspaces",
      path: "/admin/settings",
    }
  ] : [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/app/",
    },
    {
      icon: Table2,
      label: "Tabla Control IPS",
      path: "/app/ips-control",
    },
    {
      icon: FilePlus2,
      label: "Crear Nuevo IPS",
      path: "/app/ips/new",
    },
    {
      icon: FolderKanban,
      label: "Gestión Documental",
      path: "/app/gestion-documental",
    },
    {
      icon: SettingsIcon,
      label: "Configuración",
      path: "/app/settings",
    },
  ];

  const currentWorkspaceId = localStorage.getItem('currentWorkspaceId');
  const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
  const currentWorkspace = workspaces.find(w => String(w.id) === String(currentWorkspaceId));

  return (
    <div className="h-full flex flex-col">
      {/* HEADER & TOGGLE */}
      <div className={`pt-6 pb-4 px-6 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed && (
          <div className="flex-1 overflow-hidden pr-2">
            <h1 className="text-[17px] font-bold leading-tight text-white truncate">
              IPS Automate
            </h1>
            <p className="text-[13px] text-white/80 mt-0.5 truncate" title={isAdmin ? 'ADMIN CENTER' : currentWorkspace?.name}>
              {isAdmin ? 'ADMIN CENTER' : (currentWorkspace?.name || 'PRISM WORKSPACE')}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
          title={isCollapsed ? "Expandir" : "Contraer"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <hr className="mx-6 border-white/20" />

      {/* NAVIGATION */}
      <div className="flex-1 p-4 overflow-auto scrollbar-hide">
        <nav className="flex flex-col gap-2">
          {menu.map(({ icon: Icon, label, path }) => {
            const active =
              (path === "/admin/" || path === "/app/")
                ? location.pathname === path
                : location.pathname.startsWith(path);

            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${
                  active
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-white hover:bg-white/10"
                } ${isCollapsed ? "justify-center px-0 mx-2" : "mx-4"}`}
                title={isCollapsed ? label : ""}
              >
                <Icon size={22} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* FOOTER */}
      <hr className="mx-6 border-white/20" />
      <div className="mt-2 mb-4 flex flex-col gap-1">
        {(!isAdmin && workspaces.length > 1) && (
          <button 
            onClick={handleSwitchWorkspace}
            className={`w-full flex items-center gap-3 px-6 py-3 text-blue-400 hover:bg-white/10 transition-colors ${isCollapsed ? "justify-center px-0 mx-2 w-auto rounded-xl" : "rounded-xl mx-4 w-[calc(100%-2rem)]"}`}
            title={isCollapsed ? "Cambiar de Workspace" : ""}
          >
            <ArrowLeftRight size={20} className="flex-shrink-0" />
            {!isCollapsed && <span className="font-medium text-[14px]">Cambiar Workspace</span>}
          </button>
        )}
        <button 
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-6 py-3 text-orange-400 hover:bg-white/10 transition-colors ${isCollapsed ? "justify-center px-0 mx-2 w-auto rounded-xl" : "rounded-xl mx-4 w-[calc(100%-2rem)]"}`}
          title={isCollapsed ? "Cerrar Sesión" : ""}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="font-medium text-[14px]">Cerrar sesión</span>}
        </button>
        {!isCollapsed && (
          <div className="px-6 pt-3 flex flex-col gap-2">
            <p className="text-[11px] text-white/50 text-center">
              {isAdmin ? 'Alessa Admin Center v1.0' : 'AlessaPRISM v1.0'}
            </p>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isSwitchModalOpen} 
        onClose={() => setIsSwitchModalOpen(false)}
        title="Cambiar Workspace"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-orange-600 bg-orange-50 p-4 rounded-xl border border-orange-200">
            <AlertTriangle className="flex-shrink-0" size={24} />
            <p className="text-sm font-medium">
              Cualquier dato o avance que no haya sido guardado previamente se perderá.
            </p>
          </div>
          <p className="text-gray-600 mb-6 text-sm">
            ¿Estás seguro de que deseas cambiar de espacio de trabajo? Serás redirigido a la pantalla de selección.
          </p>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsSwitchModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="default" onClick={confirmSwitchWorkspace}>
              Cambiar Workspace
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}