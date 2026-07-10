import { Suspense, lazy, useEffect, useState } from 'react'
import Onboarding from './components/Onboarding'
import AdminLogin from './components/AdminLogin'
import { getSession, onAuthChange, signOut } from './lib/auth'

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
const Clientes = lazy(() => import('./components/Clientes'))
const Equipo = lazy(() => import('./components/Equipo'))
const Ventas = lazy(() => import('./components/Ventas'))
const Finanzas = lazy(() => import('./components/Finanzas'))
const Operaciones = lazy(() => import('./components/Operaciones'))
const MuroEquipo = lazy(() => import('./components/MuroEquipo'))
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

function InternalApp() {
  const [activeView, setActiveView] = useState('dashboard')
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
  const [contenidoIdeas, setContenidoIdeas] = useState([])
  const [sops, setSops] = useState([])
  const [contactosSemanales, setContactosSemanales] = useState([])
  const [mensajesEquipo, setMensajesEquipo] = useState([])
  const [valoracionesClientes, setValoracionesClientes] = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)

  // Acceso admin: por ahora solo Raúl tiene cuenta. El resto del equipo
  // sigue usando el panel sin login; esto solo desbloquea Finanzas.
  const [session, setSession] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const isAdmin = !!session

  useEffect(() => {
    getSession().then(setSession)
    const unsubscribe = onAuthChange(setSession)
    return unsubscribe
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      clientesDataPromise(), teamDataPromise(), ventasDataPromise(), seguimientosDataPromise(),
      settingDataPromise(), adsKpiDataPromise(), adsNotasDataPromise(), anunciosDataPromise(),
      recontactosDataPromise(), ingresosPersonalesDataPromise(), gastosPersonalesDataPromise(),
      ingresosEmpresaDataPromise(), gastosEmpresaDataPromise(), contenidoIdeasDataPromise(), sopsDataPromise(),
      contactosSemanalesDataPromise(), mensajesEquipoDataPromise(), valoracionesClientesDataPromise(),
    ]).then(([c, t, v, s, st, ak, an, anu, rc, ip, gp, ie, ge, ci, so, cs, me, vc]) => {
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
      setIngresosPersonales(ip.default)
      setGastosPersonales(gp.default)
      setIngresosEmpresa(ie.default)
      setGastosEmpresa(ge.default)
      setContenidoIdeas(ci.default)
      setSops(so.default)
      setContactosSemanales(cs.default)
      setMensajesEquipo(me.default)
      setValoracionesClientes(vc.default)
      setDataLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  // Las 4 tablas de Finanzas se cargan también en el efecto de arriba, pero
  // ese efecto corre una sola vez al montar la app — normalmente antes de
  // que getSession() resuelva si hay sesión admin o no. Como ingresos_
  // empresa/ingresos_personales/gastos_personales exigen sesión (RLS), esa
  // primera carga (sin sesión todavía) devuelve vacío y se queda así. Este
  // efecto vuelve a pedir esas 4 tablas en cuanto isAdmin pasa a true, para
  // que al iniciar sesión aparezcan los datos reales en vez de verse "vacíos".
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    Promise.all([
      ingresosPersonalesDataPromise(), gastosPersonalesDataPromise(),
      ingresosEmpresaDataPromise(), gastosEmpresaDataPromise(),
    ]).then(([ip, gp, ie, ge]) => {
      if (cancelled) return
      setIngresosPersonales(ip.default)
      setGastosPersonales(gp.default)
      setIngresosEmpresa(ie.default)
      setGastosEmpresa(ge.default)
    })
    return () => { cancelled = true }
  }, [isAdmin])

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':    return <Dashboard clientes={clientes} ventas={ventas} recontactos={recontactos} />
      case 'ventas':       return <Ventas ventas={ventas} setVentas={setVentas} team={team} setClientes={setClientes} setting={setting} setSetting={setSetting} adsKpi={adsKpi} setAdsKpi={setAdsKpi} adsNotas={adsNotas} setAdsNotas={setAdsNotas} anuncios={anuncios} setAnuncios={setAnuncios} recontactos={recontactos} setRecontactos={setRecontactos} />
      case 'clientes':     return <Clientes clientes={clientes} setClientes={setClientes} team={team} seguimientos={seguimientos} setSeguimientos={setSeguimientos} valoraciones={valoracionesClientes} setValoraciones={setValoracionesClientes} ingresosEmpresa={ingresosEmpresa} setIngresosEmpresa={setIngresosEmpresa} />
      case 'equipo':       return <Equipo team={team} setTeam={setTeam} clientes={clientes} ventas={ventas} seguimientos={seguimientos} setSeguimientos={setSeguimientos} gastosEmpresa={gastosEmpresa} setGastosEmpresa={setGastosEmpresa} contactosSemanales={contactosSemanales} setContactosSemanales={setContactosSemanales} />
      case 'comunicacion': return <MuroEquipo mensajes={mensajesEquipo} setMensajes={setMensajesEquipo} team={team} />
      // Finanzas: datos personales de Raúl + datos de empresa (alimentados
      // automáticamente desde Ventas/Clientes/Equipo). Aunque el sidebar ya
      // la oculta sin sesión admin, se protege también aquí por si
      // activeView llegara a valer 'finanzas' sin sesión (defensa en
      // profundidad; la protección real vive en las políticas RLS).
      case 'finanzas':     return isAdmin
        ? <Finanzas
            ingresosPersonales={ingresosPersonales} setIngresosPersonales={setIngresosPersonales}
            gastosPersonales={gastosPersonales} setGastosPersonales={setGastosPersonales}
            ingresosEmpresa={ingresosEmpresa} setIngresosEmpresa={setIngresosEmpresa}
            gastosEmpresa={gastosEmpresa} setGastosEmpresa={setGastosEmpresa}
          />
        : <Dashboard clientes={clientes} ventas={ventas} recontactos={recontactos} />
      case 'onboarding':   return <Onboarding />
      case 'operaciones':  return <Operaciones contenidoIdeas={contenidoIdeas} setContenidoIdeas={setContenidoIdeas} team={team} sops={sops} setSops={setSops} />
      default:             return <Dashboard />
    }
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        isAdmin={isAdmin}
        onLoginClick={() => setShowLogin(true)}
        onLogout={() => { signOut(); setActiveView('dashboard') }}
      />
      <div className="main-content">
        {renderView()}
      </div>
      {showLogin && (
        <AdminLogin
          onClose={() => setShowLogin(false)}
          onSuccess={() => setShowLogin(false)}
        />
      )}
    </div>
  )
}

export default function App() {
  if (isPublicRoute) {
    // Ruta pública: /onboarding. Sin Sidebar, sin datos de clientes cargados.
    return (
      <Suspense fallback={null}>
        <PublicOnboardingPage />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div className="loading-state">Cargando…</div>}>
      <InternalApp />
    </Suspense>
  )
}
