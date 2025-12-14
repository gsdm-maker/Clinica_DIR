import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Package,
  Plus,
  Minus,
  CheckSquare,
  Syringe,
  History,
  Users,
  Settings,
  LogOut,
  Archive
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home, permission: 'view_stock' },
  { name: 'Control de Bodega', href: '/inventory', icon: Package, permission: 'manage_stock' },
  { name: 'Entrada de Productos', href: '/entries', icon: Plus, permission: 'entries' },
  { name: 'Salida de Productos', href: '/exits', icon: Minus, permission: 'exits' },
  { name: 'Checklist Almacenamiento', href: '/checklist-storage', icon: CheckSquare, permission: 'checklists' },
  { name: 'Checklist Protocolo', href: '/checklist-protocol', icon: CheckSquare, permission: 'checklists' },
  { name: 'Medicamentos Pacientes', href: '/patient-medications', icon: Syringe, permission: 'patient_medications' },
  { name: 'Historial de Entregas', href: '/delivery-history', icon: Archive, permission: 'patient_medications' },
  { name: 'Historial de Checklists', href: '/checklist-history', icon: History, permission: 'checklists' },
  { name: 'Historial Movimientos', href: '/movements', icon: History, permission: 'view_reports' },
  { name: 'Usuarios', href: '/users', icon: Users, permission: 'all' },
  { name: 'Maestros', href: '/product-master', icon: Settings, permission: 'manage_master_products' },
];

interface SidebarProps {
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ onClose, className }: SidebarProps) {
  const location = useLocation();
  const { user, hasPermission, logout } = useAuth();

  const filteredNavigation = navigation.filter(item =>
    hasPermission(item.permission) || (item.permission === 'all' && user?.role === 'admin') || (item.permission === 'manage_master_products' && (user?.role === 'admin' || user?.role === 'bodega'))
  );

  return (
    <div className={clsx('flex flex-col w-64 bg-white shadow-xl border-r border-gray-200 h-full', className)}>
      <div className="flex items-center justify-between h-16 px-6 bg-blue-600">
        <h1 className="text-lg font-bold text-white tracking-wide">Gestión Insumos</h1>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-white/80 hover:text-white transition-colors p-1 rounded-md hover:bg-blue-700">
            <span className="sr-only">Cerrar</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <nav className="flex-1 px-4 py-6 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={clsx(
                  'group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out',
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={clsx('mr-3 h-5 w-5 transition-colors', isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600')} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center mb-4 px-2">
            <div className="shrink-0 w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm ring-2 ring-white">
              <span className="text-white text-sm font-bold">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-blue-600 capitalize font-medium">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center w-full px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors group"
          >
            <LogOut className="mr-3 h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}