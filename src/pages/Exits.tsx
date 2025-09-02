import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { MasterProduct, Product } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Exits() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Data states
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [selectedMasterProductId, setSelectedMasterProductId] = useState<string>('');
  const [availableLots, setAvailableLots] = useState<Product[]>([]);
  
  // Form states
  const [dispatchCart, setDispatchCart] = useState<Map<string, number>>(new Map());
  const [motivo, setMotivo] = useState('');

  // Fetch all master products for the main dropdown
  useEffect(() => {
    const fetchMasterProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('maestro_productos')
          .select('id, nombre')
          .order('nombre', { ascending: true });
        if (error) throw error;
        setMasterProducts(data || []);
      } catch (error) {
        toast.error('Error al cargar la lista de productos.');
      }
    };
    fetchMasterProducts();
  }, []);

  // Fetch available lots when a master product is selected
  useEffect(() => {
    const fetchAvailableLots = async () => {
      if (!selectedMasterProductId) {
        setAvailableLots([]);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .eq('maestro_producto_id', selectedMasterProductId)
          .eq('condicion', 'Bueno')
          .gt('stock_actual', 0)
          .order('fecha_vencimiento', { ascending: true });
        
        if (error) throw error;
        setAvailableLots(data || []);
      } catch (error) {
        toast.error('Error al cargar los lotes disponibles.');
        setAvailableLots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableLots();
  }, [selectedMasterProductId]);

  const handleMasterProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMasterProductId(e.target.value);
    // Reset cart when product changes
    setDispatchCart(new Map());
  };

  const handleQuantityChange = (lotId: string, quantityStr: string) => {
    const newCart = new Map(dispatchCart);
    const quantity = parseInt(quantityStr, 10);

    if (quantityStr === '' || isNaN(quantity) || quantity <= 0) {
      newCart.delete(lotId);
    } else {
      newCart.set(lotId, quantity);
    }
    setDispatchCart(newCart);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dispatchCart.size === 0) {
      toast.error('No has seleccionado ninguna cantidad para retirar.');
      return;
    }
    if (!motivo.trim()) {
      toast.error('Por favor, ingresa un motivo o destinatario.');
      return;
    }
    if (!user) {
      toast.error('No se pudo identificar al usuario.');
      return;
    }

    setLoading(true);

    const salidas = Array.from(dispatchCart.entries()).map(([producto_id, cantidad]) => ({
      producto_id,
      cantidad,
    }));

    try {
      const { error } = await supabase.rpc('registrar_salida_manual', {
        p_usuario_id: user.id,
        p_motivo: motivo,
        p_salidas: salidas,
      });

      if (error) throw error;

      toast.success('Salida registrada correctamente.');
      // Reset form state completely
      setDispatchCart(new Map());
      setMotivo('');
      setSelectedMasterProductId(''); 
      setAvailableLots([]);

    } catch (error: any) {
      console.error('Error en la salida manual:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalSelected = Array.from(dispatchCart.values()).reduce((sum, qty) => sum + qty, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Salida Manual de Productos</h1>
        <p className="text-gray-600 mt-2">Selecciona un producto para ver sus lotes y elige cuánto retirar de cada uno.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-6">
          <Select
            label="Seleccionar Producto"
            value={selectedMasterProductId}
            onChange={handleMasterProductChange}
            options={masterProducts.map(p => ({ value: p.id, label: p.nombre }))}
            placeholder="Elige un producto..."
          />

          {availableLots.length > 0 && (
            <div className="overflow-x-auto">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Lotes Disponibles (Ordenados por vencimiento)</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Lote</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Vencimiento</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '120px' }}>Cantidad a Retirar</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {availableLots.map((lot) => (
                    <tr key={lot.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lot.numero_lote}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{lot.stock_actual}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {lot.fecha_vencimiento ? format(new Date(lot.fecha_vencimiento), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Input
                          type="number"
                          min="0"
                          max={lot.stock_actual}
                          value={dispatchCart.get(lot.id) || ''}
                          onChange={(e) => handleQuantityChange(lot.id, e.target.value)}
                          className="text-sm"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedMasterProductId && availableLots.length === 0 && !loading && (
            <div className="text-center py-10 px-4 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-gray-500">No hay lotes con stock disponible para este producto.</p>
            </div>
          )}

          {dispatchCart.size > 0 && (
            <div className="pt-6 border-t border-gray-200 space-y-4">
                <Input
                    label="Motivo o Destinatario de la Salida"
                    name="motivo"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej: Uso en Pabellón 1, Paciente Rut XXX, etc."
                    required
                />
                <div className="flex justify-end items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Total a retirar: {totalSelected}</span>
                    <Button type="submit" isLoading={loading} disabled={loading}>
                        Registrar Salida
                    </Button>
                </div>
            </div>
          )}
        </Card>
      </form>
    </div>
  );
}