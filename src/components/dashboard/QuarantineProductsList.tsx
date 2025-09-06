import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';

type QuarantineProduct = {
  producto_id: string;
  producto_nombre: string;
  numero_lote: string;
  stock_actual: number;
  fecha_vencimiento: string;
  condicion: string;
};

export function QuarantineProductsList() {
  const [products, setProducts] = useState<QuarantineProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuarantineProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_quarantine_products_list');
        if (error) {
          throw error;
        }
        setProducts(data || []);
      } catch (error: any) {
        console.error('Error fetching quarantine products:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuarantineProducts();
  }, []);

  if (loading) {
    return (
      <Card className="p-4 col-span-full">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 col-span-full">
      <div className="flex items-center mb-4">
        <Trash2 className="h-6 w-6 text-yellow-500 mr-2" />
        <h2 className="text-lg font-semibold text-gray-800">Productos en Cuarentena ({products.length})</h2>
      </div>
      
      {products.length === 0 ? (
        <p className="text-gray-600">No hay productos actualmente en cuarentena.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">N° Lote</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Condición</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.producto_id}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{product.producto_nombre}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{product.numero_lote}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-yellow-600 font-semibold">{product.stock_actual}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    {product.fecha_vencimiento ? format(new Date(product.fecha_vencimiento), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{product.condicion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
