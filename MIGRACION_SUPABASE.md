# Migración a Supabase — plan de trabajo

_Preparado en la sesión automática del 9 julio 2026. Actualizado la noche del 9 julio 2026 tras conectar los dos primeros módulos._

## Estado actual (9 julio, noche)

✅ **Hecho y verificado en producción:**
- `sops` — tabla creada, RLS temporal (abierta) activa, 10 SOPs migrados, frontend (`SOPs.jsx` + `App.jsx`) leyendo/escribiendo en Supabase con fallback a `src/data/sops.js` si no hay conexión.
- `mensajes_equipo` (Comunicación) — tabla creada, RLS temporal activa, frontend (`MuroEquipo.jsx` + `App.jsx`) conectado igual que SOPs.
- Variables de entorno `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` ya configuradas en Vercel (Project → Settings → Environment Variables) y funcionando.

📝 **Preparado, pendiente de ejecutar mañana con Raúl presente** (todo en `supabase-sql/`, numerado en el orden recomendado para pegar uno a uno en el SQL Editor, igual que hoy):
- `03_miembros_equipo.sql` — equipo técnico/ventas/contenido. **Ojo**: los datos de `team.js` (Lucía Martínez, Carlos Herrera...) tienen pinta de ser de ejemplo/placeholder, no el equipo real — confirmar con Raúl antes de darle a Run, o sustituir por los nombres reales.
- `04_clientes.sql` (esquema) + `04b_clientes_data.sql` (55 clientes reales, generados desde `src/data/clientes.js` vía `scripts/export-data.mjs` + `scripts/generate-insert-sql.mjs`). Revisar unas filas contra el panel antes de ejecutar el `04b`, por ser datos de facturación reales. Falta el campo `trabajadores` (asignación técnico↔cliente): hoy solo vive en memoria del navegador, no está en el CSV base.
- `05_ventas_pipeline.sql` — vacío, solo esquema.
- `06_seguimiento_y_contacto.sql` — `seguimientos` + `contactos_semanales`, vacíos, solo esquema.
- `07_valoraciones_clientes.sql` — vacío, solo esquema.
- `08_setting_instagram.sql` (esquema + los 6 mensajes de plantilla N1/N2/N3) + `08b_setting_instagram_data.sql` (48 registros reales generados igual que clientes).
- `09_ads.sql` — vacío, solo esquema.
- `10_recontactos.sql` — vacío, solo esquema.
- `11_finanzas.sql` — vacío, solo esquema.
- `12_contenido_ideas.sql` — vacío, solo esquema.
- `13_catalogos.sql` — `servicios` y `renovaciones`, con los datos reales ya incluidos (catálogos estables).

Para regenerar los JSON/SQL de datos si `src/data/*.js` cambia antes de mañana: `node scripts/export-data.mjs` y luego `node scripts/generate-insert-sql.mjs`.

## Siguiente sesión (mañana ~9:00) — orden sugerido

1. Repasar juntos `03_miembros_equipo.sql` (confirmar si los nombres son reales o hay que cambiarlos) → pegar y Run.
2. `04_clientes.sql` → Run. Luego revisar 2-3 filas de `04b_clientes_data.sql` contra el panel → Run.
3. `05_ventas_pipeline.sql`, `06_seguimiento_y_contacto.sql`, `07_valoraciones_clientes.sql` → Run (son solo esquema, sin riesgo).
4. `08_setting_instagram.sql` → Run, luego `08b_setting_instagram_data.sql` → Run.
5. `09_ads.sql`, `10_recontactos.sql`, `11_finanzas.sql`, `12_contenido_ideas.sql`, `13_catalogos.sql` → Run (todas de bajo riesgo).
6. Por cada tabla, conectar el frontend correspondiente (mismo patrón que `src/lib/queries/sops.js`): crear `src/lib/queries/<tabla>.js`, cambiar el `xDataPromise` en `App.jsx`, y añadir las llamadas remotas en el componente que edita esos datos.
7. Cuando todas las tablas estén conectadas: diseñar Auth + RLS por rol (closers/técnicos) para cerrar las políticas temporales "abiertas" — ver sección 3 más abajo.

## 1. Precios actuales de Supabase (revisado hoy, supabase.com/pricing)

| Plan | Precio | Límites clave |
|---|---|---|
| **Free** | 0 €/mes | 500 MB BD, 1 GB storage, 50.000 MAU, 5 GB egress, máx. 2 proyectos activos. **Se pausa tras 7 días de inactividad**. Sin backups, sin SLA. |
| **Pro** | 25 $/mes + uso | 8 GB BD incluidos, 100 GB storage, 100.000 MAU, backups diarios (7 días), nunca se pausa. El compute (Micro, $10/mes) va incluido en los $25 vía crédito. |
| **Team** | 599 $/mes | SOC2/ISO 27001, SSO, backups 14 días — no hace falta para este proyecto por ahora. |

