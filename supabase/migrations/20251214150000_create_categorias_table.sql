-- Create categories table
CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- Insert initial default categories
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

-- Enable RLS
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users" ON categorias
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable write access for admin and bodega roles" ON categorias
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND (users.role = 'admin' OR users.role = 'bodega')
      )
    );
