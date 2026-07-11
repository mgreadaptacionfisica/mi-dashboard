-- Adjuntar informe PDF (ZeroChats, Calendly...) a un lead de Ventas.
-- Bucket privado de Supabase Storage: solo gente logueada puede subir/ver
-- estos informes (pueden contener datos sensibles del lead, como la
-- transcripción de la conversación con el setter). Se accede siempre con
-- URL firmada de corta duración, nunca con enlace público permanente.
insert into storage.buckets (id, name, public)
values ('informes-leads', 'informes-leads', false)
on conflict (id) do nothing;

drop policy if exists "informes_leads_select" on storage.objects;
create policy "informes_leads_select" on storage.objects for select
  using (bucket_id = 'informes-leads' and auth.uid() is not null);

drop policy if exists "informes_leads_insert" on storage.objects;
create policy "informes_leads_insert" on storage.objects for insert
  with check (bucket_id = 'informes-leads' and auth.uid() is not null);

drop policy if exists "informes_leads_update" on storage.objects;
create policy "informes_leads_update" on storage.objects for update
  using (bucket_id = 'informes-leads' and auth.uid() is not null);

drop policy if exists "informes_leads_delete" on storage.objects;
create policy "informes_leads_delete" on storage.objects for delete
  using (bucket_id = 'informes-leads' and auth.uid() is not null);

-- Ruta del PDF dentro del bucket (ej. "lead-1720.../informe-169900.pdf").
-- Se guarda solo la ruta, no una URL pública: la URL real se genera al
-- vuelo (firmada, caduca en una hora) cada vez que alguien pulsa "Ver".
alter table public.ventas add column if not exists informe_prellamada_path text default '';

notify pgrst, 'reload schema';
