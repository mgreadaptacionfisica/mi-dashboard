// Comisión del closer. Hay dos formas de pagarla y conviven:
//
//   1. Porcentaje plano (`persona.comision`): lo de siempre, un % único sobre
//      todo lo que factura en el mes.
//   2. Por tramos (`persona.tramosComision`): el % sube según cuántas ventas
//      lleva ESE MES. Ejemplo real: hasta la venta 9 el 10%, de la 10 en
//      adelante el 12%.
//
// Los tramos son MARGINALES, como el IRPF (decisión de Raúl): al llegar a la
// venta 10 no se recalcula todo el mes al 12%, solo se paga al 12% de la
// décima venta en adelante. Las 9 primeras se quedan al 10%.
//
// El contador se reinicia cada mes natural, igual que la caja de "comisión de
// este mes" de la sección Equipo y que el historial mensual de la ficha.
//
// Si un closer tiene tramos, el % plano se ignora (los tramos mandan).

// Ordena y limpia los tramos: fuera los que no tengan número, ordenados por
// la venta en la que empiezan y con el primero siempre desde la venta 1
// (si Raúl escribe "desde la 3" en el primer tramo, las 2 primeras ventas
// se quedarían sin % — se evita bajándolo a 1).
export function tramosOrdenados(persona) {
  const tramos = Array.isArray(persona?.tramosComision) ? persona.tramosComision : []
  const limpios = tramos
    .map((t) => ({ desde: Number(t?.desde) || 0, porcentaje: Number(t?.porcentaje) || 0 }))
    .filter((t) => t.desde > 0)
    .sort((a, b) => a.desde - b.desde)
  if (limpios.length > 0) limpios[0] = { ...limpios[0], desde: 1 }
  return limpios
}

export function tieneTramos(persona) {
  return tramosOrdenados(persona).length > 0
}

// "1-9: 10% · 10+: 12%" — para enseñar los tramos de un vistazo en la ficha.
export function resumenTramos(persona) {
  const tramos = tramosOrdenados(persona)
  if (tramos.length === 0) return ''
  return tramos
    .map((t, i) => {
      const siguiente = tramos[i + 1]
      const rango = siguiente ? `${t.desde}-${siguiente.desde - 1}` : `${t.desde}+`
      return `${rango}: ${t.porcentaje}%`
    })
    .join(' · ')
}

// % que le toca a la venta número `n` del mes (1 = primera venta del mes).
export function porcentajeParaVenta(persona, n) {
  const tramos = tramosOrdenados(persona)
  if (tramos.length === 0) return Number(persona?.comision) || 0
  let pct = tramos[0].porcentaje
  tramos.forEach((t) => { if (n >= t.desde) pct = t.porcentaje })
  return pct
}

const redondea = (n) => Math.round(n * 100) / 100

// Comisión de un mes a partir de los leads ganados de ese mes.
// Devuelve el total y el desglose por tramo, para poder explicarlo en la UI.
// Las ventas se numeran por fecha de cierre: la primera del mes es la nº 1.
export function calcularComisionMes(ventasDelMes, persona) {
  const lista = [...(ventasDelMes || [])].sort((a, b) =>
    (a?.venta?.fechaCierre || '').localeCompare(b?.venta?.fechaCierre || '')
  )
  const facturado = lista.reduce((sum, lead) => sum + (Number(lead?.venta?.importe) || 0), 0)
  const tramos = tramosOrdenados(persona)

  if (tramos.length === 0) {
    const pct = Number(persona?.comision) || 0
    return {
      comision: redondea(facturado * (pct / 100)),
      facturado: redondea(facturado),
      ventas: lista.length,
      porTramo: [],
      porcentajeActual: pct,
    }
  }

  // Cada venta cae en su tramo según el número de orden que ocupa en el mes.
  const acumulado = tramos.map((t, i) => ({
    desde: t.desde,
    hasta: tramos[i + 1] ? tramos[i + 1].desde - 1 : null,
    porcentaje: t.porcentaje,
    ventas: 0,
    facturado: 0,
    comision: 0,
  }))

  lista.forEach((lead, i) => {
    const n = i + 1
    let idx = 0
    tramos.forEach((t, j) => { if (n >= t.desde) idx = j })
    const importe = Number(lead?.venta?.importe) || 0
    acumulado[idx].ventas += 1
    acumulado[idx].facturado += importe
    acumulado[idx].comision += importe * (tramos[idx].porcentaje / 100)
  })

  const porTramo = acumulado.map((t) => ({
    ...t,
    facturado: redondea(t.facturado),
    comision: redondea(t.comision),
  }))

  return {
    comision: redondea(porTramo.reduce((sum, t) => sum + t.comision, 0)),
    facturado: redondea(facturado),
    ventas: lista.length,
    porTramo: porTramo.filter((t) => t.ventas > 0),
    // El % en el que está ahora mismo: el de la SIGUIENTE venta que cierre.
    porcentajeActual: porcentajeParaVenta(persona, lista.length + 1),
  }
}

