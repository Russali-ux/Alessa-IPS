import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BrowserRouter, Routes, Route, useLocation, } from "react-router-dom";

import SidebarMainMenu from "./Components/Sidebar/SidebarMainMenu";
import IPSControlTablePage from "./pages/TablaControl/TablaControl";
import NuevoIPSLayout from "./pages/NuevoIPS/NuevoIPSLayout";
import NuevoIPSSidebar from "./pages/NuevoIPS/NuevoIPSSidebar";
import SeccionA from "./pages/NuevoIPS/SeccionA";
import SeccionB from "./pages/NuevoIPS/SeccionB";
import SeccionC from "./pages/NuevoIPS/SeccionC";
import SeccionD from "./pages/NuevoIPS/SeccionD";
import SeccionE from "./pages/NuevoIPS/SeccionE";
import SeccionF from "./pages/NuevoIPS/SeccionF";
import SeccionG from "./pages/NuevoIPS/SeccionG";
import SeccionH from "./pages/NuevoIPS/SeccionH";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import GestionDocumental from "./pages/GestionDocumental/GestionDocumental";
import WorkspaceDashboard from "./pages/Dashboard/WorkspaceDashboard";
import ZoteroCallback from "./pages/Config/ZoteroCallback";
import { ToastProvider } from "./contexts/ToastContext";

// PÁGINAS
function Dashboard() {
  const isMasterAdmin = window.location.pathname.startsWith('/admin');
  if (isMasterAdmin) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-8">Alessa Admin Center</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-500 mb-2">Workspaces Activos</h4>
            <p className="text-3xl font-bold text-slate-900">28</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-500 mb-2">Usuarios Totales</h4>
            <p className="text-3xl font-bold text-slate-900">143</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-500 mb-2">IPS Elaborados</h4>
            <p className="text-3xl font-bold text-slate-900">538</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-500 mb-2">Artículos Analizados</h4>
            <p className="text-3xl font-bold text-slate-900">17,000</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Gestión de Workspaces</h3>
            <p className="text-sm text-gray-500 mb-6 flex-1">
              Visualiza el CRM de empresas cliente, crea nuevos entornos o entra como Administrador para brindar soporte.
            </p>
            <a href="/admin/settings" className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
              Ir a Workspaces →
            </a>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Gestión de Usuarios</h3>
            <p className="text-sm text-gray-500 mb-6 flex-1">
              Administra todas las cuentas de la plataforma SaaS, asigna roles globales y supervisa el acceso.
            </p>
            <a href="/admin/settings" className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
              Ir a Usuarios →
            </a>
          </div>
        </div>
      </div>
    );
  }
  return <WorkspaceDashboard />;
}

function IPSControl() {
  return <h1 className="text-2xl font-bold">Tabla Control IPS</h1>;
}

function NewIPS() {
  return <h1 className="text-2xl font-bold">Crear Nuevo IPS</h1>;
}

/* =========================
   PRISM LAYOUT
========================= */

function PrismLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const isIPSForm = location.pathname.startsWith("/app/ips/new") || location.pathname.startsWith("/app/ips/edit");

  return (
    <div className="h-screen flex bg-gray-50">
      {!isIPSForm && (
        <aside className={`transition-all duration-300 ${isSidebarCollapsed ? "w-20" : "w-72"} bg-[#312E81] h-full`}>
          <SidebarMainMenu isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} isAdmin={false} />
        </aside>
      )}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<WorkspaceDashboard />} />
          <Route path="/ips-control" element={<IPSControlTablePage />} />
          <Route path="/ips/new" element={<NuevoIPSLayout />}>
            <Route index element={<SeccionA />} />
            <Route path="a" element={<SeccionA />} />
            <Route path="b" element={<SeccionB />} />
            <Route path="c" element={<SeccionC />} />
            <Route path="d" element={<SeccionD />} />
            <Route path="e" element={<SeccionE />} />
            <Route path="f" element={<SeccionF />} />
            <Route path="g" element={<SeccionG />} />
            <Route path="h" element={<SeccionH />} />
          </Route>
          <Route path="/ips/edit/:versionId" element={<NuevoIPSLayout />}>
            <Route index element={<SeccionA />} />
            <Route path="a" element={<SeccionA />} />
            <Route path="b" element={<SeccionB />} />
            <Route path="c" element={<SeccionC />} />
            <Route path="d" element={<SeccionD />} />
            <Route path="e" element={<SeccionE />} />
            <Route path="f" element={<SeccionF />} />
            <Route path="g" element={<SeccionG />} />
            <Route path="h" element={<SeccionH />} />
          </Route>
          <Route path="/gestion-documental" element={<GestionDocumental />} />
          {/* Operative Settings for users */}
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

