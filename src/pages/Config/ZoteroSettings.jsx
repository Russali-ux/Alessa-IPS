import { useState, useEffect } from "react";
import { BookOpen, RefreshCw, Unplug, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "../../Components/ui/button";
import { zoteroService } from "../../services/zotero.service";

export default function ZoteroSettings() {
  const [status, setStatus] = useState({ connected: false, username: "", lastSync: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const checkStatus = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await zoteroService.getStatus();
      setStatus(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo obtener el estado de Zotero.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleConnect = async () => {
    try {
      setError("");
      setLoading(true);
      const data = await zoteroService.getLoginUrl();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      console.error(err);
      setError("Error al iniciar la conexión con Zotero.");
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setError("");
      setLoading(true);
      await zoteroService.disconnect();
      await checkStatus();
    } catch (err) {
      console.error(err);
      setError("Error al desconectar Zotero.");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all duration-300 border-border p-8 mt-6">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800">
        <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-sm">
          <BookOpen size={20} />
        </div>
        Integración con Zotero
      </h3>
      
      <div className="space-y-5 max-w-lg bg-slate-50/50 p-6 rounded-xl border border-slate-100">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={16} /> Verificando conexión...
          </div>
        ) : status.connected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div>
                <p className="text-sm font-bold text-emerald-800">Conectado a Zotero</p>
                <p className="text-xs text-emerald-600 mt-1">Usuario: {status.username}</p>
                {status.lastSync && (
                  <p className="text-xs text-emerald-600/80">Última sincronización: {new Date(status.lastSync).toLocaleString()}</p>
                )}
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={checkStatus} variant="outline" className="flex-1 bg-white">
                <RefreshCw size={14} className="mr-2" /> Actualizar
              </Button>
              <Button onClick={handleDisconnect} variant="outline" className="flex-1 bg-white text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                <Unplug size={14} className="mr-2" /> Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Conecta tu cuenta de Zotero para importar referencias bibliográficas directamente a la Sección E de los formularios IPS.
            </p>
            <Button onClick={handleConnect} className="w-full bg-[#CC0000] hover:bg-[#AA0000] text-white">
              <ExternalLink size={16} className="mr-2" /> Conectar Zotero
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
