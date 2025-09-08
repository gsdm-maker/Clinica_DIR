import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';

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

      {console.log('Audits state:', audits)} {/* Added console log */}

      {audits.length === 0 ? (
        <Card className="bg-white p-6 text-center text-gray-500">
          <p>No hay checklists completados aún.</p>
        </Card>
      ) : (
        <div>
          <h2>Lista de Auditorías (Simplificada)</h2>
          <ul>
            {audits.map((audit) => (
              <li key={audit.id}>ID: {audit.id} - Tipo: {audit.tipo_checklist}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}