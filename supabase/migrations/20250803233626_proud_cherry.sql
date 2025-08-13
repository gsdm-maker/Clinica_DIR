/*
  # Crear tabla de productos

  1. Nueva tabla
    - `productos` con todos los campos requeridos
    - Campos para descripción, categoría, stock, fechas, etc.
  
  2. Seguridad
    - Habilitar RLS
    - Políticas para lectura según roles
*/

CREATE TABLE IF NOT EXISTS productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion text NOT NULL,
  categoria text NOT NULL,
  stock_critico integer NOT NULL,
  stock_actual integer NOT NULL,
  fecha_ingreso date,
  condicion text,
  proveedor text,
  numero_lote text,
  fecha_vencimiento date,
  observaciones text,
  bloqueado boolean DEFAULT false,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura a todos"
  ON productos
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Permitir escritura a bodega y admin"
  ON productos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'bodega')
    )
  );