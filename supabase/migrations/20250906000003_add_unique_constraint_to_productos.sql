ALTER TABLE public.productos
ADD CONSTRAINT unique_numero_lote_condicion UNIQUE (numero_lote, condicion);