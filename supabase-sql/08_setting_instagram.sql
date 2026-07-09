-- Registro diario de setting de Instagram.
create table if not exists public.setting_instagram (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  bienvenidas_enviadas integer not null default 0,
  bienvenidas_respondidas integer not null default 0,
  mensaje_bienvenida text default '',
  fup_enviados integer not null default 0,
  fup_respondidas integer not null default 0,
  mensaje_fup text default '',
  ultima_bienvenida text default '',
  llamadas integer not null default 0,
  ventas integer not null default 0
);

alter table public.setting_instagram enable row level security;
create policy "setting_instagram_select_all" on public.setting_instagram for select using (true);
create policy "setting_instagram_insert_all" on public.setting_instagram for insert with check (true);
create policy "setting_instagram_update_all" on public.setting_instagram for update using (true);
create policy "setting_instagram_delete_all" on public.setting_instagram for delete using (true);

-- Biblioteca de mensajes de setting (N1/N2/N3, bienvenida y FUP). Datos reales, estables.
create table if not exists public.mensajes_setting (
  id text primary key,           -- ej. 'bienvenida-N1', 'fup-N2'
  tipo text not null check (tipo in ('bienvenida', 'fup')),
  plantilla text not null,       -- 'N1' | 'N2' | 'N3'
  descripcion text default '',
  texto text default ''
);

alter table public.mensajes_setting enable row level security;
create policy "mensajes_setting_select_all" on public.mensajes_setting for select using (true);
create policy "mensajes_setting_insert_all" on public.mensajes_setting for insert with check (true);
create policy "mensajes_setting_update_all" on public.mensajes_setting for update using (true);
create policy "mensajes_setting_delete_all" on public.mensajes_setting for delete using (true);

insert into public.mensajes_setting (id, tipo, plantilla, descripcion, texto) values
('bienvenida-N1', 'bienvenida', 'N1', 'Probar unas 400 personas', 'Hola! Gracias por sumarte a la cuenta, y espero que te aporte tanto para aprender como para recuperarte de una lesión

Por conocerte un poco mas, la lesión te limita, ¿entrenando o en tu día a día? ¿O ambos?'),
('bienvenida-N2', 'bienvenida', 'N2', 'Empezar a testear', 'Hola [NOMBRE], soy [TU NOMBRE], encantado/a!
Por simple curiosidad, y para poder enfocar mejor lo que comparto, ¿estás buscando mejorar en algún aspecto en concreto ahora mismo?'),
('bienvenida-N3', 'bienvenida', 'N3', 'Tercera opción de testeo y ver datos', 'Buenas [NOMBRE], gracias por seguirme, espero que te esté gustando lo que comparto por aquí.
¿Quería preguntarte si te interesa más la parte de alimentación o entrenamiento?'),
('fup-N1', 'fup', 'N1', 'Probar unas 400 personas', 'Buenas de nuevo, no sé si viste el mensaje o dijiste ya le respondo luego, ese luego que dura semanas 😅'),
('fup-N2', 'fup', 'N2', 'Empezar a testear', 'Hola!! Vengo a resurgir entre los mensajes olvidados 👋 ¿Pudiste leer el último que te envié?'),
('fup-N3', 'fup', 'N3', 'Tercera opción de testeo y ver datos', 'Buenaaas, ¿qué tal estás?, ¿has podido leer mi mensaje? Estoy por aquí atento, un saludo!')
on conflict (id) do nothing;

-- setting_instagram sin datos: los 48 registros reales se migran mañana con el script de exportación.
