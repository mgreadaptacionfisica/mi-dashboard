# mi-dashboard — Documentación técnica

Panel interno de gestión para MG Group (readaptación física / entrenamiento online): pipeline de ventas, clientes, equipo, finanzas, contenido y comunicación interna. Documento pensado para alguien que se incorpore al desarrollo del proyecto.

> Última revisión: 07/08/2026. Las secciones 4, 5, 6, 7 y 9 se repasaron al reestructurar Seguimiento y Valoración. La sección 8 describe incidentes del 11/07/2026 y se deja tal cual como histórico.

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
  admin:     ['dashboard', 'ventas', 'clientes', 'clientes-equipo', 'equipo', 'mi-ficha', 'comunicacion', 'finanzas', 'onboarding', 'operaciones', 'tareas', 'manuales', 'enlaces']
  closer:    ['ventas', 'comunicacion', 'manuales']
  tecnico:   ['clientes-equipo', 'mi-ficha', 'operaciones', 'tareas', 'comunicacion', 'manuales']
  contenido: ['operaciones', 'comunicacion', 'manuales']
  ```

  Dos matices que importan al tocar la parte del equipo técnico: `clientes`
  (contabilidad, `ClientesAdmin.jsx`) y `clientes-equipo` (seguimiento clínico,
  `ClientesEquipo.jsx`) son **secciones distintas**, y el técnico solo tiene la
  segunda — no ve importes ni cobros. Y el técnico **no tiene `equipo`**: todo lo
  que necesite hacer a diario tiene que estar dentro de `clientes-equipo` o
  `mi-ficha`, porque no puede llegar a la sección Equipo.

- **Importante — dos capas de control de acceso, no una:** qué secciones ve cada rol en el menú es solo control de UI (`SECCIONES_POR_ROL`). El control real de qué **filas** puede leer/escribir cada rol vive en las políticas RLS de Postgres (ver sección 5). Hasta hoy (11/07/2026) casi todas las políticas eran `using (true)` — es decir, sin ninguna restricción real más allá de "estás logueado o ni eso" — y se ha ido cerrando en las migraciones 22 y 23 (ver sección 8). **Sigue pendiente**: `clientes`/`ventas` ya filtran SELECT por rol vía `mi_nombre_equipo()`, pero `seguimientos`, `contactos_semanales` y `valoraciones_clientes` (tablas hijas de `clientes`) todavía no — un técnico podría en teoría leer el seguimiento de clientes que no son suyos.
- Identificación de persona real dentro de la app: se cruza `session.user.email` contra `miembros_equipo.email` para resolver el nombre real (usado en `MuroEquipo.jsx`, `VideosParaEditar.jsx`, y a nivel de SQL en la función `public.mi_nombre_equipo()` de `22_row_level_rls.sql`).

## 5. Modelo de datos (Supabase / Postgres)

Todo el esquema vive versionado como SQL plano en `supabase-sql/`, numerado en orden de aplicación (`01_...` en adelante; la última a fecha de este documento es `52_diagnostico_diferencial.sql`, así que la siguiente que se escriba sería la 53). **No se usa el sistema de migraciones de Supabase CLI** — son archivos `.sql` sueltos que se pegan a mano en el SQL Editor del dashboard de Supabase. Todos están escritos para ser idempotentes (`create table if not exists`, `drop policy if exists` + `create policy`, `add column if not exists`, `on conflict do nothing`), así que se pueden re-ejecutar sin duplicar nada — importante porque no hay ningún registro de "qué migración ya se aplicó" fuera de la memoria de quien las fue pegando.

Tablas principales:

| Tabla | Para qué |
|---|---|
| `clientes` | Los 64+ clientes reales del negocio: datos de contacto, servicio contratado, plazos de pago (`plazos` jsonb), técnico(s) asignado(s) (`trabajadores text[]`). |
| `ventas` | Pipeline comercial (leads), desde que se agenda una llamada hasta que se gana/pierde. Etapas: `agendada → realizada → seguimiento → ganada/perdida`. |
| `miembros_equipo` | Equipo interno: nombre, rol, área (ventas/técnico/contenido), comisión, y `carpeta_drive` (para editores de contenido). |
| `seguimientos` | Seguimiento clínico semanal por cliente: `dias -> tareas` (las sesiones del día a día, que se escriben desde la rejilla del Registro de sesiones), `cambios_pendientes` y `revisiones`. Una fila por cliente y semana. |
| `contactos_semanales` | Los 3 contactos por cliente y semana (inicio / mitad / fin), pestaña "Contacto semanal". |
| `revisiones_semanales_cliente` | El "check final" de semana revisada y cerrada, por cliente y semana. Es lo que apaga el aviso ⏳ y el banner de "semana pasada sin cerrar". |
| `objetivos_cliente_fase` | Objetivos por fase de cada cliente (`FasesObjetivos.jsx`); de ellos sale la fase automática. |
| `valoraciones_clientes` | Historial de valoraciones (SPADI, TAMPA, % mejoría) por cliente, más el **diagnóstico diferencial de hombro** (`diagnostico_diferencial` jsonb, migración 52): el RCSRP se plantea como diagnóstico por descarte, así que se registra test a test qué se ha descartado. Contenido y algoritmo en `src/utils/diagnosticoDiferencial.js`, sacados de `public/rcsrp-5-valoracion-clinica.pdf`. |
| `sops` | Procedimientos operativos estándar (Operaciones). |
| `contenido_ideas` | Backlog de ideas de contenido: `Idea → Grabado → En edición → Editado → Programado → Publicado`, con `editores text[]`. |
| `mensajes_equipo` | Muro de comunicación interna (con menciones `@persona`). |
| `ingresos_personales` / `gastos_personales` | Finanzas personales de Raúl, 100% manuales, admin-only. |
| `ingresos_empresa` / `gastos_empresa` | Finanzas de empresa. Se alimentan automáticamente desde Clientes (cobro de plazos) y Equipo (pago al equipo). **Ojo:** estas dos tablas se llamaban `ingresos_personales` y `gastos_profesionales` hasta `15_finanzas_empresa_personal.sql`, que las renombró — un `ALTER TABLE ... RENAME` no renombra las políticas RLS asociadas, así que sus políticas todavía llevan el nombre antiguo en el `pg_policies` (cosmético, no rompe nada, pero puede confundir si se inspecciona el esquema directamente). |
| `ads_kpi`, `ads_notas_mensuales`, `anuncios` | KPIs e inversión en Meta/Instagram Ads. |
| `recontactos` | Personas a recontactar (leads en seguimiento + altas manuales). |
| `tareas_personales` | To-do personal de cada persona (admin y técnicos), filtrado por `propietario_email`. El aviso de vencidas en el Dashboard es solo el del admin. |
| `manuales` | Archivo de documentos: título, descripción y enlace externo. Lo consultan los 4 roles; escritura admin-only por RLS de rol. |
| `enlaces_interes` | Accesos directos internos. Escritura admin-only por RLS de rol. |
| `servicios`, `renovaciones` | Catálogos. |
| Storage bucket `informes-leads` | Privado. PDFs de informes de prellamada (ZeroChats, Calendly) adjuntos a un lead concreto de `ventas` (columna `informe_prellamada_path`). Se accede siempre con URL firmada de 1h, nunca enlace público. |

**Trampa importante:** todo el historial clínico de un cliente se enlaza por **nombre** (`cliente_nombre`), no por id, en cinco tablas: `seguimientos`, `contactos_semanales`, `valoraciones_clientes`, `objetivos_cliente_fase` y `revisiones_semanales_cliente`. Renombrar un cliente sin arrastrar el cambio a todas deja su historial huérfano; para eso existe `src/lib/queries/renombrarCliente.js`, que llama `ClientesAdmin`. Ojo además con los `unique (cliente_nombre, semana)` de algunas de ellas.

## 6. Secciones de la app (por componente)

- **Dashboard** (`Dashboard.jsx`): KPIs generales + tres banners de aviso (tareas vencidas, vídeos marcados como "Editado" pendientes de revisar, clientes en pausa a los que ya toca retomar). Único punto de la app que junta datos de varios módulos a la vez.
- **Ventas** (`Ventas.jsx`): pipeline Kanban de leads, con sub-pestañas para Setting de Instagram, KPI de Ads, Recontactar, Calendario y **📈 Resumen semanal** (`ResumenSemanalVentas.jsx`: llamadas agendadas / realizadas / no shows / canceladas, % de asistencia, cierres, dinero vendido, ticket medio y desglose por closer, con navegador de semanas y comparativa contra la semana anterior). Ojo con los dos criterios de fecha del resumen, que son distintos a propósito: las **llamadas** se cuentan por `fechaAgenda` y el **dinero** por `venta.fechaCierre`, porque un lead puede cerrar semanas después de su llamada. Al reagendar se sobrescribe `fechaAgenda` y se limpia `resultadoLlamada`, así que esa llamada pasa a contar en su semana nueva y su no-show/cancelación anterior deja de verse (si algún día hace falta el histórico exacto, habría que guardar los intentos en una columna nueva). El lead nuevo pasa por checklist pre-llamada → resultado de la llamada → venta (crea un cliente nuevo automáticamente) o pérdida. Incluye subida de informes de prellamada en PDF (Storage).
- **Clientes** (`ClientesAdmin.jsx`): parte de gestión/contabilidad — altas y bajas, importes, plazos, cobros pendientes, renovaciones. Admin-only. Renombrar un cliente aquí dispara `renombrarCliente.js` (ver sección 5, el historial se enlaza por nombre). Un cliente puede estar en tres estados: `ACTIVO`, `EN PAUSA` y `NO ACTIVO` (migración 53). **EN PAUSA** es para quien ya ha comprado pero todavía no ha empezado, o para quien para temporalmente: conserva sus profesionales asignados (a diferencia de NO ACTIVO, que los desasigna), se pinta con píldora ámbar parpadeante y guarda `pausa_hasta` (fecha en la que toca retomarlo) y `pausa_motivo`. Esa fecha avisa en el Dashboard y en el Calendario de avisos. El filtro del listado abre por defecto en "ACTIVO + EN PAUSA".
- **Seguimiento y Valoración** (`ClientesEquipo.jsx`): la parte clínica, separada a propósito de la anterior para que el técnico no vea datos económicos. Solo clientes ACTIVOS — los EN PAUSA no entran en la rejilla (vuelven solos al pasar a ACTIVO), pero se listan en un banner arriba con su fecha de retomada, porque el técnico no tiene acceso a Clientes. Tres pestañas (la tercera solo admin):
  - **⚡ Registro de sesiones**: rejilla cliente × día de la semana. Es el **único** punto de escritura del día a día (`seguimientos.dias -> tareas`); tiene navegador de semanas propio para poder volver atrás a cerrar una semana que quedó abierta. El texto de cada sesión se escribe libre (existió un desplegable con `BLOQUES_SESION` y se retiró; la constante sigue exportada en `seguimientoHelpers.js` sin usarse). Desde cada fila se abren las tres herramientas del cliente: `SeguimientoCliente`, `ValoracionCliente` y `FasesObjetivos`.
  - **🤝 Contacto semanal**: los 3 checks por cliente y semana (inicio / mitad / fin), reutilizando `ContactoSemanal.jsx` — el mismo componente que `Equipo.jsx` embebe en el detalle de cada técnico. Como el rol `tecnico` no tiene acceso a `equipo`, esta pestaña es su única vía para marcarlo.
  - **🚨 Pendientes (solo admin)** (`PendientesSeguimiento.jsx`): panel de supervisión con todo lo que le queda al equipo por hacer, cliente a cliente. No escribe nada: es un índice de lo que ya vive en las otras dos pestañas, y cada pendiente es un botón que lleva al sitio donde se arregla (rejilla en esa semana, modal de Seguimiento en esa semana, o pestaña de contacto). El cálculo está en `pendientesDeCliente()` / `resumenPendientes()` (`seguimientoHelpers.js`) y se hace en `ClientesEquipo` para poder pintar también el contador de la pestaña. Dos niveles: **atrasado** (semanas ya terminadas — mira hasta `SEMANAS_PENDIENTES_ATRAS` = 6 semanas atrás, solo las que tuvieron actividad y no están cerradas; es lo único que cuenta el badge rojo) y **semana** (lo de la semana en curso, informativo). La semana en curso no genera aviso de "sin cerrar" a propósito (sería ruido: ya está el ⏳ de la rejilla), y del contacto semanal solo se reclama la semana anterior, no meses atrás. A un cliente no se le reclama nada anterior a su `Fecha inicio`.
  - En el modal `SeguimientoCliente.jsx` los días son **solo lectura** (resumen de lo registrado en la rejilla) más la ficha de consulta del cliente; lo editable ahí son los cambios de la semana, las revisiones y el cierre de semana (`revisiones_semanales_cliente`).
  - **Filtro por trabajador (solo admin)**: fila de chips arriba (`filtroAdmin`) con "👥 Todo el equipo", un chip por trabajador con su número de clientes activos, y "⚠️ Sin asignar" cuando hay activos sin nadie detrás. Sustituye al antiguo par "Todos / Solo los míos" (el propio admin es ahora un chip más, marcado con 🙋). El filtro se aplica a `misClientesTodos`, o sea a **toda** la sección: rejilla, banners de pausa y semana pendiente, contador de cierre de semana y pestaña de contacto semanal. La lista de trabajadores sale de cruzar `team.tecnico` (para que aparezca quien tenga 0 clientes) con los nombres realmente asignados en fichas de clientes. Con un trabajador seleccionado, el badge "🤝 Compartido con…" pasa a calcularse desde su punto de vista, no desde el del admin.
- **Mi Ficha** (`MiFicha.jsx`): datos del propio miembro del equipo y su resumen. La operativa diaria vive en Seguimiento y Valoración, no aquí.
- **Equipo** (`Equipo.jsx`): fichas del equipo, pago automático al marcar cobro, carpeta de Drive por editor de contenido. Admin-only.
- **Finanzas** (`Finanzas.jsx`): admin-only. Empresa (automático) + personal (manual), resumen mensual/anual.
- **Operaciones** (`Operaciones.jsx`): SOPs, calendario de contenido, y la cola "Para editar" (vídeos en edición por editor asignado).
- **Comunicación** (`MuroEquipo.jsx`): muro tipo feed con menciones, autor resuelto automáticamente por email de sesión (no editable a mano, por seguridad — ver incidente en sección 8).
- **Mis tareas** (`MisTareas.jsx`): to-do personal del admin y también de cada técnico. Tabla compartida, pero cada persona solo ve las suyas (se filtra por el email de sesión contra `propietario_email`). El aviso de tareas vencidas del Dashboard sigue siendo solo el del admin.
- **Manuales** (`Manuales.jsx`): archivo de documentos (título + descripción + enlace externo). Lo consultan los 4 roles; solo el admin puede añadir, editar o borrar. El contenido de los manuales en sí **no vive en el repo**: son enlaces a documentos externos, así que actualizar un manual de uso se hace en el documento enlazado, no aquí.
- **Enlaces de interés** (`EnlacesInteres.jsx`): accesos directos internos, admin-only en escritura (RLS por rol).
- **Onboarding** (`Onboarding.jsx`): única vista pública (`/onboarding`, sin login) — checklist interactivo para nuevos clientes, guarda progreso en `localStorage` del navegador del cliente, no en Supabase.

Componentes "huérfanos" que ya no se usan y se podrían borrar: `AdminLogin.jsx` (login viejo, sustituido por `PanelLogin.jsx`), `src/api/index.js` (si existe, residuo del backend propio nunca construido).

## 7. Seguridad — estado actual

- RLS (Row Level Security) activado en todas las tablas.
- Hasta el 11/07/2026, la inmensa mayoría de las políticas eran `using (true)` / `with check (true)`: como la anon key de Supabase viaja en el bundle JS público (no es secreta), esto equivalía a dejar la base de datos abierta a cualquiera en internet, sin necesidad de login. Se cerró en `23_cerrar_acceso_publico.sql`, exigiendo `auth.uid() is not null` en las operaciones de escritura/lectura de las tablas que lo tenían abierto.
- `clientes` y `ventas` tienen además restricción por fila (`22_row_level_rls.sql`): un técnico solo ve los clientes donde aparece en `trabajadores`, un closer solo ve los leads donde `closer` es su nombre. El admin ve todo.
- El bucket de Storage `informes-leads` es privado con las mismas políticas (`25_informes_leads.sql`).
- **Pendiente real, no resuelto:** las tablas hijas de `clientes` siguen sin restricción por fila (solo por login, `auth.uid() is not null`): `seguimientos`, `contactos_semanales`, `valoraciones_clientes`, y también las añadidas después — `revisiones_semanales_cliente`, `objetivos_cliente_fase`, `cierres_seguimiento_semanal`. Habría que decidir cómo relacionar el nombre del cliente con `trabajadores` antes de cerrarlas, igual que se hizo con `clientes`/`ventas`. Nota: todas se enlazan por `cliente_nombre`, no por id, lo que complica el join (ver sección 5).
- Nunca se ha expuesto ni se expone la contraseña de la base de datos ni las claves `service_role`/`secret` en ningún archivo del repo.

## 8. Incidentes recientes y aprendizajes (útil antes de tocar nada)

Todo esto pasó en la sesión del 11/07/2026 y merece la pena conocerlo antes de asumir que el esquema del repo coincide 1:1 con el de producción:

1. **Un lead nuevo desaparecía al refrescar la página.** Causa 1: `fecha_agenda`/`creado_en` son columnas `date`, y un `''` (fecha vacía en el formulario) hace que Postgres rechace el insert — pero el error solo se logueaba en consola (`console.error`), nunca se mostraba al usuario, así que el lead parecía guardado y desaparecía en el siguiente refresco. Se arregló convirtiendo `''` a `null` antes de enviarlo (`src/lib/queries/ventas.js`, `COLUMNAS_FECHA`).
2. **La tabla `ventas` completa apareció vacía tras haber funcionado.** Se investigó como posible borrado externo (por eso se cerró el acceso público en el punto 7). Real causa final, distinta y más simple: la tabla `ventas` en producción llevaba desde su creación **sin la columna `compra_en_llamada`** (entre otras) porque el archivo `05_ventas_pipeline.sql` se editó después de crear la tabla real, y `create table if not exists` no añade columnas nuevas a una tabla que ya existe. Cada insert fallaba con `PGRST204 — Could not find the 'compra_en_llamada' column`, silenciado igual que el punto 1. Arreglado en `24_fix_columnas_ventas.sql` (`alter table ... add column if not exists` de todas las columnas del esquema + `notify pgrst, 'reload schema'`).
3. **Lección de proceso, la importante:** en este proyecto el esquema "real" en Supabase puede haberse desviado silenciosamente del `.sql` que hay en el repo, porque las migraciones se pegan a mano y no hay ningún mecanismo que garantice que el archivo que ves en git es exactamente lo que hay corriendo. Antes de asumir una causa "rara" (ataques externos, RLS mal escrita, etc.) merece la pena verificar primero con el Table Editor de Supabase si la columna/tabla en cuestión existe de verdad.
4. **`git commit` falló una vez con `Unable to create HEAD.lock`**: dos sesiones distintas escribiendo sobre el mismo repo real (esta conversación + una tarea programada) intentaron commitear a la vez. El lock quedó huérfano (ningún proceso lo tenía realmente abierto) y se resolvió borrándolo a mano (`rm .git/HEAD.lock`) antes de reintentar. Si vuelve a pasar, comprobar primero con `ps aux | grep git` que de verdad no hay ningún proceso git activo antes de borrar el lock.
5. **`npm run build` falla en entornos Linux ARM ajenos al Mac de Raúl** con `Cannot find module @rollup/rollup-linux-arm64-gnu` — es un problema conocido de Rollup con binarios nativos específicos de arquitectura/SO en `node_modules`, no un fallo real del código. El build en Vercel (Linux x64) funciona sin problema.

## 9. Pendientes conocidos (a fecha de este documento)

- Cerrar RLS por fila en las tablas hijas de `clientes` — `seguimientos`, `contactos_semanales`, `valoraciones_clientes`, `revisiones_semanales_cliente`, `objetivos_cliente_fase`, `cierres_seguimiento_semanal` (punto 7).
- Crear las cuentas reales de Supabase Auth del resto del equipo y asignarles rol — `17_roles_equipo.sql` sigue con emails de ejemplo.
- No hay flujo de "olvidé mi contraseña" para el equipo — hoy Raúl crea la contraseña inicial a mano.
- Sin diseño responsive/mobile dedicado (el panel está pensado para usarse desde portátil).
- Sin tests automatizados de ningún tipo (ni unitarios ni end-to-end). La validación de sintaxis se hace hoy con `@babel/parser` vía script suelto, no hay CI configurado.
- Limpieza pendiente de archivos huérfanos (`AdminLogin.jsx`, el proxy `/api` de `vite.config.js`).
- Automatización de leads desde Calendly/ZeroChats: evaluado, no implementado. Requiere plan de pago de Calendly (Standard+) para usar su webhook oficial, o una integración más compleja/frágil leyendo Gmail vía API si se quiere evitar el coste — ver conversación para el detalle de ambas opciones. De momento se optó por una versión manual (subida de PDF al lead, punto 5, tabla `ventas` / bucket `informes-leads`).
