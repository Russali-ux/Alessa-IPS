import { useState } from "react";

export const Accordion = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`border rounded-xl mb-5 shadow-sm overflow-hidden transition-all duration-200 ${open ? 'border-indigo-100 bg-white' : 'border-slate-200 bg-slate-50'}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex justify-between items-center px-5 py-4 font-semibold transition-colors ${open ? 'bg-[#f4f7ff] text-indigo-900 border-b border-indigo-100' : 'bg-transparent text-slate-700 hover:bg-slate-100'}`}
      >
        {title}
        <span className={`transition-transform duration-200 ${open ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`}>
          {open ? "−" : "+"}
        </span>
      </button>

      {/* solo oculta el contenido sin desmontarlo */}
      <div className={`p-5 ${open ? "block" : "hidden"}`}>
      {children}
      </div>
    </div>
  );
};
