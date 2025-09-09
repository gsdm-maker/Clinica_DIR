
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import toast from 'react-hot-toast';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string;
};

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_users');

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
      setUsers((data as User[]) || []);
    } catch (error: any) {
      toast.error('Error al cargar los usuarios. Revise la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleVariant = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'danger';
      case 'bodega': return 'warning';
      case 'enfermeria': return 'success';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-2">Lista de todos los usuarios registrados en el sistema</p>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miembro Desde</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Acceso</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={getRoleVariant(user.role)} size="sm">
                      {user.role || 'Sin rol'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy, HH:mm', { locale: es }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'dd MMM yyyy, HH:mm', { locale: es }) : 'Nunca'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="text-center py-12"><p className="text-gray-500">No se encontraron usuarios</p></div>}
        </div>
      </Card>
    </div>
  );
}
