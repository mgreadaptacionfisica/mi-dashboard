import { Suspense, lazy, useEffect, useState } from 'react'
import Onboarding from './components/Onboarding'
import PanelLogin from './components/PanelLogin'
import { getSession, onAuthChange, signOut, getRole, seccionesDelRol } from './lib/auth'

// Rutas públicas: se sirven solas, sin sidebar ni el resto del panel interno,
// y sin cargar los módulos que contienen datos de clientes.
const PUBLIC_PATHS = {
  '/onboarding': 'onboarding',
}

const isPublicRoute = Object.keys(PUBLIC_PATHS).includes(window.location.pathname)

// Componentes internos cargados solo bajo demanda (code-splitting),
// para que la vista pública /onboarding no incluya sus datos en el bundle descargado.
const Sidebar = lazy(() => import('./components/Sidebar'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const ClientesAdmin = lazy(() => import('./components/ClientesAdmin'))
const ClientesEquipo = lazy(() => import('./components/ClientesEquipo'))
const Equipo = lazy(() => import('./components/Equipo'))
const MiFicha = lazy(() => import('./components/MiFicha'))
const Ventas = lazy(() => import('./components/Ventas'))
const Finanzas = lazy(() => import('./components/Finanzas'))
const Operaciones = lazy(() => import('./components/Operaciones'))
const MuroEquipo = lazy(() => import('./components/MuroEquipo'))
const MisTareas = lazy(() => import('./components/MisTareas'))
const Manuales = lazy(() => import('./components/Manuales'))
// Clientes: último módulo migrado a Supabase. Los 64 clientes reales se
// recuperaron del estado en memoria del panel (nunca hubo persistencia
// real antes) y se migraron con supabase-sql/04_clientes.sql + 04b.
const clientesDataPromise = async () => {
  const { fetchClientes } = await import('./lib/queries/clientes')
  const remoto = await fetchClientes()
  if (remoto !== null) return { default: remoto }
  return import('./data/clientes')
}
// Equipo: tercer módulo migrado a Supabase, mismo patrón que SOPs/Comunicación.
const teamDataPromise = async () => {
  const { fetchMiembrosEquipo } = await import('./lib/queries/miembrosEquipo')
  const remoto = await fetchMiembrosEquipo()
  if (remoto !== null) return { default: remoto }
  return import('./data/team')
}
// Ventas: cuarto módulo migrado a Supabase, mismo patrón que SOPs/Comunicación/Equipo.
const ventasDataPromise = async () => {
  const { fetchVentas } = await import('./lib/queries/ventas')
  const remoto = await fetchVentas()
  if (remoto !== null) return { default: remoto }
  return import('./data/ventas')
}
const seguimientosDataPromise = async () => {
  const { fetchSeguimientos } = await import('./lib/queries/seguimientos')
  const remoto = await fetchSeguimientos()
  if (remoto !== null) return { default: remoto }
  return import('./data/seguimientos')
}
const settingDataPromise = async () => {
  const { fetchSetting } = await import('./lib/queries/settingInstagram')
  const remoto = await fetchSetting()
  if (remoto !== null) return { default: remoto }
  return import('./data/setting')
}
const adsKpiDataPromise = async () => {
  const { fetchAdsKpi } = await import('./lib/queries/ads')
  const remoto = await fetchAdsKpi()
  if (remoto !== null) return { default: remoto }
  return import('./data/adsKpi')
}
const adsNotasDataPromise = async () => {
  const { fetchAdsNotas } = await import('./lib/queries/ads')
  const remoto = await fetchAdsNotas()
  if (remoto !== null) return { default: remoto }
  return import('./data/adsNotasMensuales')
}
const anunciosDataPromise = async () => {
  const { fetchAnuncios } = await import('./lib/queries/ads')
  const remoto = await fetchAnuncios()
  if (remoto !== null) return { default: remoto }
  return import('./data/anuncios')
}
const recontactosDataPromise = async () => {
  const { fetchRecontactos } = await import('./lib/queries/recontactos')
  const remoto = await fetchRecontactos()
  if (remoto !== null) return { default: remoto }
  return import('./data/recontactos')
}
// Ingresos/gastos personales: 100% manuales (Raúl), separados del dinero
// de la empresa. Al ser tablas nuevas/protegidas por RLS admin-only, un
// visitante sin sesión simplemente verá listas vacías (no hace fallback a
// datos estáticos porque no representan ya la realidad tras la reorganización).
const ingresosPersonalesDataPromise = async () => {
  const { fetchFinanzas } = await import('./lib/queries/finanzas')
  const remoto = await fetchFinanzas('ingresos_personales')
  return { default: remoto || [] }
}
const gastosPersonalesDataPromise = async () => {
  const { fetchFinanzas } = await import('./lib/queries/finanzas')
  const remoto = await fetchFinanzas('gastos_personales')
  if (remoto !== null) return { default: remoto }
  return import('./data/gastosPersonales')
}
// Ingresos/gastos de empresa: se alimentan automáticamente desde Clientes >
// Cobros pendientes (ingresos_empresa) y Equipo > Marcar pago (gastos_empresa).
// Antes de esta reorganización estas tablas se llamaban ingresos_personales
// y gastos_profesionales (ver supabase-sql/15_finanzas_empresa_personal.sql).
const ingresosEmpresaDataPromise = async () => {
  const { fetchFinanzas } = await import('./lib/queries/finanzas')
  const remoto = await fetchFinanzas('ingresos_empresa')
  if (remoto !== null) return { default: remoto }
  return import('./data/ingresosPersonales')
}
const gastosEmpresaDataPromise = async () => {
  const { fetchFinanzas } = await import('./lib/queries/finanzas')
  const remoto = await fetchFinanzas('gastos_empresa')
  if (remoto !== null) return { default: remoto }
  return import('./data/gastosProfesionales')
}
// Reglas de gastos/ingresos recurrentes (Finanzas > Recurrentes). Tabla
// nueva, admin-only, sin fallback a datos estáticos.
const reglasRecurrentesDataPromise = async () => {
  const { fetchReglasRecurrentes } = await import('./lib/queries/reglasRecurrentes')
  const remoto = await fetchReglasRecurrentes()
  return { default: remoto || [] }
}
// Tarifas de comisión por pasarela de pago (Stripe/Hotmart/...) — ver
// Finanzas > Comisiones y utils/comisionesHelpers.js.
const tarifasPasarelaDataPromise = async () => {
  const { fetchTarifasPasarela } = await import('./lib/queries/tarifasPasarela')
  const remoto = await fetchTarifasPasarela()
  if (remoto !== null) return { default: remoto }
  return import('./data/tarifasPasarela')
}
const contenidoIdeasDataPromise = async () => {
  const { fetchContenidoIdeas } = await import('./lib/queries/contenidoIdeas')
  const remoto = await fetchContenidoIdeas()
  if (remoto !== null) return { default: remoto }
  return import('./data/contenidoIdeas')
}
const contactosSemanalesDataPromise = async () => {
  const { fetchContactosSemanales } = await import('./lib/queries/contactosSemanales')
  const remoto = await fetchContactosSemanales()
  if (remoto !== null) return { default: remoto }
  return import('./data/contactosSemanales')
}
const valoracionesClientesDataPromise = async () => {
  const { fetchValoraciones } = await import('./lib/queries/valoracionesClientes')
  const remoto = await fetchValoraciones()
  if (remoto !== null) return { default: remoto }
  return import('./data/valoracionesClientes')
}
// Catálogo de objetivos por fase (Valoración): mismo patrón fallback que SOPs.
// Se deja cargado solo para no perder el historial de valoraciones antiguas
// que ya usaban el catálogo compartido — ya no se edita desde el panel.
const objetivosFaseDataPromise = async () => {
  const { fetchObjetivosFase } = await import('./lib/queries/objetivosFase')
  const remoto = await fetchObjetivosFase()
  if (remoto !== null) return { default: remoto }
  return import('./data/objetivosFase')
}
// Objetivos por fase DE CADA CLIENTE ("Fases y objetivos", separado de
// Valoración): mismo patrón fallback.
const objetivosClienteFaseDataPromise = async () => {
  const { fetchObjetivosClienteFase } = await import('./lib/queries/objetivosClienteFase')
  const remoto = await fetchObjetivosClienteFase()
  if (remoto !== null) return { default: remoto }
  return import('./data/objetivosClienteFase')
}
// Check final del seguimiento semanal, por cliente: mismo patrón fallback.
const revisionesSemanalesDataPromise = async () => {
  const { fetchRevisionesSemanales } = await import('./lib/queries/revisionesSemanales')
  const remoto = await fetchRevisionesSemanales()
  if (remoto !== null) return { default: remoto }
  return import('./data/revisionesSemanales')
}

// Comunicación: segundo módulo migrado a Supabase, mismo patrón que SOPs
// (fallback automático al archivo estático si la tabla remota no responde).
const mensajesEquipoDataPromise = async () => {
  const { fetchMensajesEquipo } = await import('./lib/queries/mensajesEquipo')
  const remoto = await fetchMensajesEquipo()
  if (remoto !== null) return { default: remoto }
  return import('./data/mensajesEquipo')
}

// SOPs: primer módulo migrado a Supabase (piloto). Si la tabla remota no
// está disponible (sin conexión, sin configurar, error de red...) hace
// fallback automático al archivo estático para que el panel nunca se rompa.
const sopsDataPromise = async () => {
  const { fetchSops } = await import('./lib/queries/sops')
  const remoto = await fetchSops()
  if (remoto !== null) return { default: remoto }
  return import('./data/sops')
}

// Mis tareas: tabla nueva admin-only, sin datos estáticos previos (no
// representaba nada antes de existir la sección).
const tareasPersonalesDataPromise = async () => {
  const { fetchTareasPersonales } = await import('./lib/queries/tareasPersonales')
  const remoto = await fetchTareasPersonales()
  return { default: remoto || [] }
}

// Manuales: visible para todos los roles, sin fallback estático (los 4 PDFs
// ya vienen precargados desde supabase-sql/20_manuales.sql).
const manualesDataPromise = async () => {
  const { fetchManuales } = await import('./lib/queries/manuales')
  const remoto = await fetchManuales()
  return { default: remoto || [] }
}

function PlaceholderView({ name }) {
  return (
    <>
      <header className="topbar">
        <div className="topbar-title">{name}</div>
      </header>
      <main className="page-content">
        <div className="loading-state" style={{ color: '#94a3b8' }}>
          <span style={{ fontSize: 40 }}>🚧</span>
          <span>Vista "{name}" — próximamente</span>
        </div>
      </main>
    </>
  )
}

function PublicOnboardingPage() {
  return (
    <div className="app-layout app-layout-public">
      <div className="main-content main-content-public">
        <Onboarding />
      </div>
    </div>
  )
}

// Pantalla a pantalla completa mientras se resuelve si hay sesión, para no
// mostrar un parpadeo del login ni del panel antes de tiempo.
function LoadingScreen() {
  return <div className="loading-state" style={{ minHeight: '100vh' }}>Cargando…</div>
}

// Se muestra si hay sesión pero la cuenta no tiene un rol reconocido
// asignado todavía (p. ej. justo después de crear la cuenta, antes de
// correr el SQL que le da rol).
function SinRolAsignado({ email, onLogout }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 20, textAlign: 'center' }}>
      <span style={{ fontSize: 40 }}>🔒</span>
      <p>Tu cuenta ({email}) todavía no tiene un rol asignado en el panel.</p>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>Pídele a Raúl que te asigne un rol para poder entrar.</p>
      <button type="button" className="secondary-action" onClick={onLogout}>Cerrar sesión</button>
    </div>
  )
}

