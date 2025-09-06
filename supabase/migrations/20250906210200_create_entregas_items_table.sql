-- Create the entrega_items table
CREATE TABLE public.entrega_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entrega_id UUID NOT NULL REFERENCES public.entregas(id) ON DELETE CASCADE,
    medicamento TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS) for the entrega_items table
ALTER TABLE public.entrega_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users to read their own delivery items (if applicable, or all delivery items if public)
CREATE POLICY "Allow authenticated users to view all delivery items"
ON public.entrega_items FOR SELECT
TO authenticated
USING (true);

-- Create RLS policy for authenticated users to insert new delivery items
CREATE POLICY "Allow authenticated users to insert delivery items"
ON public.entrega_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create RLS policy for authenticated users to update delivery items
CREATE POLICY "Allow authenticated users to update delivery items"
ON public.entrega_items FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policy for authenticated users to delete delivery items
CREATE POLICY "Allow authenticated users to delete delivery items"
ON public.entrega_items FOR DELETE
TO authenticated
USING (true);