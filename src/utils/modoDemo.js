// Modo demo / presentación: enmascara los datos personales para poder
// enseñar o grabar el panel sin exponer clientes, equipo, teléfonos, emails
// ni datos de salud reales. NO toca la base de datos: solo transforma en
// memoria lo que se ve en pantalla. Las escrituras se bloquean aparte, en
// supabaseClient.js (ver demoGuard.js).
//
// La clave es hacerlo de forma CONSISTENTE: cada nombre real se sustituye
// siempre por el mismo nombre ficticio en todas las tablas, para que los
// enlaces por nombre (cliente ↔ seguimiento ↔ valoración ↔ contacto…) sigan
// cuadrando y el panel se vea coherente.

function telFake(i) {
  return `600 000 ${String(i % 1000).padStart(3, '0')}`
}

// Construye un mapa nombre_real -> nombre_ficticio, ampliándolo sobre la
// marcha según van apareciendo nombres nuevos.
function creaMapa(prefijo) {
  const mapa = {}
  return {
    get(nombre) {
      if (!nombre) return nombre
      if (!(nombre in mapa)) mapa[nombre] = `${prefijo} ${Object.keys(mapa).length + 1}`
      return mapa[nombre]
    },
    all: mapa,
  }
}

// Reemplaza cualquier aparición de un nombre real por su ficticio dentro de
// un texto libre (comentarios, conceptos de finanzas, mensajes del muro…).
function reemplazaEnTexto(texto, pares) {
  if (!texto || typeof texto !== 'string') return texto
  let out = texto
  for (const [real, falso] of pares) {
    if (real && out.includes(real)) out = out.split(real).join(falso)
  }
  return out
}

export function enmascararTodo(d) {
  const cli = creaMapa('Cliente')
  const worker = creaMapa('Profesional')
  const lead = creaMapa('Lead')

  const clientes = (d.clientes || []).map((c, i) => {
    const trabajadores = (c.Trabajadores || (c.Trabajador ? [c.Trabajador] : [])).map((w) => worker.get(w))
    return {
      ...c,
      Nombre: cli.get(c.Nombre),
      Email: c.Email ? `cliente${i + 1}@ejemplo.com` : c.Email,
      'Teléfono': c['Teléfono'] ? telFake(i + 1) : c['Teléfono'],
      Drive: c.Drive ? '' : c.Drive,
      Trabajadores: trabajadores,
      ...(c.Trabajador ? { Trabajador: trabajadores[0] } : {}),
    }
  })

  const team = { ...(d.team || {}) }
  ;['tecnico', 'ventas', 'contenido'].forEach((cat) => {
    if (Array.isArray(team[cat])) {
      team[cat] = team[cat].map((p, i) => ({
        ...p,
        nombre: worker.get(p.nombre),
        email: p.email ? `profesional${i + 1}@ejemplo.com` : p.email,
        telefono: p.telefono ? telFake(i + 100) : p.telefono,
      }))
    }
  })

  // Pares para reemplazo en textos libres (nombres ya registrados en los mapas).
  const pares = () => [
    ...Object.entries(cli.all),
    ...Object.entries(worker.all),
    ...Object.entries(lead.all),
  ].sort((a, b) => b[0].length - a[0].length)

  const ventas = (d.ventas || []).map((v, i) => ({
    ...v,
    nombre: lead.get(v.nombre),
    email: v.email ? `lead${i + 1}@ejemplo.com` : v.email,
    telefono: v.telefono ? telFake(i + 200) : v.telefono,
    closer: v.closer ? worker.get(v.closer) : v.closer,
    motivoPerdida: reemplazaEnTexto(v.motivoPerdida, pares()),
    notasSeguimiento: (v.notasSeguimiento || []).map((n) => ({ ...n, nota: reemplazaEnTexto(n.nota, pares()) })),
    recontacto: v.recontacto ? { ...v.recontacto, contacto: v.recontacto.contacto ? telFake(i + 300) : v.recontacto.contacto } : v.recontacto,
  }))

  const seguimientos = (d.seguimientos || []).map((s) => ({
    ...s,
    clienteNombre: cli.get(s.clienteNombre),
    comentarios: reemplazaEnTexto(s.comentarios, pares()),
    cambiosPendientes: (s.cambiosPendientes || []).map((c) => ({ ...c, texto: reemplazaEnTexto(c.texto, pares()) })),
    revisiones: (s.revisiones || []).map((r) => ({ ...r, persona: r.persona ? worker.get(r.persona) : r.persona })),
  }))

  const conNombreCliente = (arr) => (arr || []).map((x) => ({ ...x, clienteNombre: cli.get(x.clienteNombre) }))
  const contactosSemanales = conNombreCliente(d.contactosSemanales)
  const valoraciones = conNombreCliente(d.valoraciones)
  const objetivosClienteFase = conNombreCliente(d.objetivosClienteFase)
  const revisionesSemanales = (d.revisionesSemanales || []).map((r) => ({
    ...r,
    clienteNombre: cli.get(r.clienteNombre),
    ...(r.persona ? { persona: worker.get(r.persona) } : {}),
    ...(r.revisadoPor ? { revisadoPor: worker.get(r.revisadoPor) } : {}),
  }))

  const recontactos = (d.recontactos || []).map((r, i) => ({
    ...r,
    nombre: r.nombre ? `Contacto ${i + 1}` : r.nombre,
    contacto: r.contacto ? telFake(i + 400) : r.contacto,
    motivo: reemplazaEnTexto(r.motivo, pares()),
  }))

  const enmascaraFinanza = (arr) => (arr || []).map((f) => ({
    ...f,
    concepto: reemplazaEnTexto(f.concepto, pares()),
    notas: reemplazaEnTexto(f.notas, pares()),
  }))
  const ingresosEmpresa = enmascaraFinanza(d.ingresosEmpresa)
  const gastosEmpresa = enmascaraFinanza(d.gastosEmpresa)

  const mensajesEquipo = (d.mensajesEquipo || []).map((m) => ({
    ...m,
    autor: m.autor ? worker.get(m.autor) : m.autor,
    texto: reemplazaEnTexto(m.texto, pares()),
    menciones: (m.menciones || []).map((n) => worker.get(n)),
  }))

  return {
    clientes, team, ventas, seguimientos, contactosSemanales, valoraciones,
    objetivosClienteFase, revisionesSemanales, recontactos, ingresosEmpresa,
    gastosEmpresa, mensajesEquipo,
  }
}
