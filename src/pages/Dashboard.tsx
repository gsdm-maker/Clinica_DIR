import React, { useEffect, useState } from 'react';
import { DashboardStats as DashboardStatsComponent } from '../components/dashboard/DashboardStats';
import { RecentMovements } from '../components/dashboard/RecentMovements';
import { CategoryChart } from '../components/dashboard/CategoryChart';
import { DashboardStats } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { CriticalStockList } from '../components/dashboard/CriticalStockList';
import { ExpiringProductsList } from '../components/dashboard/ExpiringProductsList';
import { QuarantineProductsList } from '../components/dashboard/QuarantineProductsList';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total_products: 0,
    critical_stock_products: 0,
    expired_products: 0,
    quarantine_products: 0,
    recent_movements: [],
    category_distribution: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_dashboard_stats');

      if (error) {
        throw error;
      }

      if (data) {
        setStats(data);
      }

    } catch (error: any) {
      toast.error('Error al cargar los datos del dashboard.');
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Resumen general del sistema de gestión de insumos médicos</p>
      </div>

      <DashboardStatsComponent stats={stats} />

      {/* New section for alert lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <CriticalStockList />
        <ExpiringProductsList daysThreshold={30} title="Productos a Vencer (30 días)" />
        <ExpiringProductsList daysThreshold={90} title="Productos a Vencer (90 días)" />
        <QuarantineProductsList />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <RecentMovements movements={stats.recent_movements} />
        <CategoryChart data={stats.category_distribution} />
      </div>
    </div>
  );
}