// Comisión + fijo que lleva el closer en el MES EN CURSO (lo que se le pagará
// el mes que viene, porque se paga a mes vencido). Manda `venta.fechaCierre`,
// no la fecha de inicio del cliente. Lo usan la tarjeta de Equipo (admin) y
// Mi Ficha (el propio closer), para que los dos vean la misma cifra.
export function comisionMesEnCursoCloser(persona, ventas) {
  const mesActual = new Date().toISOString().slice(0, 7) // YYYY-MM
  const ventasDelMes = (ventas || []).filter((lead) =>
    lead.closer === persona.nombre &&
    lead.etapa === 'ganada' &&
    lead.venta?.fechaCierre?.startsWith(mesActual)
  )
  const calculo = calcularComisionMes(ventasDelMes, persona)
  const fijo = Number(persona.fijo) || 0
  return {
    ventasMes: ventasDelMes.length,
    facturadoMes: calculo.facturado,
    comisionMes: calculo.comision,
    porTramo: calculo.porTramo,
    porcentajeActual: calculo.porcentajeActual,
    fijo,
    totalMes: calculo.comision + fijo,
  }
}

// Actividad completa del closer: leads asignados, llamadas, conversión,
// cumplimiento de checklist e historial mensual de comisión + fijo. Sacado de
// Equipo.jsx para reutilizarlo en Mi Ficha sin duplicar el cálculo.
export function actividadCloser(persona, ventas) {
  const leads = (ventas || []).filter((lead) => lead.closer === persona.nombre)
  const llamadasRealizadas = leads.filter((lead) => lead.resultadoLlamada === 'realizada')
  const ganadas = leads.filter((lead) => lead.etapa === 'ganada')
  const perdidas = leads.filter((lead) => lead.etapa === 'perdida')
  const checklistCompleto = leads.filter((lead) =>
    lead.preLlamada?.whatsapp && lead.preLlamada?.prellamada && lead.preLlamada?.recordatorio
  )
  const tasaConversion = llamadasRealizadas.length > 0
    ? Math.round((ganadas.length / llamadasRealizadas.length) * 100)
    : 0

  const meses = {}
  leads.forEach((lead) => {
    const mesAgenda = (lead.fechaAgenda || lead.creadoEn || '').slice(0, 7)
    if (mesAgenda) {
      meses[mesAgenda] = meses[mesAgenda] || { leads: 0, llamadas: 0, ventas: 0, facturado: 0, ganadas: [] }
      meses[mesAgenda].leads += 1
      if (lead.resultadoLlamada === 'realizada') meses[mesAgenda].llamadas += 1
    }
    if (lead.etapa === 'ganada' && lead.venta?.fechaCierre) {
      const mesCierre = lead.venta.fechaCierre.slice(0, 7)
      meses[mesCierre] = meses[mesCierre] || { leads: 0, llamadas: 0, ventas: 0, facturado: 0, ganadas: [] }
      meses[mesCierre].ventas += 1
      meses[mesCierre].facturado += Number(lead.venta.importe) || 0
      // Se guardan los leads ganados del mes porque con tramos no basta
      // con el total facturado: hay que numerar las ventas una a una.
      meses[mesCierre].ganadas.push(lead)
    }
  })

  const historial = Object.keys(meses)
    .sort((a, b) => b.localeCompare(a))
    .map((mes) => {
      const datos = meses[mes]
      const comision = calcularComisionMes(datos.ganadas, persona).comision
      const fijo = Number(persona.fijo) || 0
      return { mes, ...datos, comision, fijo, total: comision + fijo }
    })

  return {
    leads,
    totalLeads: leads.length,
    llamadasRealizadas: llamadasRealizadas.length,
    ganadas: ganadas.length,
    perdidas: perdidas.length,
    tasaConversion,
    checklistCompleto: checklistCompleto.length,
    historial,
  }
}

// Importe de un mes ya cerrado para un closer. Si no tuvo movimiento ese mes
// no hay fila en el historial, pero el fijo se le paga igual.
export function importeMesCloser(persona, actividad, mesKey) {
  const fila = actividad?.historial.find((h) => h.mes === mesKey)
  return fila ? fila.total : (Number(persona.fijo) || 0)
}
