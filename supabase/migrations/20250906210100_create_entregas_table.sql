-- Create the entregas table
CREATE TABLE public.entregas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mes_entrega TEXT NOT NULL, -- Consider a date type if more specific date handling is needed
    paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    indicaciones_medicas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS) for the entregas table
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users to read their own deliveries (if applicable, or all deliveries if public)
CREATE POLICY "Allow authenticated users to view all deliveries"
ON public.entregas FOR SELECT
TO authenticated
USING (true);

-- Create RLS policy for authenticated users to insert new deliveries
CREATE POLICY "Allow authenticated users to insert deliveries"
ON public.entregas FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create RLS policy for authenticated users to update deliveries
ON public.entregas FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policy for authenticated users to delete deliveries
CREATE POLICY "Allow authenticated users to delete deliveries"
ON public.entregas FOR DELETE
TO authenticated
USING (true);