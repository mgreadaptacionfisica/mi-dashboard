-- Añade al SOP "3. Establecer fase y objetivos" la regla explícita de
-- cuándo se sube de fase (no basta con que mejore el SPADI, hay que haber
-- cumplido también los objetivos concretos marcados) y una cadencia de
-- reevaluación. Antes el SOP describía qué caracteriza a cada fase pero
-- nunca decía explícitamente la regla para pasar de una a otra — ese hueco
-- es justo lo que falló con el cliente que se perdió.
update public.sops set
  contenido = 'REGLA DE TRANSICIÓN (leer antes de subir a alguien de fase):
No se sube de fase solo porque mejore el SPADI o el dolor. Se sube de fase cuando se cumplen las DOS cosas:
1) El criterio de dolor/SPADI de la fase siguiente (ver más abajo).
2) Los objetivos concretos marcados para la fase actual (ver "Objetivos por fase" más abajo) — no solo "ha mejorado", sino que el objetivo que se marcó se ha cumplido de verdad.
En el panel, al crear una nueva valoración se marcan como cumplidos los objetivos de la valoración anterior. Si subes de fase sin haberlos marcado todos, el panel avisa (no bloquea — la decisión sigue siendo tuya, pero revisa que sea correcto antes de continuar).

Cadencia de reevaluación: reevaluar cada 2-3 semanas, o antes si sospechas que ya se han cumplido los objetivos de la fase actual. No dejar pasar más de un mes sin repetir la valoración — cuanto más se tarde en detectar que toca cambiar de fase (para bien o para mal), más margen de error hay.

Fases (según irritabilidad y movilidad, medido con SPADI):
- FASE 1: irritabilidad alta-moderada, baja movilidad (SPADI <50), dolor entre sesiones. Objetivo: ejercicios para reducir dolor y ganar movilidad.
- FASE 2: irritabilidad baja (SPADI <10), solo molestia en sesiones, sin dolor entre sesiones. Objetivo: ejercicios de fuerza.
- FASE 3: dolor solo ante picos de carga (SPADI 0), dolor solo en gestos del deporte. Objetivo: introducir movimientos específicos del deporte.
- FASE 4: dolor solo ante picos de carga (SPADI 0), sin dolor en su deporte. Objetivo: mejora de rendimiento.

Objetivos por fase:
- FASE 1: reducir irritabilidad y ganar movilidad. Ser concreto en qué movilidad debe ganar — solo los ejercicios que realmente hagan falta, sin saturar.
- FASE 2: reducir irritabilidad y ganar fuerza. Marcar objetivos de carga para pasar a la siguiente fase: https://docs.google.com/spreadsheets/d/1fPqA--StIixU1wVfkeD0u8J1s3YSwUxv/edit?usp=sharing&ouid=116406665588224230463&rtpof=true&sd=true
- FASE 3: objetivos según el deporte — hablar con la persona y ser muy concreto (ej: conseguir hacer snatch sin dolor).
- FASE 4: objetivos de rendimiento — hablar con la persona y ser muy concreto (ej: conseguir un snatch con 100kg).',
  actualizado_en = '2026-07-16'
where id = 'sop-sistema-3-fases';

notify pgrst, 'reload schema';
