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
                  <Badge variant={getMovementVariant(movement.type)}>
                    {getMovementTypeLabel(movement.type)}
                  </Badge>
                  <h4 className="text-sm font-medium text-gray-900">
                    {movement.producto?.descripcion || 'Producto no disponible'}
                  </h4>
                </div>
                <div className="mt-1 flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    Cantidad: {movement.quantity}
                  </span>
                  <span className="text-sm text-gray-500">
                    Usuario: {movement.usuario?.name || 'Usuario no disponible'}
                  </span>
                </div>
                {movement.patient_name && (
                  <div className="mt-1">
                    <span className="text-sm text-gray-500">
                      Paciente: {movement.patient_name} ({movement.patient_rut})
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {formatDate(movement.created_at, 'dd MMM yyyy')}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(movement.created_at, 'HH:mm')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
