import { Suspense, lazy, useEffect, useState } from 'react'
import Onboarding from './components/Onboarding'

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
const clientesDataPromise = () => import('./data/clientes')
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
const seguimientosDataPromise = () => import('./data/seguimientos')
const settingDataPromise = () => import('./data/setting')
const adsKpiDataPromise = () => import('./data/adsKpi')
const adsNotasDataPromise = () => import('./data/adsNotasMensuales')
const anunciosDataPromise = () => import('./data/anuncios')
const recontactosDataPromise = () => import('./data/recontactos')
const ingresosPersonalesDataPromise = () => import('./data/ingresosPersonales')
const gastosPersonalesDataPromise = () => import('./data/gastosPersonales')
const gastosProfesionalesDataPromise = () => import('./data/gastosProfesionales')
const contenidoIdeasDataPromise = () => import('./data/contenidoIdeas')
const contactosSemanalesDataPromise = () => import('./data/contactosSemanales')
const valoracionesClientesDataPromise = () => import('./data/valoracionesClientes')

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
  const [gastosProfesionales, setGastosProfesionales] = useState([])
  const [contenidoIdeas, setContenidoIdeas] = useState([])
  const [sops, setSops] = useState([])
  const [contactosSemanales, setContactosSemanales] = useState([])
  const [mensajesEquipo, setMensajesEquipo] = useState([])
  const [valoracionesClientes, setValoracionesClientes] = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      clientesDataPromise(), teamDataPromise(), ventasDataPromise(), seguimientosDataPromise(),
      settingDataPromise(), adsKpiDataPromise(), adsNotasDataPromise(), anunciosDataPromise(),
      recontactosDataPromise(), ingresosPersonalesDataPromise(), gastosPersonalesDataPromise(),
      gastosProfesionalesDataPromise(), contenidoIdeasDataPromise(), sopsDataPromise(),
      contactosSemanalesDataPromise(), mensajesEquipoDataPromise(), valoracionesClientesDataPromise(),
    ]).then(([c, t, v, s, st, ak, an, anu, rc, ip, gp, gpr, ci, so, cs, me, vc]) => {
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
      setGastosProfesionales(gpr.default)
      setContenidoIdeas(ci.default)
      setSops(so.default)
      setContactosSemanales(cs.default)
      setMensajesEquipo(me.default)
      setValoracionesClientes(vc.default)
      setDataLoaded(true)
    })
    return () => { cancelled = true }
  }, [])

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':    return <Dashboard clientes={clientes} ventas={ventas} recontactos={recontactos} />
      case 'ventas':       return <Ventas ventas={ventas} setVentas={setVentas} team={team} setClientes={setClientes} setting={setting} setSetting={setSetting} adsKpi={adsKpi} setAdsKpi={setAdsKpi} adsNotas={adsNotas} setAdsNotas={setAdsNotas} anuncios={anuncios} setAnuncios={setAnuncios} recontactos={recontactos} setRecontactos={setRecontactos} />
      case 'clientes':     return <Clientes clientes={clientes} setClientes={setClientes} team={team} seguimientos={seguimientos} setSeguimientos={setSeguimientos} valoraciones={valoracionesClientes} setValoraciones={setValoracionesClientes} ingresosPersonales={ingresosPersonales} setIngresosPersonales={setIngresosPersonales} />
      case 'equipo':       return <Equipo team={team} setTeam={setTeam} clientes={clientes} ventas={ventas} seguimientos={seguimientos} setSeguimientos={setSeguimientos} gastosProfesionales={gastosProfesionales} setGastosProfesionales={setGastosProfesionales} contactosSemanales={contactosSemanales} setContactosSemanales={setContactosSemanales} />
      case 'comunicacion': return <MuroEquipo mensajes={mensajesEquipo} setMensajes={setMensajesEquipo} team={team} />
      case 'finanzas':     return <Finanzas ingresosPersonales={ingresosPersonales} setIngresosPersonales={setIngresosPersonales} gastosPersonales={gastosPersonales} setGastosPersonales={setGastosPersonales} gastosProfesionales={gastosProfesionales} setGastosProfesionales={setGastosProfesionales} />
      case 'onboarding':   return <Onboarding />
      case 'operaciones':  return <Operaciones contenidoIdeas={contenidoIdeas} setContenidoIdeas={setContenidoIdeas} team={team} sops={sops} setSops={setSops} />
      default:             return <Dashboard />
    }
  }

  return (
    <div className="app-layout">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <div className="main-content">
        {renderView()}
      </div>
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
