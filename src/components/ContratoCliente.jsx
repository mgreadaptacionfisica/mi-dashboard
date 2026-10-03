import { useEffect, useMemo, useRef, useState } from 'react'
import Logo from '../assets/mg-logo.png'
import {
  DURACIONES, FIRMA_PROFESIONAL, FORMAS_PAGO, METODOS_PAGO, OPCIONES_IMAGEN, PROFESIONAL, VERSION_CONTRATO,
  clausulasContrato, datosDelEnlace, faltasContrato, fechaLarga, imprimirContrato,
} from '../utils/contrato'
import { firmarContratoPublico } from '../lib/queries/contratosClientes'

// Contrato que el cliente rellena y firma online. Vive dentro del onboarding
// de high ticket (/onboarding-premium) y también suelto en /contrato, las dos
// RUTAS PÚBLICAS sin login.
//
// Las condiciones que ya ha cerrado la closer (nombre, duración, importe,
// forma de pago…) pueden venir en el enlace (ver PARAMS_ENLACE): esas salen
// bloqueadas para que el cliente no tenga que adivinar el precio ni pueda
// cambiarlo. Lo que no venga, lo rellena él.
//
// Borrador en localStorage como en el cuestionario previo (la firma no: se
// vuelve a firmar, que es un segundo). Todo entre try/catch porque en ventana
// privada el acceso a localStorage ya lanza.

const CLAVE_BORRADOR = 'mg-contrato-borrador'
const CLAVE_FIRMADO = 'mg-contrato-firmado'

