import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Entrega, User } from '../types';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const INITIAL_FILTERS = {
  fechaDesde: '',
  fechaHasta: '',
  rut: '',
  usuarioId: '',
};

export default function DeliveryHistory() {
  const [deliveries, setDeliveries] = useState<Entrega[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('id, name');
      if (error) console.error('Error fetching users:', error);
      else setAllUsers(data || []);
    };
    fetchUsers();
  }, []);

  const fetchDeliveries = async () => {
    let query = supabase.from('entregas').select('*, pacientes!inner(nombre, rut), usuario:users(name), entregas_items(cantidad, maestro_productos(nombre))');
    if (filters.fechaDesde) query = query.gte('created_at', filters.fechaDesde);
    if (filters.fechaHasta) query = query.lte('created_at', `${filters.fechaHasta} 23:59:59`);
    if (filters.rut) query = query.ilike('pacientes.rut', `%${filters.rut}%`);
    if (filters.usuarioId) query = query.eq('usuario_id', filters.usuarioId);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) console.error('Error fetching deliveries:', error);
    else setDeliveries(data as Entrega[]);
  };

  useEffect(() => {
    fetchDeliveries();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  const handleExport = () => {
    if (deliveries.length === 0) {
      toast.error('No hay datos para exportar.');
      return;
    }
    const dataToExport = deliveries.map(d => ({
      'Fecha Registro': format(new Date(d.created_at), 'dd/MM/yyyy HH:mm'),
      'Mes Entrega': new Date(d.mes_entrega).toLocaleString('es-ES', { month: 'long' }),
      'RUT Paciente': d.pacientes?.rut,
      'Nombre Paciente': d.pacientes?.nombre,
      'Medicamentos': d.entregas_items.map(item => `${item.cantidad} x ${item.maestro_productos.nombre}`).join(', '),
      'Indicaciones': d.indicaciones_medicas,
      'Registrado Por': d.usuario?.name,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial Entregas');
    XLSX.writeFile(workbook, `Historial_Entregas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Exportación a Excel completada.');
  };

  const months = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString().padStart(2, '0'), label: new Date(0, i).toLocaleString('es-ES', { month: 'long' }) }));

  return (
    <div>
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Historial de Entregas</h2>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar a Excel
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg">
          <Input type="date" name="fechaDesde" value={filters.fechaDesde} onChange={handleFilterChange} />
          <Input type="date" name="fechaHasta" value={filters.fechaHasta} onChange={handleFilterChange} />
          <Input type="text" name="rut" placeholder="Filtrar por RUT..." value={filters.rut} onChange={handleFilterChange} />
          <Select name="usuarioId" value={filters.usuarioId} onChange={handleFilterChange} options={[{ value: '', label: 'Todos los Usuarios' }, ...allUsers.map(u => ({ value: u.id, label: u.name }))]} />
          <Button onClick={clearFilters} variant="destructive" className="lg:col-span-4">Limpiar Filtros</Button>
        </div>

        {deliveries.length === 0 ? (
          <p className="text-gray-600">No hay entregas que coincidan con los filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes Entrega</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicamentos Entregados</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicaciones</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registrado Por</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(delivery.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.pacientes?.nombre || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.pacientes?.rut || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{months.find(m => m.value === delivery.mes_entrega.substring(5, 7))?.label || delivery.mes_entrega}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <ul className="list-disc list-inside">
                        {delivery.entregas_items.map((item, index) => (
                          <li key={index}>{`${item.cantidad} x ${item.maestro_productos.nombre}`}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.indicaciones_medicas || 'Sin indicaciones'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.usuario?.name || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
