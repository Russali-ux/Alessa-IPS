export const Select = ({ label, options = [] ,placeholder = "Seleccionar",value = "", ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-text-main mb-1.5">{label}</label>
    <select 
      {...props} 
      value={value} 
      className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main shadow-sm transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 hover:border-border-hover disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="">
        {placeholder}
      </option>
      {options.map((opt, i) => (
        <option key={i} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);
