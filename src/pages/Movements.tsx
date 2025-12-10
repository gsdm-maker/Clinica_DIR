import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

// Definir el tipo para los movimientos que recibiremos de la BD
type Movement = {
  fecha: string;
  producto_nombre: string;
  numero_lote: string;
  proveedor_nombre: string;
  tipo_movimiento: 'entrada' | 'salida';
  cantidad: number;
  condicion: string;
  usuario_nombre: string;
  motivo: string;
};

// Definir el tipo para los usuarios que usaremos en el filtro
type User = {
  id: string;
  email: string;
};

export function Movements() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para los filtros
  const [filters, setFilters] = useState({
    startDate: format(new Date().setDate(1), 'yyyy-MM-dd'), // Primer día del mes actual
    endDate: format(new Date(), 'yyyy-MM-dd'), // Hoy
    userIds: [] as string[],
    movementType: '',
    searchTerm: '',
  });

  // Cargar la lista de usuarios para el filtro
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('id, email').order('email');
      if (error) {
        toast.error('Error al cargar la lista de usuarios.');
      } else {
        setUsers(data || []);
      }
    };
    fetchUsers();
  }, []);

  // Cargar los movimientos según los filtros
  useEffect(() => {
    const fetchMovements = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_movement_history', {
          start_date: filters.startDate,
          end_date: filters.endDate,
          user_ids: filters.userIds.length > 0 ? filters.userIds : null,
          movement_type: filters.movementType || null,
          search_term: filters.searchTerm || null,
        });

        if (error) {
          throw error;
        }
        setMovements(data || []);
      } catch (error: any) {
        toast.error(`Error al cargar movimientos: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMovements();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleExport = () => {
    if (movements.length === 0) {
      toast.error('No hay datos para exportar.');
      return;
    }

    // Formatear los datos para el Excel
    const dataToExport = movements.map(mov => ({
      'Fecha': format(new Date(mov.fecha), 'dd/MM/yyyy HH:mm:ss'),
      'Producto': mov.producto_nombre,
      'N° Lote': mov.numero_lote,
      'Proveedor': mov.proveedor_nombre,
      'Tipo de Movimiento': mov.tipo_movimiento,
      'Cantidad': mov.cantidad,
      'Condición': mov.condicion,
      'Usuario': mov.usuario_nombre,
      'Motivo/Guía': mov.motivo,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');

    // Generar el nombre del archivo con la fecha actual
    const fileName = `Historial_Movimientos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Exportación a Excel completada.');
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historial de Movimientos</h1>
          <p className="text-gray-600 mt-2">Filtra y explora todos los movimientos de inventario.</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Descargar Excel
        </Button>
      </div>

      <Card className="p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Fecha Inicio"
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
          />
          <Input
            label="Fecha Fin"
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
          />
          <Select
            label="Tipo de Movimiento"
            name="movementType"
            value={filters.movementType}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'Todos' },
              { value: 'entrada', label: 'Entradas' },
              { value: 'salida', label: 'Salidas' },
            ]}
          />
          {/* TODO: Añadir selector de usuarios múltiple */}
          <Input
            label="Buscar por Producto, Lote o Proveedor"
            name="searchTerm"
            placeholder="Nombre, N° Lote o Proveedor..."
            value={filters.searchTerm}
            onChange={handleFilterChange}
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Lote</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condición</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo/Guía</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10">Cargando...</td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-500">No se encontraron movimientos con los filtros seleccionados.</td></tr>
              ) : (
                movements.map((mov, index) => (
                  <tr key={index}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{format(new Date(mov.fecha), 'dd/MM/yy HH:mm', { locale: es })}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mov.producto_nombre}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{mov.numero_lote}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{mov.proveedor_nombre}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <Badge variant={mov.tipo_movimiento === 'entrada' ? 'default' : 'info'}>{mov.tipo_movimiento}</Badge>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold">{mov.cantidad}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <Badge variant={mov.condicion === 'Bueno' ? 'default' : 'danger'}>{mov.condicion}</Badge>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{mov.usuario_nombre}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{mov.motivo}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
