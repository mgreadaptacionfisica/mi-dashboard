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
    setter: 'Sara Vidal',
    etapa: 'seguimiento',
    interes: 'HIGH TICKET',
    fechaLlamada: '2026-07-01',
    objeciones: [
      { fecha: '2026-07-01', texto: 'Le preocupa el precio, quiere comparar con otras opciones.' },
    ],
    seguimientos: [
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
    setter: 'Sara Vidal',
    etapa: 'agendada',
    interes: 'LOW TICKET',
    fechaLlamada: '2026-07-09',
    objeciones: [],
    seguimientos: [],
    creadoEn: '2026-07-03',
  },
  {
    id: 'lead-3',
    nombre: 'Sonia Bravo',
    telefono: '+34 633 444 555',
    email: 'sonia.bravo@example.com',
    closer: 'Daniel Soto',
    setter: '',
    etapa: 'realizada',
    interes: 'HIGH TICKET',
    fechaLlamada: '2026-07-05',
    objeciones: [
      { fecha: '2026-07-05', texto: 'No está segura de tener tiempo para entrenar.' },
    ],
    seguimientos: [],
    creadoEn: '2026-07-01',
  },
]

export default ventas