**Recomendación**: empezar en **Free** para diseñar el esquema y migrar los datos sin coste. Pasar a **Pro** (25 $/mes) cuando el equipo empiece a usarlo a diario en producción — sobre todo por dos motivos: que el proyecto no se pause por inactividad, y tener backups diarios (los datos de clientes/ventas no deberían depender de un plan sin backup).

## 2. Esquema de tablas propuesto

Una tabla por cada array de `src/data/*.js`, con relaciones vía claves foráneas:

- `miembros_equipo` (de `team.js`) — closers, técnicos, contenido. Tabla base para relaciones.
- `clientes` (de `clientes.js`)
- `ventas` / `leads` (de `ventas.js`) → `closer_id` referencia a `miembros_equipo`
- `seguimientos` (de `seguimientos.js`) → `cliente_id` referencia a `clientes`, `tecnico_id` referencia a `miembros_equipo`
- `setting_instagram` (de `setting.js`)
- `mensajes_setting` (de `mensajesSetting.js`)
- `ads_kpi` (de `adsKpi.js`)
- `ads_notas_mensuales` (de `adsNotasMensuales.js`)
- `anuncios` (de `anuncios.js`)
- `recontactos` (de `recontactos.js`)
- `ingresos_personales` (de `ingresosPersonales.js`)
- `gastos_personales` (de `gastosPersonales.js`)
- `gastos_profesionales` (de `gastosProfesionales.js`) → puede referenciar `miembros_equipo` (pagos de equipo)
- `contenido_ideas` (de `contenidoIdeas.js`) → `editores` como relación muchos-a-muchos con `miembros_equipo`
- `sops` (de `sops.js`, ya con el campo `enlace` añadido hoy)
- `servicios` y `renovaciones` (catálogos, de `servicios.js` / `renovaciones.js`) — tablas de referencia, cambian poco

Cada tabla lleva `id` (uuid, `gen_random_uuid()`), timestamps `created_at`/`updated_at`, y las columnas equivalentes a los campos actuales del array JS.

## 3. Autenticación y permisos por rol

- **Supabase Auth** con email/password (o magic link) para cada persona del equipo.
- Tabla `miembros_equipo` extendida con `user_id` (referencia a `auth.users`) y `rol` (`closer`, `tecnico`, `contenido`, `admin`).
- **Row Level Security (RLS)** por tabla, ejemplos:
  - `ventas`: closer solo ve/edita filas donde `closer_id = auth.uid()`; admin ve todo.
  - `seguimientos` / `clientes` asignados: técnico solo ve sus clientes asignados; admin ve todo.
  - `contenido_ideas`: rol contenido ve todo (uso compartido de equipo).
  - Tablas financieras personales (`ingresos_personales`, `gastos_personales`): solo admin (Raúl).
- Raúl (`admin`) tiene acceso total vía política `rol = 'admin'` en todas las tablas.

## 4. Migración de datos existentes

1. Exportar cada array de `src/data/*.js` a JSON.
2. Insertar vía script (`supabase-js` con service_role key, solo en local/CLI, nunca en el frontend) o vía SQL `INSERT` generado desde el JSON.
3. Verificar conteos y relaciones (ids de closers/técnicos coinciden) tras la carga.
4. Mantener los `src/data/*.js` como backup/fallback hasta confirmar que todo funciona en Supabase.

## 5. Conexión del frontend

1. Instalar `@supabase/supabase-js`.
2. Variables de entorno: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (nunca la `service_role`) en `.env.local` (no commitear).
3. Cliente único en `src/lib/supabaseClient.js`.
4. Sustituir progresivamente los `import X from '../data/X.js'` por queries (`supabase.from('tabla').select()`), módulo a módulo, empezando por el más sencillo (p. ej. SOPs) para validar el patrón antes de tocar Ventas/Clientes.

## 6. Próximos pasos — pendiente de Raúl

1. **Crear la cuenta y el proyecto en supabase.com** (gratis). No puedo crearla yo por norma de seguridad.
2. Confirmar plan de arranque: Free (recomendado para empezar) o ir directo a Pro.
3. Pasarme la **URL del proyecto** y la **clave `anon`/`public`** (nunca `service_role` ni contraseñas) para continuar.
4. A partir de ahí, seguimos por partes: esquema SQL → migración de datos → conexión frontend → RLS por rol, confirmando contigo en cada paso.
