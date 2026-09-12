-- Red de determinantes bio-psico-social de la valoración.
--
-- Qué es: un mapa por cliente donde cada factor que le afecta es un nodo
-- (biológico, psicológico o social) y cada flecha es "esto causa esto otro, y
-- en esta proporción". Sirve para ver no solo QUÉ le afecta sino CUÁNTO y por
-- qué camino — un factor puede no tocar el dolor directamente y ser de lo más
-- importante porque llega por detrás (turnos de noche → duerme mal → más
-- irritabilidad → más dolor).
--
-- El método está sacado de tres sitios, documentados en
-- src/utils/redDeterminantes.js: el RPS-Form del modelo ICF (los ejes y el
-- "problema diana"), el Clinical Compass de la fisioterapia basada en
-- procesos (los bucles y la marca de "modificable") y PECAN — Perceived
-- Causal Networks (la parte numérica: gravedad 0-100 y reparto de causas).
--
-- Por qué una columna jsonb en valoraciones_clientes y no una tabla aparte:
--
--   1. La red es una FOTO con fecha, igual que el resto de la valoración. Al
--      vivir dentro, se obtiene gratis la evolución en el tiempo (¿el factor
--      central sigue siendo el mismo tres meses después?), que es justo el
--      paso 5 del Clinical Compass: monitorizar y reajustar.
--   2. Es exactamente el mismo patrón que ya usan `spadi`, `tampa` y
--      `diagnostico_diferencial`: cada bloque de la valoración es un jsonb
--      suelto.
--   3. El enlace por `cliente_nombre` ya lo arrastra renombrarCliente.js, que
--      cubre valoraciones_clientes. No se crea trampa nueva.
--
-- Forma del JSON:
--
--   {
--     "nodos": [
--       { "id": "dolor",        "eje": "bio",   "gravedad": 70, "diana": true },
--       { "id": "kinesiofobia", "eje": "psico", "gravedad": 55 },
--       { "id": "otro:turnos-de-noche", "eje": "social",
--         "etiqueta": "Turnos de noche", "gravedad": 40, "modificable": false }
--     ],
--     "causas": {
--       "dolor": { "kinesiofobia": 30, "deficitFuerza": 50, "_desconocido": 20 }
--     },
--     "notas": ""
--   }
--
-- Detalles que importan para leer el dato desde fuera del panel:
--
--   - `causas` va indexado por el nodo EFECTO, no por la causa. Es así porque
--     es como se pregunta al rellenar ("¿qué está causando esto?"), que es lo
--     que hace el método manejable. Para recorrer el grafo hacia delante hay
--     que darle la vuelta (mapaEfectos() en el helper).
--   - Los porcentajes de cada efecto suman 100 incluyendo `_desconocido`
--     ("otras causas / no lo sé"). Esa clave NO es un nodo: existe para poder
--     decir "el 20% de esto no sé de dónde viene" sin tener que inventarse
--     una causa, y no forma aristas del grafo.
--   - Los factores del catálogo llevan id plano ('dolor', 'kinesiofobia'); los
--     de texto libre van con prefijo 'otro:' y su etiqueta dentro del nodo.
--     El prefijo permite agregar datos entre clientes sin mezclar: los del
--     catálogo son comparables, los 'otro:' no.
--   - El "problema diana" (la queja u objetivo que se está explicando) es la
--     marca `diana: true` de un nodo, NO un eje. Un nodo diana conserva su eje
--     bio/psico/social, que es lo que le da columna en el grafo; ponerlo como
--     eje haría perder ese dato.
--   - `modificable` solo aparece en los nodos 'otro:'. Para los del catálogo
--     el valor vive en el código (FACTORES), que es donde se puede corregir
--     sin migrar datos ya guardados.
--
-- No se toca la RLS: `valoraciones_clientes` ya tiene la suya y esto es una
-- columna más de la misma fila.

alter table public.valoraciones_clientes
  add column if not exists red_determinantes jsonb not null default '{}'::jsonb;

comment on column public.valoraciones_clientes.red_determinantes is
  'Red de determinantes bio-psico-social {nodos:[{id,eje,gravedad,diana?,etiqueta?,modificable?}], causas:{efectoId:{causaId:pct,...,_desconocido:pct}}, notas} — ver src/utils/redDeterminantes.js';

notify pgrst, 'reload schema';
