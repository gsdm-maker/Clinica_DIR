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
  // Estas propiedades vendrán directamente de la salida de la función SQL
  producto_nombre: string; // De SQL's producto_nombre
  numero_lote?: string; // De SQL's numero_lote
  tipo_movimiento: 'entrada' | 'salida_administracion' | 'salida_eliminacion'; // De SQL's tipo_movimiento
  cantidad: number; // De SQL's cantidad
  condicion: string; // De SQL's condicion
  usuario_email: string; // De SQL's usuario_email
  motivo?: string; // De SQL's motivo
  fecha: string; // De SQL's fecha (creado_en)

  // Mantener estas para otras partes de la aplicación si es necesario, pero no serán pobladas por recent_movements de get_dashboard_stats
  producto_id?: string;
  usuario_id?: string;
  rut_paciente?: string;
  nombre_paciente?: string;
  creado_en?: string; // Esto será reemplazado por 'fecha' de SQL
  producto?: Product;
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

export interface Paciente {
  id: string;
  rut: string;
  nombre: string;
  created_at: string;
}

export interface Entrega {
  id: string;
  paciente_id: string;
  mes_entrega: string; // Or number, depending on how you store it (e.g., '09' for September or 9)
  indicaciones_medicas?: string;
  registrado_por_usuario_id: string;
  created_at: string;
  // Optional: to display patient name directly
  pacientes?: {
    nombre: string;
    rut: string;
  };
}

export interface EntregaItem {
  id: string;
  entrega_id: string;
  producto_nombre: string; // Or product_id if you link to MasterProduct
  cantidad: number;
  created_at: string;
}

// ... (los otros tipos como Checklist, PatientMedication, etc. se mantienen igual)
