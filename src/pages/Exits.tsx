import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { MasterProduct } from '../types';

export default function Exits() {
  const { user } = useAuth();
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [formData, setFormData] = useState({
    maestroProductoId: '',
    cantidad: 1,
    motivo: ''
  });
  const [loading, setLoading] = useState(false);

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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.maestroProductoId || formData.cantidad <= 0 || !formData.motivo) {
      toast.error('Por favor, completa todos los campos.');
      return;
    }
    if (!user) {
        toast.error('No se ha podido identificar al usuario.');
        return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('registrar_salida_producto', {
        p_maestro_producto_id: formData.maestroProductoId,
        p_cantidad_solicitada: formData.cantidad,
        p_motivo: formData.motivo,
        p_usuario_id: user.id
      });

      if (error) {
        throw error;
      }

      toast.success('Salida de producto registrada correctamente.');
      // Reset form
      setFormData({
        maestroProductoId: '',
        cantidad: 1,
        motivo: ''
      });

    } catch (error: any) {
      console.error('Error registrando salida:', error);
      // The error message from the RPC function is what we want to show the user
      toast.error(error.message || 'Ocurrió un error al registrar la salida.');
    } finally {
      setLoading(false);
    }
  };

  const productOptions = masterProducts.map(p => ({ value: p.id, label: p.nombre }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Salida de Productos</h1>
        <p className="text-gray-600 mt-2">Registra la salida de insumos aplicando la regla FEFO (First-Expiry, First-Out).</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <Select
            label="Producto"
            name="maestroProductoId"
            value={formData.maestroProductoId}
            onChange={handleFormChange}
            options={productOptions}
            placeholder="Selecciona un producto..."
            required
          />

          <Input
            label="Cantidad a Retirar"
            name="cantidad"
            type="number"
            value={formData.cantidad}
            onChange={handleFormChange}
            min="1"
            required
          />

          <Input
            label="Motivo o Destino"
            name="motivo"
            value={formData.motivo}
            onChange={handleFormChange}
            placeholder="Ej: Uso en Pabellón 1, Paciente Rut XXX, etc."
            required
          />

          <div className="flex justify-end pt-4">
            <Button type="submit" isLoading={loading} disabled={loading}>
              Registrar Salida
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
