// Diagnóstico diferencial de hombro — RCSRP como diagnóstico POR DESCARTE.
//
// Contenido sacado del protocolo interno "VALORACIÓN CLÍNICA DEL HOMBRO —
// RCSRP como diagnóstico por descarte" (Vicente Giles), que está en
// public/rcsrp-5-valoracion-clinica.pdf. La idea de fondo del documento es
// que los test ortopédicos NO identifican estructuras concretas, así que el
// dolor relacionado con el manguito rotador (RCSRP) no se "confirma" con un
// test: se llega a él descartando las otras fuentes posibles, en este orden
// (algoritmo de la última página del PDF):
//
//   cervical → hombro rígido → inestabilidad → AC → bíceps (TPLB) → RCSRP
//
// Por eso cada paso se responde en negativo: lo NORMAL es que todo salga
// negativo (nada que descartar) y el cuadro acabe encajando con RCSRP. De
// ahí el botón de "marcar todo como negativo" del formulario: se parte de
// todo descartado y solo se marcan a mano los pocos que salgan positivos.

// Valores posibles de cada test. "Sin evaluar" no es un valor: es la
// ausencia de valor (undefined), para poder distinguir "lo hice y salió
// negativo" de "no lo he hecho todavía" — que clínicamente no es lo mismo.
export const DD_VALORES = [
  { valor: 'negativo', emoji: '✅', label: 'Negativo', descripcion: 'Lo has hecho y no apunta a esa fuente: queda descartada.' },
  { valor: 'positivo', emoji: '🔴', label: 'Positivo', descripcion: 'Apunta a esa fuente: NO se puede descartar, hay que valorarla.' },
]