/* =========================
   ADMIN LAYOUT
========================= */
function AdminLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex bg-slate-50">
      <aside className={`transition-all duration-300 ${isSidebarCollapsed ? "w-20" : "w-72"} bg-slate-900 border-r border-slate-800 h-full text-white`}>
        <SidebarMainMenu isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} isAdmin={true} />
      </aside>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

/* =========================
   APP
========================= */

export default function App() {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const handleAccessDenied = (e) => {
      setToastMessage(e.detail);
      setTimeout(() => setToastMessage(null), 5000);
    };
    window.addEventListener('workspace-access-denied', handleAccessDenied);
    return () => window.removeEventListener('workspace-access-denied', handleAccessDenied);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedWorkspaces = localStorage.getItem('workspaces');
    const storedCurrentWorkspaceId = localStorage.getItem('currentWorkspaceId');
    
    if (storedToken && storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUser(u);
        if (storedWorkspaces) setWorkspaces(JSON.parse(storedWorkspaces));
        if (storedCurrentWorkspaceId) setCurrentWorkspaceId(storedCurrentWorkspaceId);

        // Auto-redirect from root depending on role
        if (window.location.pathname === '/') {
          if (u.email === 'contact@alessadatabase.cloud') {
             window.location.href = '/admin';
          } else {
             window.location.href = '/app';
          }
        }
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (data) => {
    setUser(data.user);
    setWorkspaces(data.workspaces || []);
    
    if (data.user.email === 'contact@alessadatabase.cloud') {
      window.location.href = '/admin';
    } else {
      if (data.workspaces && data.workspaces.length === 1) {
        const wsId = data.workspaces[0].id;
        localStorage.setItem('currentWorkspaceId', wsId);
      }

      // Comprobar si hay un borrador de recuperación pendiente
      try {
        const recoveryDataStr = localStorage.getItem('alessa_ips_recovery_draft');
        if (recoveryDataStr) {
          const parsed = JSON.parse(recoveryDataStr);
          if (parsed.path) {
            window.location.href = parsed.path;
            return;
          }
        }
      } catch (e) {
        console.error("Error reading recovery draft:", e);
      }

      window.location.href = '/app';
    }
  };

  const handleWorkspaceSelect = (wsId) => {
    localStorage.setItem('currentWorkspaceId', wsId);
    setCurrentWorkspaceId(wsId);
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50">Cargando...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const isSuperAdminUser = user.email === 'contact@alessadatabase.cloud';
  const inAdminRoute = window.location.pathname.startsWith('/admin');

  // Si intenta ir a /admin sin ser superadmin
  if (inAdminRoute && !isSuperAdminUser) {
    window.location.href = '/app';
    return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-primary-600" /></div>;
  }

  // Si es superadmin y está intentando acceder a /app o / sin workspace, redirigir a /admin
  if (!inAdminRoute && !currentWorkspaceId && isSuperAdminUser) {
    if (window.location.pathname !== '/admin') {
      window.location.href = '/admin';
      return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-primary-600" /></div>;
    }
  }

  // PRISM PORTAL (Workspace Selector logic para usuarios normales)
  if (!inAdminRoute && !currentWorkspaceId && !isSuperAdminUser) {
    if (workspaces.length > 0) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-xl mb-6 max-w-[95vw]" style={{ width: "fit-content", minWidth: workspaces.length <= 6 ? 'min(400px, 100%)' : 'auto' }}>
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Selecciona un Workspace</h2>
            <div 
              className="grid grid-flow-col gap-4 overflow-x-auto pb-2" 
              style={{ 
                gridTemplateRows: `repeat(${Math.min(workspaces.length, 6)}, auto)`,
                gridAutoColumns: "minmax(300px, 1fr)"
              }}
            >
              {workspaces.map(ws => (
                <button
                  key={ws.id}
                  onClick={() => handleWorkspaceSelect(ws.id)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold text-gray-900">{ws.name}</div>
                    <div className="text-xs text-gray-500">Rol: {ws.role_name}</div>
                  </div>
                  <div className="text-blue-600">→</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    } else {
       return <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
         <h2 className="text-2xl font-bold text-red-600 mb-2">Sin Acceso</h2>
         <p className="text-gray-600 mb-4">No tienes ningún Workspace asignado. Por favor contacta al administrador.</p>
         <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Volver al Login</button>
       </div>
    }
  }

  return (
    <>
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 max-w-sm bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-start gap-3 animate-fade-in">
          <div>
            <h4 className="font-bold">Error de Acceso</h4>
            <p className="text-sm opacity-90">{toastMessage}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="opacity-80 hover:opacity-100">✕</button>
        </div>
      )}
      <ToastProvider>
        <BrowserRouter>
          <Routes>
             {isSuperAdminUser && <Route path="/admin/*" element={<AdminLayout />} />}
             <Route path="/app/*" element={<PrismLayout />} />
             <Route path="/settings/integrations/zotero/callback" element={<ZoteroCallback />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </>
  );
}