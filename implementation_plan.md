# Plan de Implementación - Mejoras Proyecto Clínica

Este documento detalla los pasos para realizar las modificaciones solicitadas al sistema.

## 1. Base de Datos (Migraciones)

Necesitamos crear una tabla para manejar las categorías dinámicamente, en lugar de tenerlas fijas en el código.

**SQL Sugerido (Ejecutar en Supabase):**
```sql
-- Crear tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- Insertar categorías actuales como base
INSERT INTO categorias (nombre, descripcion) VALUES
('sueros', 'Sueros'),
('acidos', 'Ácidos'),
('medicamentos', 'Medicamentos'),
('material_quirurgico', 'Material Quirúrgico'),
('antisepticos', 'Antisépticos'),
('vendajes', 'Vendajes'),
('jeringas', 'Jeringas'),
('otros', 'Otros')
ON CONFLICT (nombre) DO NOTHING;

-- (Opcional) Actualizar tabla maestro_productos para referenciar categorias si se desea integridad referencial estricta,
-- por ahora mantendremos el campo texto pero se llenará desde esta tabla.
```

## 2. Hoja Product Master (`src/pages/ProductMaster.tsx`)

*   **Objetivo**: Agregar gestión de Categorías.
*   **Cambios**:
    *   Agregar una tercera pestaña (Tab) llamada "Categorías".
    *   Implementar CRUD (Crear, Leer, Actualizar, Eliminar) para la tabla `categorias`.
    *   Actualizar el formulario de "Maestro de Productos" para que el dropdown de categorías lea de esta nueva tabla en lugar de la lista fija.

## 3. Hoja Inventory (`src/pages/Inventory.tsx`)

*   **Objetivo**: Mejorar filtros y acciones.
*   **Cambios**:
    *   **Botón Agregar**: Eliminar el botón "+Agregar Producto" de la cabecera.
    *   **Filtros**:
        *   Agregar etiquetas (labels) descriptivas arriba de cada filtro (Ej: "Buscar por nombre", "Categoría", "Condición").
        *   Agregar filtros de fecha: "Fecha de Ingreso" (Desde/Hasta) y "Fecha de Vencimiento" (Desde/Hasta).
    *   **Lógica**: Conectar los nuevos filtros de fecha a la función de filtrado.

## 4. Hoja Entries (`src/pages/Entries.tsx`)

*   **Objetivo**: Reordenar y mejorar usabilidad.
*   **Cambios**:
    *   **Orden de Opciones**: Cambiar el orden de los botones superiores:
        1.  Registrar Nuevo Producto
        2.  Entrada Masiva
        3.  Añadir a Stock Existente
    *   **Registrar Nuevo Producto**:
        *   **Proveedor**: Reemplazar el botón `+` por un botón/enlace más claro "Crear Nuevo Proveedor".
        *   **Campos Obligatorios**: Agregar texto explícito "(Obligatorio)" en los labels correspondientes.
        *   **Campos Fijos**: Mostrar `Stock Crítico` y `Categoría` como texto estático o inputs deshabilitados sin flecha de selección. Agregar nota "Información precargada del producto maestro".
    *   **Entrada Masiva**:
        *   Mejorar título y vista general.
        *   Asegurar que el campo "Guía" sea claramente visible y obligatorio (ya lo es, pero reforzar visualmente).

## 5. Hoja Patient Medications (`src/pages/PatientMedications.tsx`)

*   **Objetivo**: Corregir lógica de fechas y formato.
*   **Cambios**:
    *   **Mes de Entrega**: Cambiar el selector de solo "Mes" a "Mes y Año" (o dos selectores) para permitir registrar entregas de años anteriores o futuros correctamente.
    *   **RUT**: Implementar formateador automático de RUT Chileno (XX.XXX.XXX-X) en el input.

## 6. Hoja Delivery History (`src/pages/DeliveryHistory.tsx`)

*   **Objetivo**: Claridad en filtros.
*   **Cambios**:
    *   Agregar etiquetas (labels) descriptivas a los filtros (Fecha Desde, Fecha Hasta, RUT, Usuario).

---

## Ejecución

Comenzaremos aplicando los cambios en el orden descrito, empezando por confirmar la migración de base de datos (o simularla en frontend si no se aplica inmediatamente) y luego las vistas.
