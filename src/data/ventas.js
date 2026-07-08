// Pipeline de ventas: cada "lead" es una persona en proceso comercial,
// antes de convertirse en cliente (ver Clientes.jsx).
//
// Etapas: agendada -> realizada -> seguimiento -> ganada / perdida

const ventas = [
  {
    id: 'lead-1',
    nombre: 'Marina Puig',
    telefono: '+34 611 222 333',
    email: 'marina.puig@example.com',
    closer: 'Daniel Soto',
    interes: 'HIGH TICKET',
    fechaAgenda: '2026-07-01',
    horaAgenda: '17:30',
    preLlamada: { whatsapp: true, prellamada: true, recordatorio: true },
    resultadoLlamada: 'realizada',
    compraEnLlamada: false,
    etapa: 'seguimiento',
    objeciones: [
      { fecha: '2026-07-01', texto: 'Le preocupa el precio, quiere comparar con otras opciones.' },
    ],
    seguimiento: { realizado: true, contesta: null, compraTrasSeguimiento: null },
    notasSeguimiento: [
      { fecha: '2026-07-02', nota: 'Le mandé el PDF de resultados de otros clientes.' },
    ],
    creadoEn: '2026-06-28',
  },
  {
    id: 'lead-2',
    nombre: 'Adrián Nogales',
    telefono: '+34 622 333 444',
    email: 'adrian.nogales@example.com',
    closer: 'Daniel Soto',
    interes: 'LOW TICKET',
    fechaAgenda: '2026-07-09',
    horaAgenda: '10:00',
    preLlamada: { whatsapp: true, prellamada: false, recordatorio: false },
    resultadoLlamada: null,
    compraEnLlamada: null,
    etapa: 'agendada',
    objeciones: [],
    seguimiento: { realizado: false, contesta: null, compraTrasSeguimiento: null },
    notasSeguimiento: [],
    creadoEn: '2026-07-03',
  },
  {
    id: 'lead-3',
    nombre: 'Sonia Bravo',
    telefono: '+34 633 444 555',
    email: 'sonia.bravo@example.com',
    closer: 'Daniel Soto',
    interes: 'HIGH TICKET',
    fechaAgenda: '2026-07-05',
    horaAgenda: '19:00',
    preLlamada: { whatsapp: true, prellamada: true, recordatorio: true },
    resultadoLlamada: 'realizada',
    compraEnLlamada: null,
    etapa: 'realizada',
    objeciones: [
      { fecha: '2026-07-05', texto: 'No está segura de tener tiempo para entrenar.' },
    ],
    seguimiento: { realizado: false, contesta: null, compraTrasSeguimiento: null },
    notasSeguimiento: [],
    creadoEn: '2026-07-01',
  },
]

export default ventas
