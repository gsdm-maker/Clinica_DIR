export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'bodega' | 'auditor' | 'enfermero' | 'visualizador';
  created_at: string;
  updated_at: string;
}

// Nuevo tipo para el catálogo central de productos
export interface MasterProduct {
  id: string;
  nombre: string;
  categoria: string;
  descripcion?: string;
  stock_critico: number;
  creado_en: string;
  actualizado_en: string;
}

// La tabla `productos` ahora representa lotes de un producto maestro
export interface Product {
  id: string;
  maestro_producto_id: string;
  stock_actual: number;
  numero_lote?: string;
  fecha_vencimiento?: string;
  proveedor_id?: string; // Cambiado de proveedor a proveedor_id
  condicion: string;
  observaciones?: string;
  bloqueado: boolean;
  fecha_ingreso: string;
  creado_en: string;
  actualizado_en: string;
  maestro_productos?: { // Relación con maestro_productos
    nombre: string;
  }; 
}

export interface Movement {
  id: string;
  producto_id: string; // Ahora se refiere al ID del lote (tabla `productos`)
  usuario_id: string;
  tipo: 'entrada' | 'salida_administracion' | 'salida_eliminacion';
  cantidad: number;
  motivo?: string;
  rut_paciente?: string;
  nombre_paciente?: string;
  creado_en: string;
  producto?: Product; // El producto ahora es un lote
  usuario?: User;
}

export interface DashboardStats {
  total_products: number;
  critical_stock_products: number;
  expired_products: number;
  quarantine_products: number;
  recent_movements: Movement[];
  category_distribution: { category: string; count: number; value: number }[];
}

export interface Provider {
  id: string;
  nombre: string;
  direccion?: string;
  clasificacion?: string;
  created_at: string;
}

// ... (los otros tipos como Checklist, PatientMedication, etc. se mantienen igual)
