import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Badge } from '../components/ui/Badge'; // Import Badge
import { Input } from '../components/ui/Input'; // Import Input
import { Select } from '../components/ui/Select'; // Import Select
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card'; // Only import Card
import { Badge } from '../components/ui/Badge'; // Import Badge
import { Input } from '../components/ui/Input'; // Import Input
import { Select } from '../components/ui/Select'; // Import Select
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditRecord {
  id: string;
  tipo_checklist: string;
  fecha_auditoria: string;
  usuario_id: string;
  porcentaje_completado: number;
  total_hallazgos: number;
  observaciones_generales: string | null;
  users: { name: string } | null; // Assuming users table has a name column
}

export default function ChecklistHistory() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filterType, setFilterType] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');

  useEffect(() => {
    const fetchAudits = async () => {
      if (!user) {
        setLoading(false);
        setError('Debe iniciar sesión para ver el historial de checklists.');
        return;
      }

      setLoading(true);
      setError(null);

      let query = supabase
        .from('auditorias_checklist')
        .select(`
          id,
          tipo_checklist,
          fecha_auditoria,
          usuario_id,
          porcentaje_completado,
          total_hallazgos,
          observaciones_generales,
          users (name) // Fetch user name from the public.users table
        `);

      // Apply filters
      if (filterType) {
        query = query.eq('tipo_checklist', filterType);
      }
      if (filterDate) {
        // Supabase date filtering might need specific format, assuming YYYY-MM-DD
        query = query.gte('fecha_auditoria', `${filterDate}T00:00:00.000Z`);
        query = query.lte('fecha_auditoria', `${filterDate}T23:59:59.999Z`);
      }
      if (filterUser) {
        // This assumes 'users' is a foreign table and 'name' is the column to filter by
        // Supabase doesn't directly support filtering on joined table columns in a simple .eq()
        // For now, we'll filter on the client side or need a more complex RPC/view in Supabase
        // For simplicity, let's assume a direct match on user_id for now if user is a UUID
        // Or, if 'users' is a view/function that returns a single user, we might need to adjust.
        // For now, we'll leave this as a placeholder for a more robust solution.
        // If 'users' table has a 'name' column and we want to filter by it, we'd need a join or RPC.
        // For the purpose of this exercise, I'll add a basic client-side filter for user name if fetched.
        // A better solution would be to filter directly in the Supabase query if possible.
      }

      const { data, error } = await query.order('fecha_auditoria', { ascending: false });

      if (error) {
        console.error('Error fetching audits:', error);
        toast.error('Error al cargar el historial de checklists.');
        setError(error.message);
      } else {
        // Client-side filter for user name if not filtered by Supabase
        const filteredData = filterUser
          ? data.filter(audit => audit.users?.name?.toLowerCase().includes(filterUser.toLowerCase()))
          : data;
        setAudits(filteredData as AuditRecord[]);
      }
      setLoading(false);
    };

    fetchAudits();
  }, [user, filterType, filterDate, filterUser]); // Add filter states to dependency array

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-700">Cargando historial de checklists...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-full flex items-center justify-center text-red-600">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historial de Checklists</h1>
        <p className="text-gray-600">Revisa los checklists completados anteriormente.</p>
      </div>

      <div className="mb-4 p-4 bg-white rounded-lg shadow-md flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="filterType" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Checklist</label>
          <Select
            id="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full"
          >
            <option value="">Todos</option>
            <option value="almacenamiento">Almacenamiento</option>
            <option value="protocolo">Protocolo</option>
          </Select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="filterDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
          <Input
            id="filterDate"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="filterUser" className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
          <Input
            id="filterUser"
            type="text"
            placeholder="Filtrar por nombre de usuario"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {audits.length === 0 ? (
        <Card className="bg-white p-6 text-center text-gray-500">
          <p>No hay checklists completados aún.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Tipo de Checklist</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Fecha</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Usuario</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Progreso</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Hallazgos</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-800 capitalize">{audit.tipo_checklist}</td>
                  <td className="p-4 text-sm text-gray-800">{format(new Date(audit.fecha_auditoria), 'dd/MM/yyyy HH:mm', { locale: es })}</td>
                  <td className="p-4 text-sm text-gray-800">{audit.users?.name || 'Desconocido'}</td>
                  <td className="p-4 text-sm text-gray-800">
                    <Badge variant="outline">{audit.porcentaje_completado}%</Badge>
                  </td>
                  <td className="p-4 text-sm text-gray-800">
                    <Badge variant={audit.total_hallazgos > 0 ? "destructive" : "secondary"}>
                      {audit.total_hallazgos}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-gray-800">
                    <button 
                      onClick={() => alert(`Ver detalles del checklist ${audit.id}`)} 
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded"
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


interface AuditRecord {
  id: string;
  tipo_checklist: string;
  fecha_auditoria: string;
  usuario_id: string;
  porcentaje_completado: number;
  total_hallazgos: number;
  observaciones_generales: string | null;
  users: { name: string } | null; // Assuming users table has a name column
}

export default function ChecklistHistory() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [filterType, setFilterType] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');

  useEffect(() => {
    const fetchAudits = async () => {
      if (!user) {
        setLoading(false);
        setError('Debe iniciar sesión para ver el historial de checklists.');
        return;
      }

      setLoading(true);
      setError(null);

      let query = supabase
        .from('auditorias_checklist')
        .select(`
          id,
          tipo_checklist,
          fecha_auditoria,
          usuario_id,
          porcentaje_completado,
          total_hallazgos,
          observaciones_generales,
          users (name) // Fetch user name from the public.users table
        `);

      // Apply filters
      if (filterType) {
        query = query.eq('tipo_checklist', filterType);
      }
      if (filterDate) {
        // Supabase date filtering might need specific format, assuming YYYY-MM-DD
        query = query.gte('fecha_auditoria', `${filterDate}T00:00:00.000Z`);
        query = query.lte('fecha_auditoria', `${filterDate}T23:59:59.999Z`);
      }
      if (filterUser) {
        // This assumes 'users' is a foreign table and 'name' is the column to filter by
        // Supabase doesn't directly support filtering on joined table columns in a simple .eq()
        // For now, we'll filter on the client side or need a more complex RPC/view in Supabase
        // For simplicity, let's assume a direct match on user_id for now if user is a UUID
        // Or, if 'users' is a view/function that returns a single user, we might need to adjust.
        // For now, we'll leave this as a placeholder for a more robust solution.
        // If 'users' table has a 'name' column and we want to filter by it, we'd need a join or RPC.
        // For the purpose of this exercise, I'll add a basic client-side filter for user name if fetched.
        // A better solution would be to filter directly in the Supabase query if possible.
      }

      const { data, error } = await query.order('fecha_auditoria', { ascending: false });

      if (error) {
        console.error('Error fetching audits:', error);
        toast.error('Error al cargar el historial de checklists.');
        setError(error.message);
      } else {
        // Client-side filter for user name if not filtered by Supabase
        const filteredData = filterUser
          ? data.filter(audit => audit.users?.name?.toLowerCase().includes(filterUser.toLowerCase()))
          : data;
        setAudits(filteredData as AuditRecord[]);
      }
      setLoading(false);
    };

    fetchAudits();
  }, [user, filterType, filterDate, filterUser]); // Add filter states to dependency array

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-700">Cargando historial de checklists...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-full flex items-center justify-center text-red-600">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historial de Checklists</h1>
        <p className="text-gray-600">Revisa los checklists completados anteriormente.</p>
      </div>

      <div className="mb-4 p-4 bg-white rounded-lg shadow-md flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="filterType" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Checklist</label>
          <Select
            id="filterType"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full"
          >
            <option value="">Todos</option>
            <option value="almacenamiento">Almacenamiento</option>
            <option value="protocolo">Protocolo</option>
          </Select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="filterDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
          <Input
            id="filterDate"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="filterUser" className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
          <Input
            id="filterUser"
            type="text"
            placeholder="Filtrar por nombre de usuario"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {audits.length === 0 ? (
        <Card className="bg-white p-6 text-center text-gray-500">
          <p>No hay checklists completados aún.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Tipo de Checklist</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Fecha</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Usuario</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Progreso</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Hallazgos</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-800 capitalize">{audit.tipo_checklist}</td>
                  <td className="p-4 text-sm text-gray-800">{format(new Date(audit.fecha_auditoria), 'dd/MM/yyyy HH:mm', { locale: es })}</td>
                  <td className="p-4 text-sm text-gray-800">{audit.users?.name || 'Desconocido'}</td>
                  <td className="p-4 text-sm text-gray-800">
                    <Badge variant="outline">{audit.porcentaje_completado}%</Badge>
                  </td>
                  <td className="p-4 text-sm text-gray-800">
                    <Badge variant={audit.total_hallazgos > 0 ? "destructive" : "secondary"}>
                      {audit.total_hallazgos}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-gray-800">
                    <button 
                      onClick={() => alert(`Ver detalles del checklist ${audit.id}`)} 
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded"
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


interface AuditRecord {
  id: string;
  tipo_checklist: string;
  fecha_auditoria: string;
  usuario_id: string;
  porcentaje_completado: number;
  total_hallazgos: number;
  observaciones_generales: string | null;
  users: { name: string } | null; // Assuming users table has a name column
}

export default function ChecklistHistory() {
  const { user } = useAuth();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAudits = async () => {
      if (!user) {
        setLoading(false);
        setError('Debe iniciar sesión para ver el historial de checklists.');
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('auditorias_checklist')
        .select(`
          id,
          tipo_checklist,
          fecha_auditoria,
          usuario_id,
          porcentaje_completado,
          total_hallazgos,
          observaciones_generales,
          users (name) // Fetch user name from the public.users table
        `)
        .order('fecha_auditoria', { ascending: false });

      if (error) {
        console.error('Error fetching audits:', error);
        toast.error('Error al cargar el historial de checklists.');
        setError(error.message);
      } else {
        setAudits(data as AuditRecord[]);
      }
      setLoading(false);
    };

    fetchAudits();
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-700">Cargando historial de checklists...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-full flex items-center justify-center text-red-600">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historial de Checklists</h1>
        <p className="text-gray-600">Revisa los checklists completados anteriormente.</p>
      </div>

      {audits.length === 0 ? (
        <Card className="bg-white p-6 text-center text-gray-500">
          <p>No hay checklists completados aún.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Tipo de Checklist</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Fecha</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Usuario</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Progreso</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Hallazgos</th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-800 capitalize">{audit.tipo_checklist}</td>
                  <td className="p-4 text-sm text-gray-800">{format(new Date(audit.fecha_auditoria), 'dd/MM/yyyy HH:mm', { locale: es })}</td>
                  <td className="p-4 text-sm text-gray-800">{audit.users?.name || 'Desconocido'}</td>
                  <td className="p-4 text-sm text-gray-800">
                    <Badge variant="outline">{audit.porcentaje_completado}%</Badge>
                  </td>
                  <td className="p-4 text-sm text-gray-800">
                    <Badge variant={audit.total_hallazgos > 0 ? "destructive" : "secondary"}>
                      {audit.total_hallazgos}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-gray-800">
                    <button 
                      onClick={() => alert(`Ver detalles del checklist ${audit.id}`)} 
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded"
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
