-- Enlace fijo a la carpeta de Google Drive de cada miembro del equipo de
-- contenido (su carpeta general de trabajo, donde Raúl deja los vídeos en
-- bruto). Se rellena desde Equipo > editar miembro, solo visible/relevante
-- para el área "contenido".
alter table public.miembros_equipo add column if not exists carpeta_drive text default '';
