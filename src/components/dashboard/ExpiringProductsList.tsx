import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock } from 'lucide-react';

import { Badge } from '../ui/Badge';

// Helper for condition colors
const getConditionVariant = (condition: string) => {
  if (!condition) return 'default';
  switch (condition.toLowerCase()) {
    case 'bueno': return 'success';
    case 'nuevo': return 'success';
    case 'cuarentena': return 'warning';
    case 'regular': return 'warning';
    case 'vencido': return 'danger';
    case 'dañado': return 'danger';
    case 'malo': return 'danger';
    default: return 'default';
  }
};

type ExpiringProduct = {
  producto_id: string;
  producto_nombre: string;
  numero_lote: string;
  stock_actual: number;
  fecha_vencimiento: string;
  condicion: string;
};

interface ExpiringProductsListProps {
  daysThreshold: number;
  title: string;
}

export function ExpiringProductsList({ daysThreshold, title }: ExpiringProductsListProps) {
  const [products, setProducts] = useState<ExpiringProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpiringProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_expiring_products_list', { days_threshold: daysThreshold });
        if (error) {
          throw error;
        }
        setProducts(data || []);
      } catch (error: any) {
        console.error(`Error fetching expiring products (threshold: ${daysThreshold}):`, error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExpiringProducts();
  }, [daysThreshold]);

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
        <Clock className="h-6 w-6 text-red-500 mr-2" />
        <h2 className="text-lg font-semibold text-gray-800">{title} ({products.length})</h2>
      </div>

      {products.length === 0 ? (
        <p className="text-gray-600">No hay productos {title.toLowerCase()} actualmente.</p>
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
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{product.producto_nombre}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{product.numero_lote}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600 font-semibold">{product.stock_actual}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                    {product.fecha_vencimiento ? format(new Date(product.fecha_vencimiento), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm capitalize">
                    <Badge variant={getConditionVariant(product.condicion)}>{product.condicion}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
