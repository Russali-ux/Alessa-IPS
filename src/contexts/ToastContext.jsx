import React, { createContext, useContext, useState, useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 10000); // 10 seconds auto-dismiss
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message) => {
    setToast(message);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] max-w-sm bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-start gap-3 animate-fade-in transition-all duration-300">
          <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">Éxito</h4>
            <p className="text-sm opacity-90">{toast}</p>
          </div>
          <button onClick={() => setToast(null)} className="opacity-80 hover:opacity-100 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