// Tipos de paso:
// - 'redflag': cribado previo. Un positivo aquí para el proceso y se deriva.
// - 'descarte': los 5 pasos del algoritmo. Positivo = esa fuente sigue en juego.
// - 'apoyo': test que, en positivo, ACERCAN el diagnóstico a RCSRP/manguito
//   (al revés que los de descarte).
// - 'alerta': sospecha de rotura de espesor completo o masiva → derivar.
export const DD_PASOS = [
  {
    id: 'redFlags',
    tipo: 'redflag',
    label: 'Banderas rojas',
    pregunta: '¿Hay algún signo de alarma que obligue a derivar?',
    siPositivo: 'Parar y derivar a médico antes de seguir con nada más.',
    nota: 'Cribado previo (STAR-Shoulder, McClure & Michener 2015). Si sale algo positivo aquí, el resto del diagnóstico diferencial es secundario.',
    tests: [
      { id: 'tumor', label: 'Sospecha de tumor', ayuda: 'Antecedente de cáncer, pérdida de peso inexplicada, dolor no relacionado con el estrés mecánico, fatiga inexplicada, masa o deformidad.' },
      { id: 'infeccion', label: 'Sospecha de infección', ayuda: 'Piel enrojecida, fiebre, malestar general.' },
      { id: 'fracturaLuxacion', label: 'Fractura o luxación no reducida', ayuda: 'Traumatismo importante, dolor agudo incapacitante, pérdida aguda de movimiento, deformidad o pérdida del contorno normal.' },
      { id: 'neurologica', label: 'Lesión neurológica', ayuda: 'Déficit sensitivo o motor inexplicado.' },
      { id: 'visceral', label: 'Patología visceral', ayuda: 'Dolor que no se reproduce con el estrés mecánico del hombro, síntomas con el esfuerzo físico o respiratorio, síntomas digestivos, dolor escapular tras comidas grasas.' },
    ],
  },
  {
    id: 'cervical',
    tipo: 'descarte',
    orden: 1,
    label: 'Descartar columna cervical',
    pregunta: '¿Hay concomitancia de dolor cervical?',
    siPositivo: 'Descartar la columna cervical como fuente de síntomas antes de seguir.',
    nota: '1 de cada 2 pacientes con dolor de hombro tiene también dolor cervical (Katsuura et al. 2020), así que este es el primer paso del algoritmo.',
    tests: [
      { id: 'facetarioExtRot', label: 'Test de extensión-rotación', ayuda: 'Extensión cervical + rotación hacia el lado sintomático.', positivoSi: 'Reproduce el dolor cervical local (sugiere síndrome facetario).' },
      { id: 'facetarioRom', label: 'ROM cervical limitado', positivoSi: 'Hay limitación clara del recorrido cervical.' },
      { id: 'facetarioPalpacion', label: 'Palpación facetaria dolorosa', positivoSi: 'La palpación de la columna cervical reproduce el dolor.' },
      { id: 'rotacionMenor60', label: 'Rotación cervical < 60º', ayuda: 'Uno de los 4 ítems del cluster de Wainner para dolor radicular cervical.', positivoSi: 'La rotación hacia el lado sintomático no llega a 60º.' },
      { id: 'spurling', label: 'Test de Spurling A (añadiendo rotación)', positivoSi: 'Reproduce los síntomas del brazo.' },
      { id: 'distraccionCervical', label: 'Test de distracción cervical', positivoSi: 'La tracción ALIVIA los síntomas (ojo: aquí el positivo es que mejore, no que duela).' },
      { id: 'neurodinamia', label: 'Neurodinamia — ULTT A', positivoSi: 'Reproduce los síntomas y cambian al mover el cuello (side-bending ipsi/contralateral).' },
      { id: 'painDetect', label: 'PainDETECT sugestivo de dolor neuropático', positivoSi: 'La puntuación apunta a componente neuropático.' },
    ],
  },
  {
    id: 'hombroRigido',
    tipo: 'descarte',
    orden: 2,
    label: 'Descartar hombro rígido',
    pregunta: '¿Hay pérdida de ROM pasivo y activo exagerada?',
    siPositivo: 'Descartar hombro rígido/congelado, fractura, luxación u otra lesión estructural.',
    nota: 'La clave es el ROM PASIVO: en el RCSRP el recorrido está más o menos conservado. Si el pasivo también está muy limitado, no es el cuadro que buscamos.',
    tests: [
      { id: 'romPasivoLimitado', label: 'ROM pasivo limitado', positivoSi: 'El recorrido pasivo está claramente restringido, no solo el activo.' },
      { id: 'reMenor50', label: 'Rotación externa < 50% del contralateral', ayuda: 'Patrón típico del hombro congelado.', positivoSi: 'La RE del lado afecto no llega a la mitad de la del otro lado.' },
      { id: 'isometricoNoDoloroso', label: 'Contracción isométrica no dolorosa en rango libre', positivoSi: 'La isométrica dentro del rango disponible NO duele (apoya rigidez y no tendinopatía).' },
      { id: 'imagenNormal', label: 'Prueba de imagen normal', ayuda: 'Solo si el cliente ya la trae; la imagen no está indicada de rutina salvo sospecha de bandera roja.', positivoSi: 'Hay imagen y sale normal.' },
    ],
  },
  {
    id: 'inestabilidad',
    tipo: 'descarte',
    orden: 3,
    label: 'Descartar inestabilidad de hombro',
    pregunta: '¿El cliente reporta síntomas de inestabilidad?',
    siPositivo: 'Evaluar daño estructural y antecedentes — posible derivación a traumatología.',
    nota: 'La anamnesis manda: "escucha a tu paciente, te está diciendo el diagnóstico". Conviene clasificar traumática/atraumática, dirección (anterior/posterior) y frecuencia, que es lo que marca el pronóstico (Jaggi & Lambert 2010).',
    tests: [
      { id: 'sensacionInestabilidad', label: 'Sensación de inestabilidad (anamnesis)', positivoSi: 'Refiere que el hombro "se le va" o se siente inseguro.' },
      { id: 'episodioDesencadenante', label: 'Episodio desencadenante / antecedente traumático', positivoSi: 'Hubo luxación, subluxación o traumatismo claro.' },
      { id: 'movimientoAnomalo', label: 'Dolor y sensación de movimiento anómalo', positivoSi: 'Nota que la articulación se mueve de forma rara al hacer ciertos gestos.' },
      { id: 'cajonAnterior', label: 'Test de cajón anterior', positivoSi: 'Traslación anterior aumentada respecto al lado sano o aprensión.' },
      { id: 'testSurco', label: 'Test del surco', positivoSi: 'Aparece surco subacromial al traccionar hacia abajo (inestabilidad inferior/multidireccional).' },
      { id: 'aprensionRecolocacion', label: 'Test de aprensión-recolocación', positivoSi: 'Aprensión en ABD+RE que cede al recolocar la cabeza humeral.' },
    ],
  },
  {
    id: 'acromioclavicular',
    tipo: 'descarte',
    orden: 4,
    label: 'Descartar articulación acromioclavicular',
    pregunta: '¿Duele al cruzar el brazo, localizado en la AC?',
    siPositivo: 'Descartar la articulación AC como fuente de síntomas.',
    nota: 'La localización del dolor es muy orientativa: el paciente señala la propia AC con un dedo.',
    tests: [
      { id: 'crossBody', label: 'Cross-body adduction test', ayuda: 'Sensibilidad >67% · Especificidad 79% · LR+ 3.67 · LR− 0.29 (Cadogan et al. 2013).', positivoSi: 'Dolor localizado en la AC al llevar el brazo en aducción horizontal.' },
      { id: 'acExtension', label: 'AC extension test', ayuda: 'Sensibilidad 72% · Especificidad 85% · LR+ 4.8 · LR− 0.33 (Cadogan et al. 2013).', positivoSi: 'Dolor en la AC al llevar el brazo a extensión.' },
      { id: 'antecedenteTraumaticoAc', label: 'Antecedente traumático de AC', ayuda: 'Caída con el brazo en aducción (mecanismo indirecto), deportes de contacto (rugby, judo).', positivoSi: 'Existe ese antecedente.' },
      { id: 'deformidadAc', label: 'Deformidad o inflamación local', positivoSi: 'Se ve o se palpa deformidad/inflamación en la AC (traumática o degenerativa: osteoartritis/osteolisis).' },
    ],
  },
  {
    id: 'bicepsTplb',
    tipo: 'descarte',
    orden: 5,
    label: 'Descartar tendinopatía proximal del bíceps (TPLB)',
    pregunta: '¿Duele al testar la flexión de codo?',
    siPositivo: 'Valorar la TPLB como contribuyente (rara vez es el problema único).',
    nota: 'Generalmente es SECUNDARIA: gran correlación con patología del manguito. Aporta ~10% de la fuerza total de abducción con el hombro en rotación externa.',
    tests: [
      { id: 'cargaFlexionCodo', label: 'Test de carga en flexión de codo', positivoSi: 'Reproduce el dolor en la cara anterior del hombro.' },
      { id: 'dolorAnteriorIrradiado', label: 'Dolor insidioso en cara anterior que irradia por el brazo', positivoSi: 'Ese es el patrón que describe.' },
      { id: 'empeoraOverhead', label: 'Empeora con actividades overhead', positivoSi: 'Los gestos por encima de la cabeza lo agravan.' },
      { id: 'clicks', label: 'Clicks o crujidos', positivoSi: 'Refiere chasquidos (posible inestabilidad del tendón).' },
    ],
  },
  {
    id: 'apoyoRcsrp',
    tipo: 'apoyo',
    label: 'Aproximación diagnóstica a RCSRP',
    pregunta: 'Descartado lo anterior, ¿qué apoya el diagnóstico?',
    siPositivo: 'Un positivo aquí ACERCA el diagnóstico a RCSRP / patología del manguito (al revés que los pasos de descarte).',
    nota: 'Último paso del algoritmo. Ojo: estos test tampoco identifican estructuras concretas — se usan de forma lógica, sumando probabilidad, no como prueba definitiva.',
    tests: [
      { id: 'irrt', label: 'Test de resistencia a la rotación interna (IRRT)', ayuda: 'Sensibilidad 88% · Especificidad 96% (Zaslav 2001).', positivoSi: 'Mayor dolor y debilidad a la rotación INTERNA → acerca a patología estructural.' },
      { id: 'resistenciaRe', label: 'Test de resistencia a la rotación externa', ayuda: 'Sensibilidad 63% · Especificidad 75% · LR+ 2.6 · LR− 0.49 (Hermans et al. 2013).', positivoSi: 'Dolor y debilidad a la rotación externa → acerca a patología del manguito.' },
      { id: 'arcoDoloroso', label: 'Arco doloroso (60-120º)', ayuda: 'Sensibilidad 71% · Especificidad 81% · LR+ 3.7 · LR− 0.36 (Hermans et al. 2013).', positivoSi: 'Dolor al elevar el brazo entre 60 y 120º.' },
    ],
  },
  {
    id: 'sospechaRotura',
    tipo: 'alerta',
    label: 'Sospecha de rotura de espesor completo o masiva',
    pregunta: '¿Hay signos de rotura que obliguen a derivar?',
    siPositivo: 'Valorar derivación: el cluster completo da un 91% de probabilidad de rotura de espesor completo.',
    nota: 'Cluster de Park et al. (2005): arco doloroso + signo del brazo caído + RE dolorosa con impotencia funcional. Distinguir además traumática vs atraumática.',
    tests: [
      { id: 'parkArcoDoloroso', label: 'Arco doloroso (cluster de Park)', positivoSi: 'Dolor en el arco medio de elevación.' },
      { id: 'parkBrazoCaido', label: 'Signo del brazo caído', positivoSi: 'No puede sostener el descenso controlado del brazo.' },
      { id: 'parkReImpotencia', label: 'RE dolorosa con impotencia funcional', positivoSi: 'La rotación externa duele y además hay pérdida real de fuerza.' },
      { id: 'pseudoFlexion45', label: 'Pseudoparálisis — flexión activa < 45º', ayuda: 'Pseudoparálisis: <45º de flexión activa, 0º de RE activa y sin mejora del ROM tras aliviar el dolor. Sugiere rotura masiva (subescapular).', positivoSi: 'No llega a 45º de flexión activa.' },
      { id: 'pseudoRe0', label: 'Pseudoparálisis — 0º de rotación externa activa', positivoSi: 'No hay rotación externa activa.' },
      { id: 'pseudoNoMejora', label: 'No mejora el ROM tras aliviar el dolor', positivoSi: 'Aunque se le quite el dolor, el recorrido sigue igual (apoya rotura, no inhibición por dolor).' },
    ],
  },
]

