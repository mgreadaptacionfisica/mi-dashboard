import { normalizaNombre, cuestionarioDeCliente } from './cuestionarioPrevio'
import { contratoDeCliente } from './contrato'

// Qué pasos lleva cada onboarding. Vive aquí (y no en Onboarding.jsx) porque
// lo usan las dos partes: la página pública que pinta los pasos y el panel
// que calcula quién ha terminado. Los textos de cada paso siguen en
// Onboarding.jsx (PASOS).
export const VARIANTES_ONBOARDING = {
  low: {
    // Se mantiene la clave de siempre para no perder el progreso de quien
    // ya lo tenía a medias.
    storageKey: 'mg-onboarding-progress',
    pasos: ['cuestionario', 'harbiz', 'tut-app', 'tut-forms', 'tut-movilidad', 'tut-rutina', 'tut-entrenamiento', 'verificacion'],
    final: 'verificacion',
    tiempo: 'Menos de 10 minutos',
  },
  premium: {
    storageKey: 'mg-onboarding-premium-progress',
    pasos: ['contrato', 'cuestionario', 'harbiz', 'tut-app', 'tut-forms', 'tut-rutina', 'tut-entrenamiento'],
    final: null,
    tiempo: 'Unos 15 minutos',
  },
}

// Qué hay que hacer cuando un cliente termina. Es el paso 'contactado' que
// marca Raúl desde el panel.
export const ACCION_CONTACTO = {
  premium: 'Crear el grupo de WhatsApp',
  low: 'Escribirle por WhatsApp',
}

// Estado del onboarding de cada cliente, a partir de los eventos de
// onboarding_progreso (en orden ascendente: el último de cada paso manda) y
// de los contratos firmados (el paso 'contrato' sale de ahí, no de eventos).
// El paso 'cuestionario' cuenta si hay cuestionario recibido O si el cliente
// lo marcó: el recibido es la prueba buena, la marca cubre el que lo mandó
// con el nombre escrito distinto.
//
// Devuelve [{ clienteNombre, variante, hechos, total, contrato, terminado,
// contactado, ultimo }] ordenado: primero los que han terminado y esperan a
// que se les escriba, luego los que van a medias, y al final los ya
// contactados.
export function estadoOnboarding(eventos = [], contratos = [], cuestionarios = []) {
  const porCliente = new Map()
  const entrada = (nombre) => {
    const k = normalizaNombre(nombre)
    if (!k) return null
    if (!porCliente.has(k)) porCliente.set(k, { clienteNombre: nombre, variante: '', pasos: {}, contactado: false, ultimo: '' })
    return porCliente.get(k)
  }

  eventos.forEach((e) => {
    const c = entrada(e.clienteNombre)
    if (!c) return
    if (e.paso === 'contactado') c.contactado = e.hecho
    else c.pasos[e.paso] = e.hecho
    if (e.variante) c.variante = e.variante
    if ((e.creadoEn || '') > c.ultimo) c.ultimo = e.creadoEn
  })

  // Quien ha firmado pero aún no ha tocado ningún paso también tiene que salir.
  contratos.forEach((ct) => {
    const c = entrada(ct.clienteNombre)
    if (!c) return
    if (!c.variante) c.variante = ct.origen === 'premium' ? 'premium' : c.variante
    if ((ct.firmadoEn || '') > c.ultimo) c.ultimo = ct.firmadoEn
  })

  const lista = [...porCliente.values()].map((c) => {
    const variante = VARIANTES_ONBOARDING[c.variante] ? c.variante : 'premium'
    const pasos = VARIANTES_ONBOARDING[variante].pasos
    const contrato = contratoDeCliente(contratos, c.clienteNombre, normalizaNombre)
    const cuestionario = cuestionarioDeCliente(cuestionarios, c.clienteNombre)
    const hecho = (p) => (p === 'contrato' ? Boolean(contrato)
      : p === 'cuestionario' ? Boolean(cuestionario) || c.pasos[p] === true
      : c.pasos[p] === true)
    const hechos = pasos.filter(hecho).length
    return {
      clienteNombre: c.clienteNombre,
      variante,
      hechos,
      total: pasos.length,
      pendientes: pasos.filter((p) => !hecho(p)),
      contrato,
      terminado: hechos === pasos.length,
      contactado: c.contactado,
      ultimo: c.ultimo,
    }
  })

  const rango = (x) => (x.terminado && !x.contactado ? 0 : !x.contactado ? 1 : 2)
  return lista.sort((a, b) => rango(a) - rango(b) || (b.ultimo || '').localeCompare(a.ultimo || ''))
}

export const pendientesDeContactar = (estados) => estados.filter((e) => e.terminado && !e.contactado)

// Nombres cortos de cada paso, para listar lo que le falta a un cliente.
export const ETIQUETA_PASO = {
  contrato: 'contrato',
  cuestionario: 'cuestionario inicial',
  harbiz: 'registro en Harbiz',
  'tut-app': 'tutorial app',
  'tut-forms': 'tutorial formularios',
  'tut-movilidad': 'tutorial movilidad',
  'tut-rutina': 'tutorial rutina',
  'tut-entrenamiento': 'tutorial entrenamiento',
  verificacion: 'confirmación final',
}
