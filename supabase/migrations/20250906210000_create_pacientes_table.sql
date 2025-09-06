-- Create the pacientes table
CREATE TABLE public.pacientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rut TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS) for the pacientes table
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users to read their own patients (if applicable, or all patients if public)
-- For now, let's assume authenticated users can read all patients. Adjust as needed.
CREATE POLICY "Allow authenticated users to view all patients"
ON public.pacientes FOR SELECT
TO authenticated
USING (true);

-- Create RLS policy for authenticated users to insert new patients
CREATE POLICY "Allow authenticated users to insert patients"
ON public.pacientes FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create RLS policy for authenticated users to update their own patients (if applicable, or all patients if public)
CREATE POLICY "Allow authenticated users to update patients"
ON public.pacientes FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policy for authenticated users to delete their own patients (if applicable, or all patients if public)
CREATE POLICY "Allow authenticated users to delete patients"
ON public.pacientes FOR DELETE
TO authenticated
USING (true);