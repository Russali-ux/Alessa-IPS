import { useState } from "react";
import { usersApi } from "../../services/api";
import { Button } from "../../Components/ui/button";
import { Input } from "../../Components/ui/input";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

export default function UserForm({ user, roles, isMasterAdmin, onBack, onCreated }) {
  const isEditing = !!user;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombres: user?.nombres || "",
    apellidos: user?.apellidos || "",
    email: user?.email || "",
    telefono: user?.telefono || "",
    password: "",
    is_active: user?.is_active ?? true,
    roles: user?.roles?.map(r => r.id) || []
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleRoleChange = (roleId) => {
    setFormData(prev => {
      const isSelected = prev.roles.includes(roleId);
      if (isSelected) return { ...prev, roles: prev.roles.filter(id => id !== roleId) };
      return { ...prev, roles: [...prev.roles, roleId] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing) {
        const dataToUpdate = { ...formData };
        if (!dataToUpdate.password) delete dataToUpdate.password;
        await usersApi.update(user.id, dataToUpdate);
        onBack();
      } else {
        const newUser = await usersApi.create({ ...formData, passwordHash: formData.password });
        if (onCreated) {
          onCreated(newUser);
        } else {
          onBack();
        }
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-4 mb-6 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft size={20}/></Button>
        <h2 className="text-xl font-bold">{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Nombres *</label>
            <Input required name="nombres" value={formData.nombres} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Apellidos *</label>
            <Input required name="apellidos" value={formData.apellidos} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Email *</label>
            <Input required type="email" name="email" value={formData.email} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Teléfono</label>
            <Input name="telefono" value={formData.telefono} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Contraseña {isEditing ? '(Dejar vacío para no cambiar)' : '*'}</label>
            <Input type="password" required={!isEditing} name="password" value={formData.password} onChange={handleChange} />
          </div>
        </div>

        {isMasterAdmin && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm">
              <input 
                type="checkbox" 
                name="is_active" 
                checked={formData.is_active} 
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 rounded"
              />
              Usuario Activo
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onBack}>Cancelar</Button>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />}
            Guardar
          </Button>
        </div>
      </form>
    </div>
  );
}
