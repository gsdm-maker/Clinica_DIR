/*
  # Ajustar la relación en la tabla de movimientos

  1. Flexibilizar la clave externa
    - Se modifica la restricción de la columna `usuario_id` en la tabla `movimientos`.
    - Ahora, si un usuario es eliminado, el `usuario_id` en sus movimientos se establecerá en NULL.
    - Esto previene errores de bloqueo y mantiene la integridad del historial.
*/

-- Paso 1: Eliminar la restricción de clave externa existente.
-- El nombre de la restricción es generalmente `tabla_columna_fkey`.
ALTER TABLE public.movimientos
DROP CONSTRAINT IF EXISTS movimientos_usuario_id_fkey;

-- Paso 2: Volver a agregar la restricción con la opción ON DELETE SET NULL.
ALTER TABLE public.movimientos
ADD CONSTRAINT movimientos_usuario_id_fkey
FOREIGN KEY (usuario_id)
REFERENCES public.users(id)
ON DELETE SET NULL;
