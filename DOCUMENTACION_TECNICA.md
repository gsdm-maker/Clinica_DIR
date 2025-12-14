# Documentación Técnica y Funcional del Proyecto Clínica

## 🏥 Resumen del Sistema

Este sistema es una aplicación web integral para la **Gestión y Trazabilidad de Insumos Médicos** en entornos clínicos. Su objetivo principal es digitalizar el control de bodega, asegurando que cada medicamento o insumo pueda ser rastreado desde su ingreso (proveedor) hasta su salida (paciente o consumo interno).

### Principales Objetivos del Negocio Resueltos:
1.  **Trazabilidad Completa:** Control detallado por **Lote** y **Fecha de Vencimiento**, crítico para la seguridad del paciente.
2.  **Prevención de Pérdidas:** Alertas automáticas de vencimiento y caducidad para evitar mermas.
3.  **Seguridad y Auditoría:** Registro inmutable de *quién* realizó cada movimiento y *cuándo*.
4.  **Eficiencia Operativa:** Formularios de ingreso masivo y salidas rápidas para agilizar el trabajo diario del personal.

---

## 🛠 Stack Tecnológico

La aplicación está construida sobre un stack moderno, seguro y escalable:

### Frontend (Interfaz de Usuario)
*   **React 18 + TypeScript:** Garantiza una interfaz rápida, segura y menos propensa a errores.
*   **Vite:** Motor de construcción de última generación para una experiencia de desarrollo veloz.
*   **Tailwind CSS:** Sistema de diseño que permite una estética limpia, consistente y totalmente *responsiva*.
*   **Librerías Clave:**
    *   `lucide-react`: Iconografía moderna.
    *   `recharts`: Gráficos estadísticos interactivos.
    *   `date-fns`: Manejo preciso de fechas y zonas horarias (formato español).
    *   `xlsx`: Exportación de reportes a Excel.

### Backend y Base de Datos (Serverless)
*   **Supabase (BaaS):** Provee la infraestructura de backend completa.
    *   **PostgreSQL:** Base de datos relacional potente.
    *   **Auth:** Autenticación segura de usuarios y gestión de sesiones.
    *   **RLS (Row Level Security):** Seguridad a nivel de base de datos; un usuario solo puede ver/modificar lo que su rol le permite.
    *   **Funciones RPC:** Lógica de negocio compleja (ej. reporte de movimientos) ejecutada directamente en el servidor para mayor rendimiento.

---

## 🔄 Flujos de Trabajo Principales

### 1. Gestión de Stock e Ingresos
El sistema maneja el inventario no como un número simple, sino como una colección de lotes.
*   **Ingreso Masivo:** Permite recibir una guía de despacho completa con múltiples productos, asignando lotes y fechas de vencimiento a cada línea.
*   **Validación de Lotes:** El sistema impide duplicar lotes para un mismo producto, asegurando la integridad de los datos.
*   **Alertas:** Al ingresar, se definen umbrales de stock crítico.

### 2. Control de Salidas y Dispensación
*   **Salidas de Bodega:** Retiro de insumos para uso interno (ej. abastecer un carro de paro). Se descuenta de lotes específicos (preferiblemente los más próximos a vencer - FIFO/FEFO conceptual).
*   **Dispensación a Pacientes:** Módulo dedicado para registrar la entrega de medicación nominativa a un paciente (identificado por RUT), generando un historial clínico-logístico.

### 3. Calidad y Auditoría (Checklists)
*   Digitalización de carpetas de control.
*   **Checklist de Almacenamiento:** Registro diario/mensual de temperatura, humedad y limpieza.
*   **Checklist de Protocolos:** Verificación del cumplimiento de normas sanitarias.

---

## 📱 Estructura de la Aplicación (Mapa del Sitio)

1.  **Dashboard:**
    *    *"La Torre de Control"*. KPIs en tiempo real, alertas de cuarentena/vencimiento y gráficos de distribución.
2.  **Control de Bodega:**
    *   Inventario detallado. Buscador avanzado y filtros por estado (Bueno, Cuarentena, Vencido).
3.  **Entrada de Productos:**
    *   Formularios para: Stock Existente, Nuevo Producto y Carga Masiva (Guía).
4.  **Salida de Productos:**
    *   Carrito de compras interno para retirar múltiples productos en una sola transacción.
5.  **Medicamentos Pacientes:**
    *   Ficha de entrega por paciente.
6.  **Historiales (Reportes):**
    *   Historial de Movimientos, Entregas y Checklists. Exportables a Excel.
7.  **Administración:**
    *   Maestro de Productos, Proveedores y Usuarios.

---

## 🎨 Diseño y Experiencia de Usuario (UX)

*   **100% Responsivo:** Diseñado con un enfoque *mobile-friendly*. Incluye menús laterales desplegables y tablas adaptables para uso en tablets o teléfonos dentro de la bodega.
*   **Semántica de Color:**
    *   🟢 **Verde:** Estado óptimo, operaciones exitosas.
    *   🔴 **Rojo:** Peligro, stock crítico, productos vencidos.
    *   🟡 **Amarillo:** Advertencia, productos en cuarentena o por vencer.
*   **Tipografía:** Uso de la familia *Inter* para máxima legibilidad en pantallas.

## 🚀 Despliegue
La aplicación es una *Single Page Application (SPA)* estática, lista para desplegarse globalmente en CDNs como Vercel, Netlify o Cloudflare Pages, conectándose de forma segura a la nube de Supabase.
