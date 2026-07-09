# Migración a Supabase — plan de trabajo

_Preparado en la sesión automática del 9 julio 2026. Pendiente de revisar juntos y empezar a ejecutar._

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
