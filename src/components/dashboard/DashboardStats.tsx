import React from 'react';
import { Package, AlertTriangle, Clock, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { DashboardStats as DashboardStatsType } from '../../types';
import { clsx } from 'clsx'; // Import clsx for conditional classes

interface DashboardStatsProps {
  stats: DashboardStatsType;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      name: 'Total Productos',
      value: stats.total_products,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      isAlert: false, // Not an alert
      alertText: ''
    },
    {
      name: 'Stock Crítico',
      value: stats.critical_stock_products,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      isAlert: stats.critical_stock_products > 0, // Alert if > 0
      alertText: stats.critical_stock_products > 0 ? '¡Revisar!' : ''
    },
    {
      name: 'Productos Vencidos',
      value: stats.expired_products,
      icon: Clock,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      isAlert: stats.expired_products > 0, // Alert if > 0
      alertText: stats.expired_products > 0 ? '¡Urgente!' : ''
    },
    {
      name: 'En Cuarentena',
      value: stats.quarantine_products,
      icon: Trash2,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      isAlert: stats.quarantine_products > 0, // Alert if > 0
      alertText: stats.quarantine_products > 0 ? '¡Atención!' : ''
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat) => (
        <Card key={stat.name}>
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">{stat.name}</h3>
              <p className={clsx(
                "text-2xl font-semibold text-gray-900",
                stat.isAlert && "text-red-700" // Make value red if it's an alert
              )}>{stat.value}</p>
              {stat.isAlert && (
                <p className="text-xs font-bold text-red-500 mt-1">{stat.alertText}</p> // Display alert text
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}