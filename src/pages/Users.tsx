import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Edit2, Trash2, UserPlus, Copy, RefreshCw, KeyRound, Wand2, User, Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string;
  contact_email?: string;
  username?: string;
};

export function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Success/Reset Modal States
  const [createdUserCreds, setCreatedUserCreds] = useState<{ name: string, email: string, password: string, isReset?: boolean } | null>(null);

  // Form Data
  const [userName, setUserName] = useState('');
  const [customUsername, setCustomUsername] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [userRole, setUserRole] = useState('visualizador');

  const roles = [
    { value: 'admin', label: 'Administrador' },
    { value: 'bodega', label: 'Bodega' },
    { value: 'enfermero', label: 'Enfermero/a' },
    { value: 'auditor', label: 'Auditor' },
    { value: 'visualizador', label: 'Visualizador' }
  ];

  const roleDescriptions = {
    admin: "Control total del sistema: usuarios, maestros, stock, configuración y eliminaciones.",
    bodega: "Gestión operativa: Entradas, Salidas, Inventario y creación de productos.",
    enfermero: "Clínico: Registro de medicamentos a pacientes y consulta de stock.",
    auditor: "Control y Calidad: Acceso a checklists, gestión de evidencias y reportes.",
    visualizador: "Solo Lectura: Puede ver stock y dashboards pero no puede editar ningún dato."
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_users');
      if (error) throw error;
      setUsers((data as UserData[]) || []);
    } catch (error: any) {
      console.warn("RPC get_users falló. Usando fallback...", error);
      const { data: fallbackData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (fallbackData) { setUsers(fallbackData as UserData[]); }
      else { toast.error('No se pudo cargar la lista de usuarios.'); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const generateShortUsername = (fullName: string) => {
    if (!fullName) return '';
    const cleanName = fullName.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, '').trim();

    const parts = cleanName.split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0].charAt(0)}${parts[1]}`;
    if (parts.length === 3) return `${parts[0].charAt(0)}${parts[1]}${parts[2].charAt(0)}`;
    if (parts.length >= 4) return `${parts[0].charAt(0)}${parts[2]}${parts[3].charAt(0)}`;
    return cleanName.replace(/\s+/g, '');
  };

  useEffect(() => {
    if (!customUsername || customUsername === generateShortUsername(userName.slice(0, -1))) {
      setCustomUsername(generateShortUsername(userName));
    }
  }, [userName]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const finalUsername = customUsername.trim().toLowerCase();
    if (!finalUsername) {
      toast.error("El usuario es obligatorio");
      return;
    }

    const internalEmail = `${finalUsername}@clinica.cl`;
    const tempPassword = 'GenericPassword2025!';

    try {
      setLoading(true);

      const { createClient } = await import('@supabase/supabase-js');
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: internalEmail,
        password: tempPassword,
        options: {
          data: { name: userName }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario.");

      const { error: rpcError } = await supabase.rpc('admin_finalize_user', {
        target_user_id: authData.user.id,
        new_name: userName,
        new_role: userRole,
        new_username: finalUsername,
        new_contact_email: contactEmail || null
      });

      if (rpcError) throw rpcError;

      setCreatedUserCreds({
        name: userName,
        email: finalUsername,
        password: tempPassword,
        isReset: false
      });

      setShowCreateModal(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Error al crear usuario.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user: UserData) => {
    if (!isAdmin || !confirm(`¿Estás seguro de restablecer la contraseña para ${user.name}?`)) return;
    const tempPassword = 'ResetPassword2025!';
    try {
      setLoading(true);
      const { error } = await supabase.rpc('admin_reset_password', { target_user_id: user.id, new_password: tempPassword });
      if (error) throw error;
      setCreatedUserCreds({ name: user.name, email: displayUsername(user.email), password: tempPassword, isReset: true });
      toast.success("Contraseña restablecida exitosamente.");
    } catch (error: any) { toast.error("Error: " + error.message); } finally { setLoading(false); }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !isAdmin) return;
    try {
      setLoading(true);
      const { error } = await supabase.rpc('admin_update_user_role', { target_user_id: selectedUser.id, new_role: userRole });
      if (error) throw error;
      toast.success('Rol actualizado');
      setShowEditModal(false);
      fetchUsers();
    } catch (error: any) { toast.error(error.message); } finally { setLoading(false); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin || !confirm('¿Eliminar usuario?')) return;
    try {
      const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId });
      if (error) throw error;
      toast.success('Usuario eliminado');
      fetchUsers();
    } catch (error: any) { toast.error(error.message); }
  };

  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    setUserRole(user.role);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setUserName('');
    setCustomUsername('');
    setContactEmail('');
    setUserRole('visualizador');
    setSelectedUser(null);
  };

  const getRoleVariant = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'danger';
      case 'bodega': return 'warning';
      case 'enfermero': return 'success';
      case 'auditor': return 'info';
      default: return 'secondary';
    }
  };

  const displayUsername = (email: string) => {
    return email?.replace('@clinica.cl', '').replace('@clinica.system', '') || '';
  };

  if (loading && users.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-2">Administración de acceso y roles del personal</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        )}
      </div>

      {/* Role Descriptions Info Box */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-3 bg-blue-50 border-blue-100">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Niveles de Acceso y Permisos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(roleDescriptions).map(([role, desc]) => (
                    <div key={role} className="bg-white p-3 rounded border border-blue-100 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center mb-2">
                        <Badge variant={getRoleVariant(role)} size="sm" className="mr-2 capitalize">
                          {role}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre / Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{u.name}</div>
                    {u.contact_email && (
                      <div className="flex items-center text-xs text-blue-600 mt-1">
                        <Mail className="w-3 h-3 mr-1" />
                        {u.contact_email}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-0.5">Registrado: {new Date(u.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded inline-block font-bold">
                      {u.username || displayUsername(u.email)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getRoleVariant(u.role)} size="sm">
                      {u.role || 'Sin rol'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.last_sign_in_at ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {u.last_sign_in_at ? 'Activo' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {isAdmin && currentUser?.id !== u.id && (
                      <div className="flex space-x-2">
                        <button onClick={() => openEditModal(u)} className="text-blue-600 hover:text-blue-800 p-1" title="Editar Rol">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleResetPassword(u)} className="text-orange-600 hover:text-orange-800 p-1" title="Restablecer Contraseña">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-800 p-1" title="Eliminar Usuario">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {/* Modals are the same... */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Crear Nuevo Usuario" size="md">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Nombre Completo del personal"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="Ej: Sebastian Marcel Diaz Espindola"
            required
            icon={<User className="text-gray-400 w-5 h-5" />}
          />

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Wand2 className="w-4 h-4 text-blue-500" />
                <label className="text-sm font-medium text-gray-700">Usuario Sugerido (Editable)</label>
              </div>
              <Input
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value.toLowerCase().trim())}
                placeholder="ej: sdias"
                className="font-mono font-bold text-blue-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1 uppercase">Correo Personal / Contacto (Opcional)</label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="ej: contacto@gmail.com"
                icon={<Mail className="text-gray-400 w-4 h-4" />}
              />
              <p className="text-xs text-gray-400 mt-1 ml-1">
                Útil para recuperar cuenta o enviar notificaciones masivas. No se usa para login.
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded border border-blue-100 flex justify-between items-center">
            <span className="text-sm text-blue-800">Contraseña Inicial:</span>
            <code className="text-sm font-bold bg-white px-2 py-1 rounded">GenericPassword2025!</code>
          </div>

          <Select
            label="Rol Asignado"
            options={roles}
            value={userRole}
            onChange={e => setUserRole(e.target.value)}
            required
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={loading} disabled={!userName || !customUsername}>Crear Usuario</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!createdUserCreds} onClose={() => setCreatedUserCreds(null)} title={createdUserCreds?.isReset ? "Contraseña Restablecida" : "¡Usuario Creado!"} size="md">
        <div className="space-y-6 text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${createdUserCreds?.isReset ? 'bg-orange-100' : 'bg-green-100'}`}>
            {createdUserCreds?.isReset ? <KeyRound className="h-6 w-6 text-orange-600" /> : <UserPlus className="h-6 w-6 text-green-600" />}
          </div>

          <p className="text-sm text-gray-500">
            {createdUserCreds?.isReset
              ? "Se ha generado una nueva contraseña."
              : "Usuario creado exitosamente con el ID personalizado."}
          </p>

          <div className="bg-gray-100 p-4 rounded-lg text-left space-y-3 font-mono text-sm relative group">
            <div>
              <span className="text-gray-500 block text-xs">Usuario:</span>
              <span className="text-gray-900 font-bold select-all text-lg">{createdUserCreds?.email}</span>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <span className="text-gray-500 block text-xs">Contraseña:</span>
              <span className="text-gray-900 font-bold select-all">{createdUserCreds?.password}</span>
            </div>
            <button title="Copiar" onClick={() => { navigator.clipboard.writeText(`Usuario: ${createdUserCreds?.email}\nPass: ${createdUserCreds?.password}`); toast.success('Copiado'); }} className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <Button className="w-full" onClick={() => setCreatedUserCreds(null)}>Cerrar</Button>
        </div>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Editar Usuario: ${selectedUser?.name}`} size="sm">
        <form onSubmit={handleUpdateRole} className="space-y-4">
          <div className="p-3 bg-blue-50 rounded text-sm text-blue-800 mb-4">
            Editando permisos para <b>{selectedUser?.name}</b>
          </div>
          <Select label="Nuevo Rol" options={roles} value={userRole} onChange={e => setUserRole(e.target.value)} required />
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={loading}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