// Todos los ids de test, para el botón de "marcar todo como negativo".
export const DD_TODOS_LOS_TESTS = DD_PASOS.flatMap((paso) => paso.tests.map((t) => `${paso.id}.${t.id}`))

export function ddValorInfo(valor) {
  return DD_VALORES.find((v) => v.valor === valor) || null
}

// Marca TODOS los test como negativos de golpe. Es el caso normal: se parte
// de "no hay nada que destacar" y luego se marcan a mano los positivos.
export function ddMarcarTodoNegativo() {
  const out = {}
  DD_PASOS.forEach((paso) => {
    out[paso.id] = {}
    paso.tests.forEach((t) => { out[paso.id][t.id] = 'negativo' })
  })
  return out
}

// Igual pero para un solo paso, conservando el resto tal cual estaba.
export function ddMarcarPasoNegativo(actual, pasoId) {
  const paso = DD_PASOS.find((p) => p.id === pasoId)
  if (!paso) return actual
  const delPaso = {}
  paso.tests.forEach((t) => { delPaso[t.id] = 'negativo' })
  return { ...(actual || {}), [pasoId]: delPaso }
}

export function ddLimpiar(actual, pasoId = null) {
  if (!pasoId) return {}
  const copia = { ...(actual || {}) }
  delete copia[pasoId]
  return copia
}

