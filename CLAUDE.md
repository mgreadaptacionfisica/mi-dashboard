# CLAUDE.md — Panel interno MG Group (mi-dashboard)

Este archivo es el "prompt madre" del proyecto: lo lee Claude automáticamente al
empezar. Resume qué es, cómo está montado y qué NO hay que romper. Está escrito
para que cualquier Claude (extensión de VS Code o sesión nueva) pueda continuar
sin contexto previo.

## Qué es
Panel de gestión interno de MG Group (negocio de readaptación física /
entrenamiento / salud). Lo usa el equipo por roles: **admin** (Raúl), **closer**
(ventas), **tecnico** (entrenadores/fisios) y **contenido** (editores).
Secciones: Dashboard, Ventas (pipeline + recontactar + calendario +
resumen semanal), Clientes (contabilidad/cobros), Seguimiento y Valoración, Equipo,
Mi Ficha, Comunicación (muro), Finanzas, Onboarding (público), Operaciones
(SOPs + contenido), Mis tareas, Manuales y Enlaces de interés (solo admin).

## Stack y despliegue
- **React + Vite** (frontend). Sin backend propio: el navegador habla directo
  con Supabase.
- **Supabase** (Postgres + Auth + Storage + RLS) = base de datos.
  Credenciales en `.env.local` (no se commitea): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`. También en Vercel → Environment Variables.
- **Vercel** = hosting. Cada push a `main` en GitHub redespliega solo (1–2 min).
  Repo: github.com/mgreadaptacionfisica/mi-dashboard.
- **Login obligatorio**; el rol vive en `auth.users.raw_app_meta_data.rol`
  (se asigna por SQL, no desde el navegador). Ver `src/lib/auth.js`.

## Arquitectura (cómo fluye)
- `src/App.jsx` (InternalApp): tiene TODO el estado en `useState` y lo carga en
  un único `useEffect` con `Promise.all([...])`. Patrón "remoto con fallback
  estático": cada `xDataPromise()` intenta `fetchX()` y si falla usa
  `import('./data/x')`. `renderView()` es un `switch (vista)` que pinta cada
  sección y le pasa datos + setters.
- **Queries** en `src/lib/queries/*.js`: cada tabla tiene `fromRow`/`toRow`
  (snake_case DB ↔ camelCase JS) y `fetch/insert/update/delete` (o `upsert`),
  todos protegidos con `if (!supabase) return`.
- **Fallbacks** en `src/data/*.js` (normalmente `[]`).
- **Helpers** en `src/utils/*.js` (seguimiento, valoración, comisiones,
  recurrencia, fechas, equipo, modoDemo).
- **Estilos**: un único `src/styles/index.css` con variables CSS. Acento de
  marca verde `#008A41`.

## Convenciones (respétalas)
- **Comentarios en español**, explicando el "por qué" (hay muchos y son útiles).
- **Migraciones SQL** en `supabase-sql/NN_nombre.sql`, numeradas en orden
  (la última es la 59; la siguiente sería la 60). Deben ser **idempotentes**
  (`add column if not exists`, `create table if not exists`,
  `drop policy if exists` + `create policy`) y terminar con
  `notify pgrst, 'reload schema';`. **Nunca se ejecutan solas**: se escriben
  como archivo y Raúl las corre a mano en Supabase → SQL Editor.
- **RLS**: hay dos patrones. La mayoría de tablas son permisivas
  (`using (auth.uid() is not null)`) y el control real es la UI/rol. Las tablas
  sensibles usan rol: `(auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin'`
  (ej. `enlaces_interes`, `manuales` para escritura).
- Antes de commitear, **validar sintaxis** de cada `.jsx/.js` tocado con
  `@babel/parser` (sourceType module, plugin jsx) y el **balance de llaves** del
  CSS. No hay tests.

## Trampas conocidas (IMPORTANTE)
- **El historial de cada cliente se enlaza por NOMBRE** (`cliente_nombre`), no
  por id, en 5 tablas: `seguimientos`, `contactos_semanales`,
  `valoraciones_clientes`, `objetivos_cliente_fase`,
  `revisiones_semanales_cliente`. Al renombrar un cliente hay que arrastrar el
  cambio a todas (ya existe `src/lib/queries/renombrarCliente.js`, llamado desde
  ClientesAdmin). Ojo con `unique (cliente_nombre, semana)` en algunas.
- **Estados de cliente**: `ACTIVO`, `EN PAUSA` y `NO ACTIVO` (migración 53).
  `EN PAUSA` = ya ha comprado pero aún no empieza (o para temporalmente):
  mantiene los profesionales asignados (NO ACTIVO sí los desasigna), guarda
  `pausa_hasta` + `pausa_motivo` (claves JS `'Fecha fin de pausa'` /
  `'Motivo de la pausa'`) y **no aparece en Seguimiento y Valoración** hasta
  que vuelve a ACTIVO. Todo el código que filtra `=== 'ACTIVO'` ya lo excluye
  solo; ojo al añadir filtros nuevos de estado.
- **Modo demo** (`src/lib/demoGuard.js` + `src/utils/modoDemo.js`): interruptor
  admin que enmascara datos personales y **bloquea TODA escritura a Supabase**
  (interceptado en `src/lib/supabaseClient.js`). Útil para grabar/enseñar.
- **Cobros → Finanzas**: al marcar un plazo cobrado (CobrosPendientes) se crea un
  ingreso en `ingresos_empresa` con id determinista `fin-plazo-{clienteId}-{n}` +
  la comisión de pasarela como gasto (ver `utils/comisionesHelpers.js`). El mismo
  esquema lo usa la venta con reserva y hay que mantenerlo para poder "deshacer".
- **La venta tiene DOS fechas** y se confunden fácil: `Fecha inicio` (cuándo
  empieza el cliente el programa) y `venta.fechaCierre` (cuándo se cierra la
  venta). La que manda para el **mes de la comisión del closer** (los tramos se
  cuentan por mes natural) y para el mes del ingreso de la reserva en Finanzas
  es `fechaCierre`. Es editable en el formulario de venta (por defecto hoy) para
  poder registrar ventas con retraso sin que caigan en el mes equivocado.
- **Tasa de cierre = compraron ÷ tuvieron la llamada**, nunca ganadas ÷
  (ganadas + perdidas): un no show o una cancelación que acaba en "Perdida"
  no ha tenido llamada y solo cuenta en la **asistencia**. La lógica está en
  `utils/embudoVentas.js` (`tuvoLlamada()`), que usan el Pipeline y la
  pestaña 🩺 Embudo; no recalcular el % a mano en otro sitio.
- **Pagos al equipo a MES VENCIDO**: lo trabajado en agosto se abona a
  principios de septiembre. El botón "Marcar como pagado" (Equipo → ficha de
  closer/técnico) liquida siempre el **mes anterior** (`mesAPagarISO()` en
  `utils/equipoHelpers.js`) y coge el importe del **historial de ese mes**, no
  del acumulado del mes en curso (son dos cifras distintas y se enseñan las
  dos). En el gasto de `gastos_empresa`, `mes` = mes trabajado y `fecha` = día
  real del pago; no coinciden a propósito, para que Finanzas impute el gasto al
  mes en que sale el dinero. Mi Ficha enseña lo mismo en solo lectura.
- **Hotmart/seQura**: una venta financiada se registra como UN cobro (Hotmart
  adelanta el grueso y libera el resto), no como plazos mensuales.
- **Seguimiento y Valoración** (`ClientesEquipo.jsx`, sección `clientes-equipo`)
  tiene DOS pestañas de trabajo (más una tercera de solo lectura para admin) y
  cada una es la dueña de su dato — no duplicar la edición en otro sitio, que
  ya pasó y hubo que deshacerlo:
  - **⚡ Registro de sesiones** (por defecto): rejilla cliente × día. Es el
    **único** sitio donde se añaden, marcan y quitan sesiones (`dias -> tareas`).
    Tiene su propio navegador de semanas (`registroOffset`) porque hay que poder
    volver atrás a terminar una semana. La sesión se escribe **a mano**, texto
    libre: hubo un desplegable con `BLOQUES_SESION` y se quitó porque se quedaba
    corto (la constante sigue exportada en `seguimientoHelpers`, sin usar).
  - **🤝 Contacto semanal**: reutiliza `ContactoSemanal.jsx`, el mismo componente
    que Equipo embebe en el detalle de cada técnico. **Ojo**: el rol `tecnico`
    NO tiene acceso a la sección Equipo, así que esta pestaña es su única forma
    de marcar el contacto — no se puede quitar sin dejarlo sin ella.
  - **🚨 Pendientes** (`PendientesSeguimiento.jsx`, solo admin): repaso de todo
    lo que falta por hacer (sesiones sin marcar, cambios sin hacer, semanas sin
    cerrar, contacto incompleto). **No escribe nada**: es un índice: cada
    pendiente es un botón que lleva a la pestaña/semana donde se arregla. La
    lógica está en `pendientesDeCliente()` (`seguimientoHelpers.js`) y se
    calcula en `ClientesEquipo` para reaprovecharla en el badge de la pestaña.
    Nivel `atrasado` (semanas ya terminadas, hasta 6 atrás) vs `semana` (la
    actual, informativo); solo lo atrasado cuenta para el badge rojo.
  - En el modal `SeguimientoCliente.jsx` la rejilla de días es **solo lectura**
    (un resumen). Lo editable ahí es otra cosa: cambios de la semana, revisiones
    y el cierre de semana.
  - **Filtro por trabajador** (`filtroAdmin`, solo admin): chips arriba con
    "Todo el equipo" + uno por trabajador (con su nº de activos) + "Sin asignar".
    Filtra en `misClientesTodos`, así que afecta a TODA la sección (las dos
    pestañas, banners y contadores). Al añadir algo nuevo aquí, derívalo de
    `misClientes`/`misClientesTodos` y respetará el filtro solo.
- **Cuestionario previo** (`utils/cuestionarioPrevio.js` +
  `components/CuestionarioPrevio.jsx`, tabla `cuestionarios_previos`): 30
  preguntas que el cliente contesta ANTES de la valoración y que alimentan la
  red de determinantes. Cada pregunta lleva el id del factor al que alimenta
  (`factor`), y el panel enseña las respuestas agrupadas por factor junto al
  editor de la red, no en el orden en que se contestaron. Dos cosas a tener
  en cuenta:
  - Se rellena desde **`/cuestionario`, ruta PÚBLICA sin login** (segunda del
    panel, junto a `/onboarding` — ver `PUBLIC_PATHS` en App.jsx). Es la única
    tabla que acepta escritura anónima: `anon` puede insertar y nada más (no
    lee, no modifica). Por eso el envío NO puede encadenar `.select()`.
  - El enlace con el cliente es por **nombre**, y viaja en el enlace
    (`/cuestionario?c=Nombre`) para que coincida exacto. La búsqueda es
    tolerante (sin tildes ni mayúsculas) y los que no casan salen en un aviso
    arriba de Clientes para asignarlos a mano.
- **Red de determinantes** (`utils/redDeterminantes.js` +
  `components/RedDeterminantes.jsx`, columna `red_determinantes` de
  `valoraciones_clientes`): mapa bio-psico-social del cliente como grafo
  dirigido — cada factor es un nodo y cada flecha un "esto causa esto otro, en
  esta proporción". Lo rellena el fisio dentro de la valoración. Tres cosas
  que confunden al leer el JSON:
  - `causas` va indexado por el nodo **EFECTO**, no por la causa, porque es
    como se pregunta al rellenar ("¿qué está causando esto?"). Para recorrer
    el grafo hacia delante hay que darle la vuelta con `mapaEfectos()`.
  - `_desconocido` ("otras causas / no lo sé") **no es un nodo**: existe para
    cuadrar el reparto a 100 sin inventarse una causa, y no forma aristas. Se
    calcula solo como el resto; nunca se pide a mano.
  - El **problema diana** es una marca del nodo (`diana: true`), no un eje. Un
    nodo diana conserva su eje bio/psico/social, que es lo que le da columna
    en el grafo.
  Los factores del catálogo llevan id plano y los de texto libre el prefijo
  `otro:`. Añadir factores nuevos a `FACTORES` es seguro y no necesita
  migración; renombrar o quitar ids ya guardados no lo es (hay fallback en
  `etiquetaNodo()`, pero se degrada).
- **Supabase (plan free) se pausa** tras días sin uso: si todo aparece a 0, hay
  que reactivar el proyecto en supabase.com. No es un bug del código.

## Flujo de trabajo con git
Cambios → commit → `git push origin main` → Vercel despliega. **Nota**: cuando
Claude corre en el entorno sandbox de Cowork, el push falla con 403 de proxy y
Raúl lo sube a mano (git pull + push, o desde VS Code). La extensión Claude Code
corriendo en local sí puede pushear directamente.

## Dónde mirar para más detalle
- `DOCUMENTACION_TECNICA.md` — documentación técnica completa.
- `MIGRACION_SUPABASE.md` — estado de la migración a Supabase.
- `src/lib/auth.js` — `SECCIONES_POR_ROL` (qué ve cada rol).
