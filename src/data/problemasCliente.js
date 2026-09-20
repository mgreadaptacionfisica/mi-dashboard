// Problemas del cliente y las acciones hechas para resolverlos (ver
// supabase-sql/60_problemas_cliente.sql). Fallback estático vacío: sin
// Supabase no hay ningún problema abierto que enseñar.
//
// { id, clienteNombre, problema, detectadoEn: 'YYYY-MM-DD', detectadoPor,
//   origen: 'sesion'|'manual', origenRef: { semana, dia, sesion } | null,
//   estado: 'abierto'|'resuelto', acciones: [{ texto, fecha, por }],
//   resueltoEn, resueltoPor, resultado }
const problemasCliente = []

export default problemasCliente
