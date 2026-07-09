// Contacto semanal con clientes (equipo técnico).
// Se contacta con cada cliente 3 veces por semana:
//   - inicio: lunes — cómo ha ido el fin de semana / cómo empezamos la semana
//   - mitad:  miércoles o jueves — cómo va la semana
//   - fin:    viernes o sábado — cómo ha ido la semana, qué queda pendiente, buen finde
//
// Un registro por cliente + semana (lunes ISO de esa semana, ver utils/seguimientoHelpers).
// { clienteNombre, semana: 'YYYY-MM-DD' (lunes), inicio: {hecho, fecha}, mitad: {hecho, fecha}, fin: {hecho, fecha} }
const contactosSemanales = []

export default contactosSemanales
