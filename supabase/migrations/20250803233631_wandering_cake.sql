/*
  # Crear tabla de movimientos

  1. Nueva tabla
    - `movimientos` para historial tipo Kardex
    - Relaciones con productos y usuarios
  
  2. Seguridad
    - Habilitar RLS
    - Políticas de acceso por rol
*/

CREATE TABLE IF NOT EXISTS movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid REFERENCES productos(id),
  usuario_id uuid REFERENCES users(id),
  tipo text NOT NULL,
  cantidad integer NOT NULL,
  motivo text,
  rut_paciente text,
  nombre_paciente text,
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura a todos"
  ON movimientos
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Permitir escritura a usuarios autenticados"
  ON movimientos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);