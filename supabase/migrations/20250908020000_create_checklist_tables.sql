-- Create tables for Checklist Audits and their questions

-- Table: public.auditorias_checklist
CREATE TABLE IF NOT EXISTS public.auditorias_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_checklist TEXT NOT NULL, -- e.g., 'almacenamiento', 'protocolo'
    fecha_auditoria TIMESTAMPTZ NOT NULL DEFAULT now(),
    usuario_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    porcentaje_completado INTEGER NOT NULL,
    total_hallazgos INTEGER NOT NULL,
    observaciones_generales TEXT
);

-- RLS Policies for auditorias_checklist
ALTER TABLE public.auditorias_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read auditorias_checklist"
ON public.auditorias_checklist
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authorized roles to insert auditorias_checklist"
ON public.auditorias_checklist
FOR INSERT
TO authenticated
WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega', 'enfermero'));

CREATE POLICY "Allow authorized roles to update auditorias_checklist"
ON public.auditorias_checklist
FOR UPDATE
TO authenticated
USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega'));

CREATE POLICY "Allow authorized roles to delete auditorias_checklist"
ON public.auditorias_checklist
FOR DELETE
TO authenticated
USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega'));


-- Table: public.auditoria_preguntas
CREATE TABLE IF NOT EXISTS public.auditoria_preguntas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL REFERENCES public.auditorias_checklist(id) ON DELETE CASCADE,
    pregunta_id TEXT NOT NULL, -- e.g., 'temperature', 'fifo'
    respuesta TEXT NOT NULL, -- e.g., 'yes', 'no'
    plan_accion TEXT,
    evidencia_url TEXT
);

-- RLS Policies for auditoria_preguntas
ALTER TABLE public.auditoria_preguntas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read auditoria_preguntas"
ON public.auditoria_preguntas
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authorized roles to insert auditoria_preguntas"
ON public.auditoria_preguntas
FOR INSERT
TO authenticated
WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega', 'enfermero'));

CREATE POLICY "Allow authorized roles to update auditoria_preguntas"
ON public.auditoria_preguntas
FOR UPDATE
TO authenticated
USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega'));

CREATE POLICY "Allow authorized roles to delete auditoria_preguntas"
ON public.auditoria_preguntas
FOR DELETE
TO authenticated
USING ((SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'bodega'));
