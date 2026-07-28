export const Textarea = ({ label, className = "", ...props }) => (
  <div className="flex flex-col space-y-1">
    {label && <label className="font-medium">{label}</label>}
    <textarea
      className={`border rounded-md w-full p-2 resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
      {...props}
    />
  </div>
);