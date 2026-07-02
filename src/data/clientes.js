const CSV = `Nombre,Drive,Email,Estado del cliente,Fecha fin,Fecha inicio,Fecha primer pago,Fecha segundo pago,Fecha tercer pago,Forma de pago,Pago,Primer pago,Renueva,Segundo pago,Servicio contratado,Teléfono,Tercer pago,Tipo de cliente
Juan Daniel Febles Choc,,,ACTIVO,7 de junio de 2026,9 de marzo de 2026,,,,Stripe,COMPLETO,,No,,Trimestral,,,HIGH TICKET
Eva Galobardes,,,ACTIVO,5 de julio de 2026,16 de marzo de 2026,,,,Stripe,COMPLETO,,No,,Trimestral,,,HIGH TICKET
Facundo Recalde,,,NO ACTIVO,12 de abril de 2026,9 de marzo de 2026,,,,Stripe,COMPLETO,,No,,Mensual,,,LOW TICKET
Carlos Sotos,,,NO ACTIVO,12 de abril de 2026,9 de marzo de 2026,,,,Bizum,COMPLETO,,No,,Mensual,,,LOW TICKET
David Gandia,,,NO ACTIVO,12 de abril de 2026,9 de marzo de 2026,,,,Bizum,COMPLETO,,No,,Mensual,,,LOW TICKET
Marcos Cano García,,,ACTIVO,31 de mayo de 2026,1 de marzo de 2026,,,,Bizum,COMPLETO,,No,,Trimestral,,,LOW TICKET
Roberto Navarro Navares,,,NO ACTIVO,3 de mayo de 2026,1 de abril de 2026,,,,Stripe,COMPLETO,,No,,Mensual,,,LOW TICKET
Jose Manuel Arroyo Pineda,,,ACTIVO,31 de mayo de 2026,1 de marzo de 2026,,,,Stripe,COMPLETO,,No,,Trimestral,,,HIGH TICKET
Jesus Gómez,,,ACTIVO,31 de mayo de 2026,1 de marzo de 2026,,,,Stripe,COMPLETO,,No,,Trimestral,,,HIGH TICKET
Jorge Garnica,,,ACTIVO,31 de mayo de 2026,1 de marzo de 2026,,,,Bizum,COMPLETO,,No,,Trimestral,,,LOW TICKET
Eva María Cascante Martínez,,,ACTIVO,31 de mayo de 2026,1 de febrero de 2026,,,,Bizum,2 PLAZOS,,No,,Trimestral,,,HIGH TICKET
Jessica Pizarro,,,NO ACTIVO,31 de mayo de 2026,1 de marzo de 2026,,,,Transferencia,COMPLETO,,No,,Trimestral,,,HIGH TICKET
Jose Vicente Muñoz,,,NO ACTIVO,31 de mayo de 2026,1 de marzo de 2026,,,,Stripe,COMPLETO,,No,,Trimestral,,,HIGH TICKET
Banta Tunkara,,,ACTIVO,31 de mayo de 2026,1 de marzo de 2026,,,,Bizum,COMPLETO,,No,,Trimestral,,,LOW TICKET
Antonio Baca,,,NO ACTIVO,31 de marzo de 2026,1 de marzo de 2026,,,,Bizum,COMPLETO,,No,,Mensual,,,LOW TICKET
Maria jesus García Ortíz,,,ACTIVO,31 de mayo de 2026,1 de marzo de 2026,,,,Stripe,COMPLETO,,No,,Trimestral,,,HIGH TICKET
Yeray Santiago Cabrera Ruíz,,,ACTIVO,31 de mayo de 2026,1 de marzo de 2026,,,,Stripe,2 PLAZOS,,No,,Trimestral,,,HIGH TICKET
Alberto Sanz Saiz,,,ACTIVO,3 de mayo de 2026,1 de febrero de 2026,,,,Stripe,COMPLETO,,No,,Trimestral,,,HIGH TICKET
Adrián López Ávila,,,NO ACTIVO,31 de marzo de 2026,1 de marzo de 2026,,,,Stripe,COMPLETO,,No,,Mensual,,,LOW TICKET
Paco Díaz Sáez,,,NO ACTIVO,3 de mayo de 2026,1 de abril de 2026,,,,Stripe,COMPLETO,,No,,Mensual,,,LOW TICKET
Guille Miralles,,,ACTIVO,3 de mayo de 2026,1 de febrero de 2026,,,,Bizum,3 PLAZOS,,No,,Trimestral,,,HIGH TICKET
iker Gómez Adarve,,,ACTIVO,2 de agosto de 2026,1 de mayo de 2026,,,,Transferencia,COMPLETO,199,No,,Trimestral,,,LOW TICKET
Daniel Ortega,,,ACTIVO,3 de mayo de 2026,1 de febrero de 2026,,,,Stripe,2 PLAZOS,,No,,Trimestral,,,HIGH TICKET
Lucas Alsina,,,ACTIVO,3 de mayo de 2026,1 de febrero de 2026,,,,Stripe,2 PLAZOS,,No,,Trimestral,,,HIGH TICKET
Paola Rosas,,,NO ACTIVO,3 de mayo de 2026,1 de febrero de 2026,,,,Transferencia,2 PLAZOS,,No,,Trimestral,,,HIGH TICKET
Greissy García,,,ACTIVO,3 de mayo de 2026,1 de febrero de 2026,,,,Stripe,3 PLAZOS,,No,,Trimestral,,,HIGH TICKET
Jose Antonio LLoret Cortés,,,ACTIVO,5 de julio de 2026,1 de enero de 2026,,,,Bizum,3 PLAZOS,,No,,Trimestral,,,HIGH TICKET
Juan Diego Gómez Mateo,,,NO ACTIVO,5 de abril de 2026,1 de enero de 2026,,,,Stripe,2 PLAZOS,,No,,Trimestral,,,HIGH TICKET
Rubén Rupérez,,,ACTIVO,30 de mayo de 2026,1 de febrero de 2026,,,,Bizum,COMPLETO,,No,,Trimestral,,,HIGH TICKET
Miguel Miranda,,,ACTIVO,19 de abril de 2026,1 de marzo de 2026,,,,Bizum,COMPLETO,,No,,Mensual,,,HIGH TICKET
José Herráiz,,,ACTIVO,31 de diciembre de 2026,1 de enero de 2026,,,,Transferencia,COMPLETO,,No,,Anual,,,HIGH TICKET
Adán González,,,ACTIVO,5 de julio de 2026,1 de enero de 2026,,,,Stripe,COMPLETO,,No,,Semestral,,,HIGH TICKET
Elena Landaburu,,,ACTIVO,31 de diciembre de 2026,1 de enero de 2026,,,,Transferencia,COMPLETO,,No,,Anual,,,HIGH TICKET
Jose Miguel Cabezas Gamonal,,,NO ACTIVO,30 de abril de 2026,1 de abril de 2026,,,,Bizum,COMPLETO,,Yes,,Mensual,,,LOW TICKET
Victor Bustara,,,NO ACTIVO,5 de abril de 2026,,,,,Transferencia,COMPLETO,,No,,Trimestral,,,HIGH TICKET
Leire Cadierno Martín,,,ACTIVO,31 de diciembre de 2026,1 de enero de 2026,,,,Transferencia,COMPLETO,,No,,Anual,,,HIGH TICKET
Ángel Díaz Díaz,,,ACTIVO,31 de diciembre de 2026,1 de enero de 2026,,,,Bizum,3 PLAZOS,,No,,Anual,,,HIGH TICKET
Adrián Cortés,,,ACTIVO,,,,,,Bizum,COMPLETO,,No,,Mensual,,,LOW TICKET
Pascual Miguel Cicoira ,,,ACTIVO,31 de diciembre de 2026,1 de enero de 2026,,,,Stripe,3 PLAZOS,,No,,Anual,,,HIGH TICKET
María Hernández,,,ACTIVO,31 de diciembre de 2026,1 de enero de 2026,,,,Stripe,COMPLETO,,No,,Anual,,,HIGH TICKET
Sidi Mohamed Ajjaji,,sidizek@gmail.com,ACTIVO,4 de julio de 2026,1 de abril de 2026,6 de abril de 2026,,,Transferencia,COMPLETO,597,No,,Trimestral,664121704,,HIGH TICKET
Víctor Fernández Gómez,,victorferngom@gmail.com,ACTIVO,4 de julio de 2026,1 de abril de 2026,6 de abril de 2026,,,Stripe,COMPLETO,597,No,,Trimestral,679047884,,HIGH TICKET
Sandra Galano Roqueta,https://drive.google.com/drive/folders/17GneyxQxK_yp8tao1A5NAyGA82xogP3D?usp=share_link,sandragalano@hotmail.com,ACTIVO,4 de julio de 2026,1 de abril de 2026,31 de marzo de 2026,,,Bizum,2 PLAZOS,300,No,300,Trimestral,616559618,,HIGH TICKET
Maite Secaduras,https://drive.google.com/drive/folders/11_ZUyeJfgHGkUCYWQmX_WbK-184POzHM?usp=share_link,mso25@hotmail.com,ACTIVO,4 de julio de 2026,1 de abril de 2026,1 de abril de 2026,,,Bizum,2 PLAZOS,247,No,,Trimestral,635553336,,HIGH TICKET
David Chaparro Rodríguez,https://drive.google.com/drive/folders/1svVZ0AN2yTKbaKYuwkwLMm46Ar43HjCw?usp=share_link,davidmatinee@gmail.com,ACTIVO,4 de julio de 2026,1 de abril de 2026,31 de marzo de 2026,,,Bizum,3 PLAZOS,250,No,125,Trimestral,607472477,125,HIGH TICKET
Raúl Nieto García,https://drive.google.com/drive/folders/1HPyCFXuqu5yp-gtXwuL-P15MYItFpdDs?usp=share_link,nietograul@gmail.com,ACTIVO,31 de julio de 2026,1 de mayo de 2026,14 de abril de 2026,,,Transferencia,COMPLETO,547,No,,Trimestral,652465969,,HIGH TICKET
Jaime Gabriel Privado López,https://drive.google.com/drive/folders/1B2OGa3zlIF5G_g70YOZXyNZ9s0k1RXQH?usp=share_link,jaimeprivadolopez21@gmail.com,ACTIVO,5 de septiembre de 2026,1 de mayo de 2026,16 de abril de 2026,,,Stripe,COMPLETO,597,No,,Cuatrimestral,711747439,,HIGH TICKET
ALEJANDRO VALENCIA,https://drive.google.com/drive/folders/1vOXa8AK_RL8bWhGprAxSH6IA4UQvAmRh?usp=share_link,jandro.valencia2@gmail.com,ACTIVO,31 de julio de 2026,1 de mayo de 2026,18 de abril de 2026,,,Stripe,COMPLETO,180,No,,Trimestral,652772430,,LOW TICKET
Valentín Bernales,https://drive.google.com/drive/folders/1n-JWmU45ASarZWUlmJ8cfouzAQbROzct?usp=share_link,drbernalesodino@gmail.com,ACTIVO,5 de septiembre de 2026,1 de mayo de 2026,,,,Stripe,2 PLAZOS,60,No,537,Cuatrimestral,692244801,,HIGH TICKET
Chiara Tonoli,https://drive.google.com/drive/folders/1tlLx_CO8Y1Mf0oQ6vSrznfhOZZwT26-t?usp=share_link,chiton2106@gmail.com,ACTIVO,5 de septiembre de 2026,1 de mayo de 2026,,,,Stripe,COMPLETO,180,No,,Trimestral,+393445789690,,LOW TICKET
Celeste Mercado,https://drive.google.com/drive/folders/1TeIe_v7_bdfhTsjy-ZOWoqsUrW0PrkUB?usp=share_link,celestesab@gmail.com,ACTIVO,31 de mayo de 2026,1 de mayo de 2026,28 de abril de 2026,,,Stripe,COMPLETO,79,No,,Mensual,666233067,,LOW TICKET
Pau Espejo Romero,https://drive.google.com/drive/folders/1fIFBYTTiCOr1dSrUjjlZXBx-PssvTLTu?usp=share_link,pespejoromero@gmail.com,ACTIVO,30 de septiembre de 2026,15 de mayo de 2026,7 de mayo de 2026,,,Stripe,COMPLETO,697,No,,Cuatrimestral,684179700,,HIGH TICKET
Alejandro Luque,https://drive.google.com/drive/folders/1i9XNbLI3gsyfWQldcGBjQqvwvZsR71r1?usp=share_link,alexluque270@gmail.com,ACTIVO,3 de octubre de 2026,1 de junio de 2026,,,,Stripe,COMPLETO,597,No,,Cuatrimestral,682645798,,HIGH TICKET
Álvaro González,https://drive.google.com/drive/folders/1Nkzwn3lXNuNRjaotooyt1mlaUzkBmcxc?usp=share_link,alvarogdoello@gmail.com,ACTIVO,29 de agosto de 2026,1 de junio de 2026,,,,Stripe,COMPLETO,497,No,,Trimestral,669941092,,HIGH TICKET
Carmen Ortega,https://drive.google.com/drive/folders/1FtSWVW4omLVpuXvu-e-RkloOzcK43B29?usp=share_link,carmenwejar13@gmail.com,ACTIVO,3 de octubre de 2026,1 de junio de 2026,27 de mayo de 2026,27 de junio de 2026,,Stripe,2 PLAZOS,350,No,350,Cuatrimestral,618395204,,HIGH TICKET`;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i += 1;
      }
      row.push(cell);
      if (row.some(value => value.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some(value => value.trim() !== '')) {
      rows.push(row);
    }
  }

  const [headers, ...dataRows] = rows;
  return dataRows
    .filter(row => row.some(value => value.trim() !== ''))
    .map(row => Object.fromEntries(headers.map((header, index) => [header.trim(), row[index] ?? ''])));
}

const clientes = parseCsv(CSV);

export default clientes;
