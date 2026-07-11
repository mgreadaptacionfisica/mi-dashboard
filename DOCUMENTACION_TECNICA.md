# mi-dashboard — Documentación técnica

Panel interno de gestión para MG Group (readaptación física / entrenamiento online): pipeline de ventas, clientes, equipo, finanzas, contenido y comunicación interna. Documento pensado para alguien que se incorpore al desarrollo del proyecto.

## 1. Stack

- **Frontend:** React 18 + Vite 5, sin router (una sola vista con navegación por estado interno, ver `src/App.jsx`). Sin TypeScript.
- **Backend:** Supabase (Postgres + Auth + Storage + API REST autogenerada vía PostgREST). No hay servidor propio ni funciones serverless — todo el acceso a datos es cliente → Supabase directamente con `@supabase/supabase-js`.
- **Hosting:** Vercel (despliegue automático al hacer push a `main` en GitHub: `github.com/mgreadaptacionfisica/mi-dashboard`). `vercel.json` solo tiene un rewrite SPA (`/* → /index.html`).
- **Gráficas:** `recharts`.
- **Sin backend propio, sin colas, sin cron jobs.** Cualquier automatización futura (webhooks de Calendly, lectura de Gmail, etc.) tendría que añadirse como función serverless de Vercel o como Edge Function de Supabase — hoy no existe nada de eso.

## 2. Cómo correr en local

```bash
npm install
npm run dev      # servidor de desarrollo, puerto 3000
npm run build    # build de producción (Vercel lo ejecuta automáticamente en cada push)
```

