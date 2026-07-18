// Objetivos por fase de CADA CLIENTE (ver supabase-sql/43_objetivos_cliente_fase.sql).
// Fallback estático por si Supabase no responde. Vacío a propósito: no hay
// plantilla compartida — cada cliente empieza sin objetivos y el
// técnico/admin los va escribiendo en "Fases y objetivos".
//
// { id, clienteNombre, fase: 1|2|3|4, texto: '', cumplido: boolean, cumplidoEn: 'YYYY-MM-DD'|null, orden: number, creadoEn }
const objetivosClienteFase = []

export default objetivosClienteFase
