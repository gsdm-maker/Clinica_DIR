CREATE TABLE proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    direccion TEXT,
    clasificacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);