Variables de entorno (`.env.local`, no está en git):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...   # la "anon key" de Supabase
```

Si estas variables no están definidas, `src/lib/supabaseClient.js` exporta `supabase = null` y toda la app cae a los datos estáticos de `src/data/*.js` (ver más abajo) en vez de romperse — es el modo en el que se desarrolló la app antes de tener Supabase.

Nota: `vite.config.js` tiene un proxy a `localhost:8000/api` que es residuo de un borrador inicial con backend propio que nunca se usó. No hay ningún endpoint `/api` real en la app; se puede quitar con seguridad.

## 3. Arquitectura de datos: patrón "remoto con fallback estático"

Cada módulo de datos (ventas, clientes, equipo...) sigue el mismo patrón, visible en `src/App.jsx`:

```js
const ventasDataPromise = async () => {
  const { fetchVentas } = await import('../lib/queries/ventas')
  const remoto = await fetchVentas()
  if (remoto !== null) return { default: remoto }
  return import('./data/ventas')   // fallback estático si Supabase falla o no responde
}
```

- `src/lib/queries/*.js`: un archivo por tabla (o grupo de tablas relacionadas), con `fetchX`, `insertXRemote`, `updateXRemote`, `deleteXRemote`. Todas usan el cliente único `src/lib/supabaseClient.js`.
- `src/data/*.js`: los datos originales, de antes de existir Supabase (algunos ya vacíos a propósito, ej. `ventas.js`, porque los leads reales viven solo en Supabase desde que se migró). Sirven de fallback si `fetchX()` devuelve `null` (error de red, tabla no accesible, etc.), para que la app nunca se quede completamente en blanco.
- Todo `App.jsx` carga los ~20 módulos de datos en paralelo con un único `Promise.all` al montar `InternalApp`, y los reparte como props a cada componente de sección. No hay ningún gestor de estado global (Redux, Zustand, Context) — todo vive en `useState` de `App.jsx` y baja por props.
- Cada escritura sigue el mismo patrón optimista: actualizar el estado de React inmediatamente (`setX(prev => ...)`) y en paralelo lanzar `updateXRemote()`/`insertXRemote()` sin esperar la respuesta ni bloquear la UI. Los errores de Supabase solo se registran con `console.error`, no se muestran al usuario — es la causa raíz de más de un bug detectado hoy (ver sección 8).

## 4. Autenticación y roles

- Login obligatorio con Supabase Auth (email + contraseña), gestionado en `src/lib/auth.js` y `src/components/PanelLogin.jsx`.
- 4 roles posibles: `admin`, `closer`, `tecnico`, `contenido`. El rol se guarda en `app_metadata` (no en `user_metadata`) precisamente porque `app_metadata` **no se puede modificar desde el navegador con la anon key**, solo con SQL directo o la Admin API — así nadie puede auto-asignarse otro rol manipulando su sesión.
- Asignación de rol: SQL manual sobre `auth.users` (`update auth.users set raw_app_meta_data = raw_app_meta_data || '{"rol": "admin"}'::jsonb where email = '...'`). No hay UI para gestionar roles todavía.
- `SECCIONES_POR_ROL` en `src/lib/auth.js` decide qué secciones del Sidebar ve cada rol:

  ```js
  admin:     ['dashboard', 'ventas', 'clientes', 'equipo', 'comunicacion', 'finanzas', 'onboarding', 'operaciones', 'tareas', 'manuales']
  closer:    ['ventas', 'comunicacion', 'manuales']
  tecnico:   ['clientes', 'comunicacion', 'manuales']
  contenido: ['operaciones', 'comunicacion', 'manuales']
  ```

- **Importante — dos capas de control de acceso, no una:** qué secciones ve cada rol en el menú es solo control de UI (`SECCIONES_POR_ROL`). El control real de qué **filas** puede leer/escribir cada rol vive en las políticas RLS de Postgres (ver sección 5). Hasta hoy (11/07/2026) casi todas las políticas eran `using (true)` — es decir, sin ninguna restricción real más allá de "estás logueado o ni eso" — y se ha ido cerrando en las migraciones 22 y 23 (ver sección 8). **Sigue pendiente**: `clientes`/`ventas` ya filtran SELECT por rol vía `mi_nombre_equipo()`, pero `seguimientos`, `contactos_semanales` y `valoraciones_clientes` (tablas hijas de `clientes`) todavía no — un técnico podría en teoría leer el seguimiento de clientes que no son suyos.
- Identificación de persona real dentro de la app: se cruza `session.user.email` contra `miembros_equipo.email` para resolver el nombre real (usado en `MuroEquipo.jsx`, `VideosParaEditar.jsx`, y a nivel de SQL en la función `public.mi_nombre_equipo()` de `22_row_level_rls.sql`).

## 5. Modelo de datos (Supabase / Postgres)

Todo el esquema vive versionado como SQL plano en `supabase-sql/`, numerado en orden de aplicación (`01_...` a `25_...`). **No se usa el sistema de migraciones de Supabase CLI** — son archivos `.sql` sueltos que se pegan a mano en el SQL Editor del dashboard de Supabase. Todos están escritos para ser idempotentes (`create table if not exists`, `drop policy if exists` + `create policy`, `add column if not exists`, `on conflict do nothing`), así que se pueden re-ejecutar sin duplicar nada — importante porque no hay ningún registro de "qué migración ya se aplicó" fuera de la memoria de quien las fue pegando.

Tablas principales:

| Tabla | Para qué |
|---|---|
| `clientes` | Los 64+ clientes reales del negocio: datos de contacto, servicio contratado, plazos de pago (`plazos` jsonb), técnico(s) asignado(s) (`trabajadores text[]`). |
| `ventas` | Pipeline comercial (leads), desde que se agenda una llamada hasta que se gana/pierde. Etapas: `agendada → realizada → seguimiento → ganada/perdida`. |
| `miembros_equipo` | Equipo interno: nombre, rol, área (ventas/técnico/contenido), comisión, y `carpeta_drive` (para editores de contenido). |
| `seguimientos`, `contactos_semanales` | Seguimiento clínico de clientes por parte de los técnicos. |
| `valoraciones_clientes` | Historial de valoraciones (SPADI, TAMPA, % mejoría) por cliente. |
| `sops` | Procedimientos operativos estándar (Operaciones). |
| `contenido_ideas` | Backlog de ideas de contenido: `Idea → Grabado → En edición → Editado → Programado → Publicado`, con `editores text[]`. |
| `mensajes_equipo` | Muro de comunicación interna (con menciones `@persona`). |
| `ingresos_personales` / `gastos_personales` | Finanzas personales de Raúl, 100% manuales, admin-only. |
| `ingresos_empresa` / `gastos_empresa` | Finanzas de empresa. Se alimentan automáticamente desde Clientes (cobro de plazos) y Equipo (pago al equipo). **Ojo:** estas dos tablas se llamaban `ingresos_personales` y `gastos_profesionales` hasta `15_finanzas_empresa_personal.sql`, que las renombró — un `ALTER TABLE ... RENAME` no renombra las políticas RLS asociadas, así que sus políticas todavía llevan el nombre antiguo en el `pg_policies` (cosmético, no rompe nada, pero puede confundir si se inspecciona el esquema directamente). |
| `ads_kpi`, `ads_notas_mensuales`, `anuncios` | KPIs e inversión en Meta/Instagram Ads. |
| `recontactos` | Personas a recontactar (leads en seguimiento + altas manuales). |
| `tareas_personales` | To-do personal de Raúl, admin-only, con aviso en el Dashboard si hay tareas vencidas. |
| `manuales` | Enlaces a los PDFs de manual de uso del panel (uno por rol), visible para los 4 roles. |
| `servicios`, `renovaciones` | Catálogos. |
| Storage bucket `informes-leads` | Privado. PDFs de informes de prellamada (ZeroChats, Calendly) adjuntos a un lead concreto de `ventas` (columna `informe_prellamada_path`). Se accede siempre con URL firmada de 1h, nunca enlace público. |

## 6. Secciones de la app (por componente)

- **Dashboard** (`Dashboard.jsx`): KPIs generales + dos banners de aviso (tareas vencidas, vídeos marcados como "Editado" pendientes de revisar). Único punto de la app que junta datos de varios módulos a la vez.
- **Ventas** (`Ventas.jsx`): pipeline Kanban de leads, con sub-pestañas para Setting de Instagram, KPI de Ads y Recontactar. El lead nuevo pasa por checklist pre-llamada → resultado de la llamada → venta (crea un cliente nuevo automáticamente) o pérdida. Incluye subida de informes de prellamada en PDF (Storage).
- **Clientes** (`Clientes.jsx`): ficha de cliente, seguimiento semanal, valoraciones clínicas, cobros pendientes.
- **Equipo** (`Equipo.jsx`): fichas del equipo, pago automático al marcar cobro, carpeta de Drive por editor de contenido.
- **Finanzas** (`Finanzas.jsx`): admin-only. Empresa (automático) + personal (manual), resumen mensual/anual.
- **Operaciones** (`Operaciones.jsx`): SOPs, calendario de contenido, y la cola "Para editar" (vídeos en edición por editor asignado).
- **Comunicación** (`MuroEquipo.jsx`): muro tipo feed con menciones, autor resuelto automáticamente por email de sesión (no editable a mano, por seguridad — ver incidente en sección 8).
- **Mis tareas** (`MisTareas.jsx`): to-do personal admin-only.
- **Manuales** (`Manuales.jsx`): PDFs de manual de uso, uno por rol, visibles para todos.
- **Onboarding** (`Onboarding.jsx`): única vista pública (`/onboarding`, sin login) — checklist interactivo para nuevos clientes, guarda progreso en `localStorage` del navegador del cliente, no en Supabase.

Componentes "huérfanos" que ya no se usan y se podrían borrar: `AdminLogin.jsx` (login viejo, sustituido por `PanelLogin.jsx`), `src/api/index.js` (si existe, residuo del backend propio nunca construido).

## 7. Seguridad — estado actual

- RLS (Row Level Security) activado en todas las tablas.
- Hasta el 11/07/2026, la inmensa mayoría de las políticas eran `using (true)` / `with check (true)`: como la anon key de Supabase viaja en el bundle JS público (no es secreta), esto equivalía a dejar la base de datos abierta a cualquiera en internet, sin necesidad de login. Se cerró en `23_cerrar_acceso_publico.sql`, exigiendo `auth.uid() is not null` en las operaciones de escritura/lectura de las tablas que lo tenían abierto.
- `clientes` y `ventas` tienen además restricción por fila (`22_row_level_rls.sql`): un técnico solo ve los clientes donde aparece en `trabajadores`, un closer solo ve los leads donde `closer` es su nombre. El admin ve todo.
- El bucket de Storage `informes-leads` es privado con las mismas políticas (`25_informes_leads.sql`).
- **Pendiente real, no resuelto:** `seguimientos`, `contactos_semanales`, `valoraciones_clientes` no tienen todavía restricción por fila (solo por login). Habría que decidir cómo relacionar `cliente_id`/nombre con `trabajadores` antes de cerrarlas, igual que se hizo con `clientes`/`ventas`.
- Nunca se ha expuesto ni se expone la contraseña de la base de datos ni las claves `service_role`/`secret` en ningún archivo del repo.

## 8. Incidentes recientes y aprendizajes (útil antes de tocar nada)

Todo esto pasó en la sesión del 11/07/2026 y merece la pena conocerlo antes de asumir que el esquema del repo coincide 1:1 con el de producción:

1. **Un lead nuevo desaparecía al refrescar la página.** Causa 1: `fecha_agenda`/`creado_en` son columnas `date`, y un `''` (fecha vacía en el formulario) hace que Postgres rechace el insert — pero el error solo se logueaba en consola (`console.error`), nunca se mostraba al usuario, así que el lead parecía guardado y desaparecía en el siguiente refresco. Se arregló convirtiendo `''` a `null` antes de enviarlo (`src/lib/queries/ventas.js`, `COLUMNAS_FECHA`).
2. **La tabla `ventas` completa apareció vacía tras haber funcionado.** Se investigó como posible borrado externo (por eso se cerró el acceso público en el punto 7). Real causa final, distinta y más simple: la tabla `ventas` en producción llevaba desde su creación **sin la columna `compra_en_llamada`** (entre otras) porque el archivo `05_ventas_pipeline.sql` se editó después de crear la tabla real, y `create table if not exists` no añade columnas nuevas a una tabla que ya existe. Cada insert fallaba con `PGRST204 — Could not find the 'compra_en_llamada' column`, silenciado igual que el punto 1. Arreglado en `24_fix_columnas_ventas.sql` (`alter table ... add column if not exists` de todas las columnas del esquema + `notify pgrst, 'reload schema'`).
3. **Lección de proceso, la importante:** en este proyecto el esquema "real" en Supabase puede haberse desviado silenciosamente del `.sql` que hay en el repo, porque las migraciones se pegan a mano y no hay ningún mecanismo que garantice que el archivo que ves en git es exactamente lo que hay corriendo. Antes de asumir una causa "rara" (ataques externos, RLS mal escrita, etc.) merece la pena verificar primero con el Table Editor de Supabase si la columna/tabla en cuestión existe de verdad.
4. **`git commit` falló una vez con `Unable to create HEAD.lock`**: dos sesiones distintas escribiendo sobre el mismo repo real (esta conversación + una tarea programada) intentaron commitear a la vez. El lock quedó huérfano (ningún proceso lo tenía realmente abierto) y se resolvió borrándolo a mano (`rm .git/HEAD.lock`) antes de reintentar. Si vuelve a pasar, comprobar primero con `ps aux | grep git` que de verdad no hay ningún proceso git activo antes de borrar el lock.
5. **`npm run build` falla en entornos Linux ARM ajenos al Mac de Raúl** con `Cannot find module @rollup/rollup-linux-arm64-gnu` — es un problema conocido de Rollup con binarios nativos específicos de arquitectura/SO en `node_modules`, no un fallo real del código. El build en Vercel (Linux x64) funciona sin problema.

## 9. Pendientes conocidos (a fecha de este documento)

- Cerrar RLS por fila en `seguimientos`, `contactos_semanales`, `valoraciones_clientes` (punto 7).
- Crear las cuentas reales de Supabase Auth del resto del equipo y asignarles rol — `17_roles_equipo.sql` sigue con emails de ejemplo.
- No hay flujo de "olvidé mi contraseña" para el equipo — hoy Raúl crea la contraseña inicial a mano.
- Sin diseño responsive/mobile dedicado (el panel está pensado para usarse desde portátil).
- Sin tests automatizados de ningún tipo (ni unitarios ni end-to-end). La validación de sintaxis se hace hoy con `@babel/parser` vía script suelto, no hay CI configurado.
- Limpieza pendiente de archivos huérfanos (`AdminLogin.jsx`, el proxy `/api` de `vite.config.js`).
- Automatización de leads desde Calendly/ZeroChats: evaluado, no implementado. Requiere plan de pago de Calendly (Standard+) para usar su webhook oficial, o una integración más compleja/frágil leyendo Gmail vía API si se quiere evitar el coste — ver conversación para el detalle de ambas opciones. De momento se optó por una versión manual (subida de PDF al lead, punto 5, tabla `ventas` / bucket `informes-leads`).
