import React from 'react';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Movement } from '../../types';

interface RecentMovementsProps {
  movements: Movement[];
}

export function RecentMovements({ movements }: RecentMovementsProps) {
  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'entrada':
        return 'Entrada';
      case 'salida_administracion':
        return 'Administración';
      case 'salida_eliminacion':
        return 'Eliminación';
      default:
        return type;
    }
  };

  const getMovementVariant = (type: string) => {
    switch (type) {
      case 'entrada':
        return 'success';
      case 'salida_administracion':
        return 'info';
      case 'salida_eliminacion':
        return 'danger';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string | null | undefined, formatString: string) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return isValid(date) ? format(date, formatString, { locale: es }) : 'Fecha inválida';
  };

  return (
    <Card title="Últimos Movimientos" className="lg:col-span-2">
      <div className="space-y-4">
        {movements.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No hay movimientos recientes</p>
        ) : (
          movements.map((movement) => (
            <div key={movement.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <Badge variant={getMovementVariant(movement.tipo_movimiento)}> {/* Use tipo_movimiento */}
                    {getMovementTypeLabel(movement.tipo_movimiento)} {/* Use tipo_movimiento */}
                  </Badge>
                  <h4 className="text-sm font-medium text-gray-900">
                    {movement.producto_nombre || 'Producto no disponible'} {/* Use producto_nombre */}
                  </h4>
                </div>
                <div className="mt-1 flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    Cantidad: {movement.cantidad} {/* Use cantidad */}
                  </span>
                  <span className="text-sm text-gray-500">
                    Usuario: {movement.usuario_email || 'Usuario no disponible'} {/* Use usuario_email */}
                  </span>
                </div>
                {/* Removed patient_name and patient_rut as they are not in the SQL output for recent_movements */}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {formatDate(movement.fecha, 'dd MMM yyyy')} {/* Use fecha */}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(movement.fecha, 'HH:mm')} {/* Use fecha */}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
