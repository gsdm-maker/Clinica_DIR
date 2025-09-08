import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';

export default function ChecklistHistory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditCount, setAuditCount] = useState<number>(0);

  useEffect(() => {
    const fetchAuditsCount = async () => {
      if (!user) {
        setLoading(false);
        setError('Debe iniciar sesión para ver el historial de checklists.');
        return;
      }

      setLoading(true);
      setError(null);

      const { count, error } = await supabase
        .from('auditorias_checklist')
        .select('id', { count: 'exact' });

      if (error) {
        console.error('Error fetching audits count:', error);
        toast.error('Error al cargar el historial de checklists.');
        setError(error.message);
      } else {
        setAuditCount(count || 0);
      }
      setLoading(false);
    };

    fetchAuditsCount();
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

      <Card className="bg-white p-6 text-center text-gray-500">
        <p>Total de checklists registrados: {auditCount}</p>
        <p>Esta es una versión simplificada para depuración.</p>
      </Card>
    </div>
  );
}