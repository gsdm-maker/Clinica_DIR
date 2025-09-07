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
  Monitor, 
  FileText,
  Users,
  Settings,
  LogOut,
  Archive // Added Archive for history
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
  { name: 'Historial de Entregas', href: '/delivery-history', icon: Archive, permission: 'patient_medications' }, // New Link
  { name: 'Historial Movimientos', href: '/movements', icon: History, permission: 'view_reports' },
  { name: 'Dispositivos Médicos', href: '/medical-devices', icon: Monitor, permission: 'manage_stock' },
  { name: 'Egresos', href: '/egress', icon: Minus, permission: 'exits' },
  { name: 'Reportes', href: '/reports', icon: FileText, permission: 'view_reports' },
  { name: 'Usuarios', href: '/users', icon: Users, permission: 'all' },
  { name: 'Maestros', href: '/product-master', icon: Settings, permission: 'manage_master_products' },
];

export function Sidebar() {
  const location = useLocation();
  const { user, hasPermission, logout } = useAuth();

  const filteredNavigation = navigation.filter(item => 
    hasPermission(item.permission) || (item.permission === 'all' && user?.role === 'admin') || (item.permission === 'manage_master_products' && (user?.role === 'admin' || user?.role === 'bodega'))
  );

  return (
    <div className="flex flex-col w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="flex items-center justify-center h-16 px-6 bg-blue-600">
        <h1 className="text-lg font-bold text-white">Gestión Insumos Médicos</h1>
      </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="flex items-center w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}