function InternalApp({ session, rol, onLogout }) {
  const seccionesPermitidas = seccionesDelRol(rol)
  const [activeView, setActiveView] = useState(seccionesPermitidas[0] || 'dashboard')
  const [clientes, setClientes] = useState([])
  const [team, setTeam] = useState([])
  const [ventas, setVentas] = useState([])
  const [seguimientos, setSeguimientos] = useState([])
  const [setting, setSetting] = useState([])
  const [adsKpi, setAdsKpi] = useState([])
  const [adsNotas, setAdsNotas] = useState([])
  const [anuncios, setAnuncios] = useState([])
  const [recontactos, setRecontactos] = useState([])
  const [ingresosPersonales, setIngresosPersonales] = useState([])
  const [gastosPersonales, setGastosPersonales] = useState([])
  const [ingresosEmpresa, setIngresosEmpresa] = useState([])
  const [gastosEmpresa, setGastosEmpresa] = useState([])
  const [reglasRecurrentes, setReglasRecurrentes] = useState([])
  const [tarifasPasarela, setTarifasPasarela] = useState([])
  const [contenidoIdeas, setContenidoIdeas] = useState([])
  const [sops, setSops] = useState([])
  const [contactosSemanales, setContactosSemanales] = useState([])
  const [mensajesEquipo, setMensajesEquipo] = useState([])
  const [valoracionesClientes, setValoracionesClientes] = useState([])
  const [objetivosFase, setObjetivosFase] = useState([])
  const [objetivosClienteFase, setObjetivosClienteFase] = useState([])
  const [revisionesSemanales, setRevisionesSemanales] = useState([])
  const [tareasPersonales, setTareasPersonales] = useState([])
  const [manuales, setManuales] = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      clientesDataPromise(), teamDataPromise(), ventasDataPromise(), seguimientosDataPromise(),
      settingDataPromise(), adsKpiDataPromise(), adsNotasDataPromise(), anunciosDataPromise(),
      recontactosDataPromise(), ingresosPersonalesDataPromise(), gastosPersonalesDataPromise(),
      ingresosEmpresaDataPromise(), gastosEmpresaDataPromise(), contenidoIdeasDataPromise(), sopsDataPromise(),
      contactosSemanalesDataPromise(), mensajesEquipoDataPromise(), valoracionesClientesDataPromise(),
      tareasPersonalesDataPromise(), manualesDataPromise(), objetivosFaseDataPromise(),
      reglasRecurrentesDataPromise(), tarifasPasarelaDataPromise(), objetivosClienteFaseDataPromise(),
      revisionesSemanalesDataPromise(),
    ]).then(async ([c, t, v, s, st, ak, an, anu, rc, ip, gp, ie, ge, ci, so, cs, me, vc, ta, ma, of, rr, tp, ocf, rs]) => {
      if (cancelled) return
      setClientes(c.default)
      setTeam(t.default)
      setVentas(v.default)
      setSeguimientos(s.default)
      setSetting(st.default)
      setAdsKpi(ak.default)
      setAdsNotas(an.default)
      setAnuncios(anu.default)
      setRecontactos(rc.default)
      setContenidoIdeas(ci.default)
      setSops(so.default)
      setContactosSemanales(cs.default)
      setMensajesEquipo(me.default)
      setValoracionesClientes(vc.default)
      setTareasPersonales(ta.default)
      setManuales(ma.default)
      setObjetivosFase(of.default)
      setReglasRecurrentes(rr.default)
      setTarifasPasarela(tp.default)
      setObjetivosClienteFase(ocf.default)
      setRevisionesSemanales(rs.default)

      // Catch-up de gastos/ingresos recurrentes: por cada regla activa,
      // genera (e inserta en Supabase) las filas de los periodos que ya
      // deberían existir y todavía no están — así, si pasan varios meses
      // sin abrir el panel, se rellenan todos de golpe la próxima vez que
      // se entra. Ver utils/recurrenciaHelpers.js.
      const { entradasPendientes } = await import('./utils/recurrenciaHelpers')
      const { insertFinanzaRemote } = await import('./lib/queries/finanzas')
      const entradasPorTabla = {
        ingresos_empresa: ie.default,
        gastos_empresa: ge.default,
        ingresos_personales: ip.default,
        gastos_personales: gp.default,
      }
      const generadasPorTabla = { ingresos_empresa: [], gastos_empresa: [], ingresos_personales: [], gastos_personales: [] }
      ;(rr.default || []).forEach((regla) => {
        const pendientes = entradasPendientes(regla, entradasPorTabla[regla.tabla] || [])
        pendientes.forEach((entrada) => {
          generadasPorTabla[regla.tabla].push(entrada)
          insertFinanzaRemote(regla.tabla, entrada)
        })
      })
      setIngresosEmpresa([...generadasPorTabla.ingresos_empresa, ...ie.default])
      setGastosEmpresa([...generadasPorTabla.gastos_empresa, ...ge.default])
      setIngresosPersonales([...generadasPorTabla.ingresos_personales, ...ip.default])
      setGastosPersonales([...generadasPorTabla.gastos_personales, ...gp.default])

      setDataLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  // A diferencia de antes, InternalApp ya no se monta hasta que App()
  // confirma que hay sesión (ver más abajo), así que el efecto de carga de
  // arriba ya corre con la sesión activa en el cliente de Supabase — no
  // hace falta un segundo efecto que vuelva a pedir las tablas de Finanzas
  // al iniciar sesión, porque nunca se piden "sin sesión todavía".

  const irVistaPermitida = (id) => {
    if (seccionesPermitidas.includes(id)) setActiveView(id)
  }

  const renderView = () => {
    // Defensa por si activeView quedara en una sección no permitida para
    // este rol (cambio de cuenta, rol reasignado, etc.): se cae a la
    // primera sección que sí tenga permitida.
    const vista = seccionesPermitidas.includes(activeView) ? activeView : (seccionesPermitidas[0] || null)
    switch (vista) {
      case 'dashboard':    return <Dashboard clientes={clientes} ventas={ventas} recontactos={recontactos} ingresosEmpresa={ingresosEmpresa} tareasPersonales={tareasPersonales} contenidoIdeas={contenidoIdeas} />
      case 'ventas':       return <Ventas ventas={ventas} setVentas={setVentas} team={team} setClientes={setClientes} setting={setting} setSetting={setSetting} adsKpi={adsKpi} setAdsKpi={setAdsKpi} adsNotas={adsNotas} setAdsNotas={setAdsNotas} anuncios={anuncios} setAnuncios={setAnuncios} recontactos={recontactos} setRecontactos={setRecontactos} />
      case 'clientes':     return <ClientesAdmin clientes={clientes} setClientes={setClientes} team={team} seguimientos={seguimientos} setSeguimientos={setSeguimientos} valoraciones={valoracionesClientes} setValoraciones={setValoracionesClientes} ingresosEmpresa={ingresosEmpresa} setIngresosEmpresa={setIngresosEmpresa} gastosEmpresa={gastosEmpresa} setGastosEmpresa={setGastosEmpresa} tarifasPasarela={tarifasPasarela} objetivosClienteFase={objetivosClienteFase} setObjetivosClienteFase={setObjetivosClienteFase} revisionesSemanales={revisionesSemanales} setRevisionesSemanales={setRevisionesSemanales} miEmail={session?.user?.email} />
      case 'clientes-equipo': return <ClientesEquipo clientes={clientes} team={team} miEmail={session?.user?.email} rol={rol} seguimientos={seguimientos} setSeguimientos={setSeguimientos} valoraciones={valoracionesClientes} setValoraciones={setValoracionesClientes} objetivosClienteFase={objetivosClienteFase} setObjetivosClienteFase={setObjetivosClienteFase} revisionesSemanales={revisionesSemanales} setRevisionesSemanales={setRevisionesSemanales} />
      case 'equipo':       return <Equipo team={team} setTeam={setTeam} clientes={clientes} ventas={ventas} seguimientos={seguimientos} setSeguimientos={setSeguimientos} gastosEmpresa={gastosEmpresa} setGastosEmpresa={setGastosEmpresa} contactosSemanales={contactosSemanales} setContactosSemanales={setContactosSemanales} />
      case 'mi-ficha':     return <MiFicha team={team} clientes={clientes} seguimientos={seguimientos} setSeguimientos={setSeguimientos} contactosSemanales={contactosSemanales} setContactosSemanales={setContactosSemanales} gastosEmpresa={gastosEmpresa} tareas={tareasPersonales} miEmail={session?.user?.email} />
      case 'comunicacion': return <MuroEquipo mensajes={mensajesEquipo} setMensajes={setMensajesEquipo} team={team} miEmail={session?.user?.email} rol={rol} />
      // Finanzas: datos personales de Raúl + datos de empresa (alimentados
      // automáticamente desde Ventas/Clientes/Equipo). Solo 'admin' tiene
      // 'finanzas' en sus secciones permitidas (ver SECCIONES_POR_ROL en
      // lib/auth.js), así que si se llega aquí es porque isAdmin ya es
      // true — la protección real de los datos vive en las políticas RLS.
      case 'finanzas':     return (
        <Finanzas
          ingresosPersonales={ingresosPersonales} setIngresosPersonales={setIngresosPersonales}
          gastosPersonales={gastosPersonales} setGastosPersonales={setGastosPersonales}
          ingresosEmpresa={ingresosEmpresa} setIngresosEmpresa={setIngresosEmpresa}
          gastosEmpresa={gastosEmpresa} setGastosEmpresa={setGastosEmpresa}
          reglasRecurrentes={reglasRecurrentes} setReglasRecurrentes={setReglasRecurrentes}
          tarifasPasarela={tarifasPasarela} setTarifasPasarela={setTarifasPasarela}
        />
      )
      case 'onboarding':   return <Onboarding />
      case 'operaciones':  return <Operaciones contenidoIdeas={contenidoIdeas} setContenidoIdeas={setContenidoIdeas} team={team} sops={sops} setSops={setSops} miEmail={session?.user?.email} rol={rol} />
      case 'tareas':       return <MisTareas tareas={tareasPersonales} setTareas={setTareasPersonales} miEmail={session?.user?.email} />
      case 'manuales':     return <Manuales manuales={manuales} setManuales={setManuales} rol={rol} />
      default:             return null
    }
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        onNavigate={irVistaPermitida}
        seccionesPermitidas={seccionesPermitidas}
        rol={rol}
        email={session?.user?.email}
        onLogout={onLogout}
      />
      <div className="main-content">
        {renderView()}
      </div>
    </div>
  )
}

// Puerta de acceso al panel interno: exige sesión iniciada y un rol
// reconocido antes de montar InternalApp. Vive separada de App() para no
// disparar ninguna comprobación de sesión en la ruta pública /onboarding,
// que no debe depender en nada del login del equipo.
function AuthGate() {
  const [session, setSession] = useState(null)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    getSession().then((s) => { setSession(s); setSessionChecked(true) })
    const unsubscribe = onAuthChange((s) => { setSession(s); setSessionChecked(true) })
    return unsubscribe
  }, [])

  if (!sessionChecked) return <LoadingScreen />
  if (!session) return <PanelLogin />

  const rol = getRole(session)
  if (!rol) return <SinRolAsignado email={session.user?.email} onLogout={signOut} />

  return (
    <Suspense fallback={<div className="loading-state">Cargando…</div>}>
      <InternalApp session={session} rol={rol} onLogout={signOut} />
    </Suspense>
  )
}

export default function App() {
  if (isPublicRoute) {
    // Ruta pública: /onboarding. Sin Sidebar, sin login, sin datos de
    // clientes cargados — no forma parte del panel interno del equipo.
    return (
      <Suspense fallback={null}>
        <PublicOnboardingPage />
      </Suspense>
    )
  }

  return <AuthGate />
}
