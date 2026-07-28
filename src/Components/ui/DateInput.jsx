export const DateInput = ({ label, ...props }) => (
  <div className="mb-4">
    <label className="block font-medium mb-1">{label}</label>
    <input
      type="date"
      {...props}
      className="w-full border p-2 rounded-lg"
    />
  </div>
);