// Resumen de un paso: cuántos test hay, cuántos evaluados y cuáles positivos.
export function ddResumenPaso(dd, paso) {
  const valores = (dd || {})[paso.id] || {}
  const positivos = paso.tests.filter((t) => valores[t.id] === 'positivo')
  const evaluados = paso.tests.filter((t) => valores[t.id] === 'positivo' || valores[t.id] === 'negativo')
  return {
    total: paso.tests.length,
    evaluados: evaluados.length,
    positivos,
    completo: evaluados.length === paso.tests.length,
    limpio: evaluados.length === paso.tests.length && positivos.length === 0,
  }
}

// Conclusión global, siguiendo el orden del algoritmo. Devuelve un objeto
// con estado + mensaje para pintar el banner de arriba del bloque.
//   'sin-datos'   → no se ha evaluado nada todavía
//   'red-flag'    → hay bandera roja: parar y derivar
//   'pendiente'   → hay fuentes sin descartar (positivos en pasos de descarte)
//   'incompleto'  → nada positivo, pero faltan test por hacer
//   'rcsrp'       → todo descartado: el cuadro encaja con RCSRP
export function ddConclusion(dd) {
  const datos = dd || {}
  const algoEvaluado = DD_PASOS.some((p) => ddResumenPaso(datos, p).evaluados > 0)
  if (!algoEvaluado) return { estado: 'sin-datos', titulo: 'Sin evaluar', detalle: 'Todavía no se ha registrado ningún test de diagnóstico diferencial.' }

  const redFlags = DD_PASOS.filter((p) => p.tipo === 'redflag').flatMap((p) => ddResumenPaso(datos, p).positivos)
  if (redFlags.length > 0) {
    return {
      estado: 'red-flag',
      titulo: '🚩 Bandera roja — derivar',
      detalle: `Positivo en: ${redFlags.map((t) => t.label).join(', ')}. Parar aquí y derivar a médico antes de seguir con la readaptación.`,
    }
  }

  const rotura = DD_PASOS.filter((p) => p.tipo === 'alerta').flatMap((p) => ddResumenPaso(datos, p).positivos)
  const pasosDescarte = DD_PASOS.filter((p) => p.tipo === 'descarte')
  const sinDescartar = pasosDescarte.filter((p) => ddResumenPaso(datos, p).positivos.length > 0)

  if (sinDescartar.length > 0) {
    return {
      estado: 'pendiente',
      titulo: 'Quedan fuentes sin descartar',
      detalle: `Hay test positivos en: ${sinDescartar.map((p) => p.label.replace('Descartar ', '')).join(', ')}. Mientras no se descarten, no se puede cerrar el cuadro como RCSRP.`,
      rotura,
    }
  }

  const todosCompletos = pasosDescarte.every((p) => ddResumenPaso(datos, p).completo)
  if (!todosCompletos) {
    const faltan = pasosDescarte.filter((p) => !ddResumenPaso(datos, p).completo)
    return {
      estado: 'incompleto',
      titulo: 'De momento, nada que descartar',
      detalle: `Sin positivos hasta ahora, pero faltan test por registrar en: ${faltan.map((p) => p.label.replace('Descartar ', '')).join(', ')}.`,
      rotura,
    }
  }

  const apoyos = DD_PASOS.filter((p) => p.tipo === 'apoyo').flatMap((p) => ddResumenPaso(datos, p).positivos)
  return {
    estado: 'rcsrp',
    titulo: '✅ Compatible con RCSRP',
    detalle: apoyos.length > 0
      ? `Descartadas las 5 fuentes del algoritmo, y además apoyan el diagnóstico: ${apoyos.map((t) => t.label).join(', ')}.`
      : 'Descartadas las 5 fuentes del algoritmo. No se ha registrado ningún test de apoyo (IRRT, resistencia a RE, arco doloroso).',
    rotura,
  }
}
