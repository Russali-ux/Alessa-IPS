import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { zoteroService } from '../../services/zotero.service';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ZoteroCallback() {
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Conectando con Zotero...');
  const navigate = useNavigate();
  const location = useLocation();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const processCallback = async () => {
      const params = new URLSearchParams(location.search);
      const oauthToken = params.get('oauth_token');
      const oauthVerifier = params.get('oauth_verifier');

      let returnUrl = '/app/settings';
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
           const u = JSON.parse(storedUser);
           if (u.email === 'contact@alessadatabase.cloud') returnUrl = '/admin/settings';
        }
      } catch (e) {
        // ignore
      }

      if (!oauthToken || !oauthVerifier) {
        setStatus('error');
        setMessage('No se encontraron las credenciales de Zotero en la URL.');
        setTimeout(() => navigate(returnUrl), 3000);
        return;
      }

      try {
        await zoteroService.handleCallback(oauthToken, oauthVerifier);
        setStatus('success');
        setMessage('Zotero conectado exitosamente. Redirigiendo...');
        
        setTimeout(() => navigate(returnUrl), 2000);
      } catch (error) {
        setStatus('error');
        setMessage(error.message || 'Ocurrió un error al conectar con Zotero.');
      }
    };

    processCallback();
  }, [location, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-4">
        {status === 'processing' && (
          <div className="flex flex-col items-center text-primary-600">
            <Loader2 className="animate-spin mb-4" size={48} />
            <h2 className="text-lg font-bold">Procesando Conexión</h2>
            <p className="text-sm text-slate-500 mt-2">{message}</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="flex flex-col items-center text-emerald-600">
            <CheckCircle2 className="mb-4" size={48} />
            <h2 className="text-lg font-bold">¡Conectado!</h2>
            <p className="text-sm text-slate-500 mt-2">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center text-red-600">
            <AlertCircle className="mb-4" size={48} />
            <h2 className="text-lg font-bold">Error de Conexión</h2>
            <p className="text-sm text-slate-500 mt-2">{message}</p>
            <button 
              onClick={() => {
                 const u = JSON.parse(localStorage.getItem('user') || '{}');
                 navigate(u.email === 'contact@alessadatabase.cloud' ? '/admin/settings' : '/app/settings');
              }}
              className="mt-6 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              Volver a Ajustes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
