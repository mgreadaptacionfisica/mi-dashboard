// Recontactos manuales: personas a las que hay que volver a contactar,
// añadidas a mano (no vienen de un lead del pipeline de Ventas).
//
// Los leads que ya están en la etapa "Seguimiento" del pipeline de Ventas
// aparecen automáticamente en la sección Recontactar (no hace falta
// duplicarlos aquí); sus datos de recontacto se guardan dentro del propio
// lead, en `lead.recontacto`.
//
// Forma de cada registro manual:
// {
//   id: 'recontacto-...',
//   nombre: '',
//   canal: 'WhatsApp',       // 'WhatsApp' | 'Instagram'
//   contacto: '',            // teléfono o usuario de Instagram
//   motivo: '',              // motivo del recontacto
//   fechaContacto: '',       // ISO — fecha en la que hay que contactar
//   contactado: false,
//   respondido: null,        // true | false | null (pendiente)
//   comprado: null,          // true | false | null (pendiente)
// }
const recontactos = []

export default recontactos