// Lienzo de firma: dedo en el móvil, ratón en el ordenador. Pointer events
// cubren los dos; `touch-action: none` (en el CSS) evita que al firmar se
// mueva la página.
function PadFirma({ onCambio }) {
  const canvasRef = useRef(null)
  const dibujando = useRef(false)
  const [vacio, setVacio] = useState(true)

  // El lienzo se dimensiona al ancho real de su caja (y a la densidad de
  // píxeles de la pantalla) para que el trazo no salga borroso ni desplazado.
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ratio = window.devicePixelRatio || 1
    const r = c.getBoundingClientRect()
    c.width = r.width * ratio
    c.height = r.height * ratio
    const ctx = c.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111827'
  }, [])

  const punto = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const empezar = (e) => {
    e.preventDefault()
    canvasRef.current.setPointerCapture?.(e.pointerId)
    dibujando.current = true
    const ctx = canvasRef.current.getContext('2d')
    const p = punto(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(p.x + 0.1, p.y + 0.1)
    ctx.stroke()
  }

  const mover = (e) => {
    if (!dibujando.current) return
    const ctx = canvasRef.current.getContext('2d')
    const p = punto(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  const terminar = () => {
    if (!dibujando.current) return
    dibujando.current = false
    setVacio(false)
    onCambio(canvasRef.current.toDataURL('image/png'))
  }

  const borrar = () => {
    const c = canvasRef.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
    setVacio(true)
    onCambio('')
  }

  return (
    <div className="contrato-firma">
      <canvas
        ref={canvasRef}
        className="contrato-firma-lienzo"
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerLeave={terminar}
        onPointerCancel={terminar}
      />
      {vacio && <span className="contrato-firma-guia">Firma aquí con el dedo o el ratón</span>}
      <button type="button" className="contrato-firma-borrar" onClick={borrar} disabled={vacio}>
        Borrar firma
      </button>
    </div>
  )
}

function Opciones({ nombre, opciones, valor, bloqueado, onChange }) {
  return (
    <div className="cp-opciones">
      {opciones.map((o) => (
        <label key={o.id} className={valor === o.id ? 'cp-opcion-activa' : ''} aria-disabled={bloqueado && valor !== o.id}>
          <input
            type="radio"
            name={nombre}
            value={o.id}
            checked={valor === o.id}
            disabled={bloqueado && valor !== o.id}
            onChange={() => onChange(o.id)}
          />
          {o.label}{o.detalle ? ` (${o.detalle})` : ''}
        </label>
      ))}
    </div>
  )
}

export default function ContratoCliente({ origen = 'suelto', onFirmado }) {
  const delEnlace = useMemo(datosDelEnlace, [])
  const [datos, setDatos] = useState(() => ({ formaPago: 'completo', ...delEnlace }))
  const [firma, setFirma] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [intentado, setIntentado] = useState(false)
  // Si ya firmó desde este navegador, se le enseña su copia en vez del
  // formulario en blanco (vuelve a abrir el enlace para descargarla).
  // Solo si el enlace no trae otro nombre: el mismo móvil puede abrir el
  // enlace de otra persona (la closer probándolo, un familiar…).
  const [firmado, setFirmado] = useState(() => {
    try {
      const f = JSON.parse(localStorage.getItem(CLAVE_FIRMADO) || 'null')
      return f && (!delEnlace.nombre || f.datos?.nombre === delEnlace.nombre) ? f : null
    } catch (e) { return null }
  })

  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem(CLAVE_BORRADOR) || 'null')
      // Lo que llega en el enlace manda sobre el borrador: si la closer manda
      // un enlace nuevo con otro importe, es el bueno.
      if (b) setDatos((prev) => ({ ...prev, ...b, ...delEnlace }))
    } catch (e) { /* sin borrador */ }
  }, [delEnlace])

  useEffect(() => {
    if (firmado) return
    try { localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(datos)) } catch (e) { /* da igual */ }
  }, [datos, firmado])

  useEffect(() => {
    if (firmado && onFirmado) onFirmado()
  }, [firmado, onFirmado])

  const set = (campo) => (valor) => setDatos((prev) => ({ ...prev, [campo]: valor }))
  // Un enlace viejo puede traer una duración que ya no existe: entonces no se
  // bloquea, o el cliente se quedaría sin poder elegir ninguna.
  const bloq = (campo) => Boolean(delEnlace[campo]) &&
    (campo !== 'duracion' || DURACIONES.some((x) => x.id === delEnlace.duracion))
  const faltas = faltasContrato(datos, Boolean(firma))
  const clausulas = clausulasContrato(datos)

  async function firmar(e) {
    e.preventDefault()
    setIntentado(true)
    if (faltas.length) return
    setEnviando(true)
    setError(null)
    const contrato = {
      id: `contrato-${Date.now()}`,
      clienteNombre: datos.nombre.trim(),
      dni: datos.dni.trim(),
      email: datos.email.trim(),
      origen,
      datos,
      texto: clausulas,
      version: VERSION_CONTRATO,
      firma,
      firmadoEn: new Date().toISOString(),
    }
    const fallo = await firmarContratoPublico(contrato)
    setEnviando(false)
    if (fallo) {
      setError(fallo)
      return
    }
    try {
      localStorage.removeItem(CLAVE_BORRADOR)
      localStorage.setItem(CLAVE_FIRMADO, JSON.stringify(contrato))
    } catch (err) { /* sin sitio: la copia se descarga igual ahora */ }
    setFirmado(contrato)
  }

  if (firmado) {
    return (
      <div className="contrato-hecho">
        <span className="contrato-hecho-icono">✅</span>
        <div>
          <h3>Contrato firmado</h3>
          <p>
            Firmado por {firmado.datos?.nombre} el {fechaLarga(firmado.firmadoEn)}. Ya lo tenemos nosotros; guarda tu
            copia si quieres.
          </p>
          <button type="button" className="onboarding-step-cta contrato-link-btn" onClick={() => imprimirContrato(firmado)}>
            📄 Descargar mi copia en PDF
          </button>
        </div>
      </div>
    )
  }

  return (
    <form className="contrato-form" onSubmit={firmar}>
      <p className="contrato-intro">
        Es el contrato de siempre, pero sin imprimir ni escanear nada: rellena tus datos, revisa las condiciones,
        firma con el dedo y listo. Al terminar puedes descargar tu copia en PDF.
      </p>

      <h4 className="contrato-subtitulo">Tus datos</h4>
      <div className="contrato-grid">
        <label className="cp-campo">
          <span>Nombre y apellidos</span>
          <input className="cp-input" value={datos.nombre || ''} readOnly={bloq('nombre')} onChange={(e) => set('nombre')(e.target.value)} />
        </label>
        <label className="cp-campo">
          <span>DNI / NIE</span>
          <input className="cp-input" value={datos.dni || ''} onChange={(e) => set('dni')(e.target.value)} />
        </label>
        <label className="cp-campo contrato-ancho">
          <span>Domicilio</span>
          <input className="cp-input" value={datos.domicilio || ''} placeholder="Calle, número, CP y ciudad" onChange={(e) => set('domicilio')(e.target.value)} />
        </label>
        <label className="cp-campo">
          <span>Email</span>
          <input type="email" className="cp-input" value={datos.email || ''} onChange={(e) => set('email')(e.target.value)} />
        </label>
        <label className="cp-campo">
          <span>Teléfono <em>(opcional)</em></span>
          <input type="tel" className="cp-input" value={datos.telefono || ''} onChange={(e) => set('telefono')(e.target.value)} />
        </label>
      </div>

      <h4 className="contrato-subtitulo">Lo contratado</h4>
      <div className="contrato-bloque">
        <span className="contrato-etiqueta">Duración</span>
        <Opciones nombre="duracion" opciones={DURACIONES} valor={datos.duracion} bloqueado={bloq('duracion')} onChange={set('duracion')} />
      </div>
      <div className="contrato-grid">
        <label className="cp-campo">
          <span>Importe total (€)</span>
          <input inputMode="decimal" className="cp-input" value={datos.importe || ''} readOnly={bloq('importe')} onChange={(e) => set('importe')(e.target.value)} />
        </label>
      </div>
      <div className="contrato-bloque">
        <span className="contrato-etiqueta">Forma de pago</span>
        <Opciones nombre="formaPago" opciones={FORMAS_PAGO} valor={datos.formaPago} bloqueado={bloq('formaPago')} onChange={set('formaPago')} />
      </div>
      {datos.formaPago === 'plazos' && (
        <div className="contrato-grid contrato-grid-3">
          <label className="cp-campo">
            <span>Primer pago (€)</span>
            <input inputMode="decimal" className="cp-input" value={datos.primerPago || ''} readOnly={bloq('primerPago')} onChange={(e) => set('primerPago')(e.target.value)} />
          </label>
          <label className="cp-campo">
            <span>Nº de plazos</span>
            <input inputMode="numeric" className="cp-input" value={datos.numPlazos || ''} readOnly={bloq('numPlazos')} onChange={(e) => set('numPlazos')(e.target.value)} />
          </label>
          <label className="cp-campo">
            <span>Importe de cada plazo (€)</span>
            <input inputMode="decimal" className="cp-input" value={datos.importePlazo || ''} readOnly={bloq('importePlazo')} onChange={(e) => set('importePlazo')(e.target.value)} />
          </label>
        </div>
      )}
      <div className="contrato-bloque">
        <span className="contrato-etiqueta">Método de pago</span>
        <Opciones nombre="metodoPago" opciones={METODOS_PAGO} valor={datos.metodoPago} bloqueado={bloq('metodoPago')} onChange={set('metodoPago')} />
      </div>

      <h4 className="contrato-subtitulo">Uso de tu imagen</h4>
      <div className="contrato-bloque">
        <Opciones nombre="imagen" opciones={OPCIONES_IMAGEN} valor={datos.imagen} onChange={set('imagen')} />
      </div>

      <h4 className="contrato-subtitulo">Condiciones</h4>
      <div className="contrato-texto">
        <p className="contrato-texto-cab">
          <strong>Contrato de prestación de servicios de readaptación física y deportiva</strong><br />
          Firmado electrónicamente el {fechaLarga()}
        </p>
        {clausulas.map((c) => (
          <div key={c.titulo}>
            <h5>{c.titulo}</h5>
            {c.parrafos.map((p) => <p key={p}>{p}</p>)}
          </div>
        ))}
      </div>

      <label className="contrato-check">
        <input type="checkbox" checked={Boolean(datos.aceptaContrato)} onChange={(e) => set('aceptaContrato')(e.target.checked)} />
        <span>
          He leído y acepto las condiciones, incluido el tratamiento de mis datos de salud (cláusula 7) y el inicio
          del servicio antes de que acabe el plazo de desistimiento (cláusula 6).
        </span>
      </label>

      <h4 className="contrato-subtitulo">Tu firma</h4>
      <PadFirma onCambio={setFirma} />
      <div className="contrato-firma-profesional">
        <img src={FIRMA_PROFESIONAL} alt="Firma de EL PROFESIONAL" />
        <p className="contrato-nota">Ya firmado por EL PROFESIONAL: {PROFESIONAL.nombre} · DNI {PROFESIONAL.dni}, en representación de {PROFESIONAL.empresa}</p>
      </div>

      {intentado && faltas.length > 0 && (
        <div className="cp-error" role="alert">
          <strong>Falta {faltas.join(', ')}.</strong>
        </div>
      )}
      {error && (
        <div className="cp-error" role="alert">
          <strong>⚠️ No se ha podido guardar el contrato</strong>
          <p>Tus datos siguen aquí. Vuelve a intentarlo en un momento; si sigue fallando, avísanos por WhatsApp.</p>
          <code>{error.message}</code>
        </div>
      )}

      <button type="submit" className="primary-action cp-boton" disabled={enviando}>
        {enviando ? 'Firmando…' : '✍️ Firmar contrato'}
      </button>
    </form>
  )
}

// Página suelta /contrato: el mismo formulario fuera del onboarding, por si
// hace falta mandárselo a alguien que no pasa por el de high ticket.
export function ContratoPublico() {
  return (
    <div className="cp-pagina">
      <div className="cp-hoja">
        <header className="cp-cabecera">
          <img src={Logo} alt="MG Readaptación Física" className="cp-logo" />
          <span className="cp-marca">MG Readaptación Física</span>
          <h1>Tu contrato</h1>
        </header>
        <ContratoCliente origen="suelto" />
      </div>
    </div>
  )
}
