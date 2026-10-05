// Configuración de marca y contenidos.
// Todo lo que cambia de un cliente a otro vive aquí: nombre, textos, estancias,
// puntos de interés, contacto y paleta. La escena 3D lee solo `palette` y `scene`.

export const brand = {
  name: 'SILVA',
  descriptor: 'Refugio entre bosque, piedra y agua',
  locationLabel: 'Un valle de montaña · concepto',
  coordinates: '42°N · 1 140 m',
  lang: 'es',

  // Contacto operativo sin servidor: se prepara un correo en la aplicación del visitante.
  // Sustituir por la dirección real del cliente antes de publicar.
  contact: {
    email: 'hola@silva.example',
    subject: 'Solicitud de información — SILVA',
    responseNote: 'Esta versión no envía datos a ningún servidor: prepara el correo en tu aplicación y tú decides enviarlo.',
  },

  palette: {
    ink: '#14110e',
    bone: '#f2ebe0',
    stone: '#cdbba0',
    oak: '#3b2a1e',
    forest: '#1f2a22',
    ember: '#e39a57',
  },

  chapters: [
    {
      id: 'descubrimiento',
      numeral: 'I',
      label: 'El descubrimiento',
      eyebrow: 'Llegada · bosque de hayas y pinos',
      title: ['Un refugio', 'que se descubre'],
      body: 'Entre los troncos aparece primero una línea de piedra. Después, la luz que sale de dentro.',
      note: 'Cota de llegada 1 140 m',
    },
    {
      id: 'umbral',
      numeral: 'II',
      label: 'El umbral',
      eyebrow: 'Pasaje cubierto · patio de agua',
      title: ['Cuatro metros', 'de sombra'],
      body: 'Un pasaje estrecho de madera comprime el paso. Al salir, el patio abre el cielo sobre una lámina de agua quieta.',
      note: 'Patio 24 × 18 m · estanque 6 × 12 m',
    },
    {
      id: 'estancia',
      numeral: 'III',
      label: 'La estancia',
      eyebrow: 'Suite Bosque · interior',
      title: ['Roble, lino', 'y piedra caliza'],
      body: 'Materiales que envejecen bien y piden ser tocados. Selecciona los puntos señalados para conocer cada pieza.',
      note: 'Toca o enfoca los puntos para ver el detalle',
    },
    {
      id: 'apertura',
      numeral: 'IV',
      label: 'La apertura',
      eyebrow: 'Ventanal corredizo · terraza',
      title: ['La pared', 'se aparta'],
      body: 'Catorce metros de vidrio. La hoja central se desliza y el paisaje entra en la habitación.',
      note: 'Ventanal 14 × 2,9 m',
    },
    {
      id: 'llegada',
      numeral: 'V',
      label: 'La llegada',
      eyebrow: 'Mirador sobre el lago · atardecer',
      title: ['El día termina', 'sobre el agua'],
      body: 'Un muelle de madera prolonga la terraza hasta el lago. Aquí no hay nada que hacer, y ese es el plan.',
      note: 'Muelle 12 m · lámina de agua a −0,9 m',
    },
  ],

  // Puntos de interés de la suite. `position` en coordenadas de escena; `view` es la
  // perspectiva adicional que adopta la cámara al abrir el detalle.
  hotspots: [
    {
      id: 'lino',
      label: 'Ropa de cama de lino lavado',
      kind: 'Material',
      position: [4.75, 0.88, -10.3],
      view: { pos: [2.6, 1.35, -12.4], look: [4.9, 0.55, -9.9], fov: 34 },
      body: 'Lino europeo lavado a la piedra, en tonos crudos sin blanquear. Fresco en verano, cálido al tacto en invierno.',
      specs: [['Fibra', 'Lino 100 %'], ['Acabado', 'Lavado a la piedra'], ['Cuidado', 'Cambio diario bajo petición']],
    },
    {
      id: 'roble',
      label: 'Cabecero de roble ahumado',
      kind: 'Material',
      position: [4.75, 1.45, -8.65],
      view: { pos: [3.2, 1.6, -11.6], look: [4.9, 1.2, -8.6], fov: 36 },
      body: 'Listones macizos de roble con tratamiento de ahumado y aceite natural. La veta se lee con la luz rasante de la tarde.',
      specs: [['Madera', 'Roble macizo'], ['Acabado', 'Ahumado + aceite'], ['Origen', 'Por definir con el cliente']],
    },
    {
      id: 'banera',
      label: 'Bañera exenta de piedra',
      kind: 'Estancia',
      position: [5.5, 0.75, -16.4],
      view: { pos: [2.4, 1.7, -14.2], look: [5.6, 0.45, -16.8], fov: 38 },
      body: 'Bañera tallada de una pieza junto al ventanal, orientada al lago. El agua se ve desde el agua.',
      specs: [['Material', 'Piedra caliza pulida'], ['Vista', 'Lago y poniente'], ['Capacidad', '2 personas']],
    },
    {
      id: 'lampara',
      label: 'Lámparas de papel y latón',
      kind: 'Luz',
      position: [3.2, 1.38, -9.15],
      view: { pos: [1.9, 1.55, -11.2], look: [3.3, 1.3, -9.2], fov: 32 },
      body: 'Luz cálida y baja a 2 400 K, a la altura de la mano. La habitación de noche se ilumina por puntos, nunca desde el techo.',
      specs: [['Temperatura', '2 400 K'], ['Pantalla', 'Papel washi'], ['Control', 'Regulable junto a la cama']],
    },
    {
      id: 'ceramica',
      label: 'Cerámica de taller local',
      kind: 'Objeto',
      position: [-9.2, 1.18, -12.2],
      view: { pos: [-6.7, 1.5, -12.9], look: [-9.2, 1.0, -12.15], fov: 34 },
      body: 'Piezas torneadas a mano con esmaltes de ceniza. Cada estancia tiene una colección distinta que el huésped puede adquirir.',
      specs: [['Técnica', 'Torno y esmalte de ceniza'], ['Piezas', 'Únicas'], ['Proveedor', 'Taller por definir']],
    },
  ],

  // Conceptos de estancia. No son inventario real ni tienen disponibilidad.
  rooms: [
    {
      id: 'suite-bosque',
      name: 'Suite Bosque',
      size: '68 m² · 2 personas',
      image: 'renders/estancia.webp',
      alt: 'Interior de la Suite Bosque con cama de lino frente al ventanal y luz de atardecer sobre el suelo de roble',
      summary: 'La estancia del recorrido: cama orientada al lago, bañera de piedra junto al ventanal y terraza propia.',
      features: ['Ventanal corredizo de 14 m', 'Bañera exenta de piedra', 'Terraza de madera sobre el lago'],
    },
    {
      id: 'suite-agua',
      name: 'Suite Agua',
      size: '54 m² · 2 personas',
      image: 'renders/llegada.webp',
      alt: 'Muelle de madera sobre el lago al atardecer con las montañas al fondo',
      summary: 'Al nivel del lago, con acceso directo al muelle y baño al aire libre en temporada.',
      features: ['Acceso directo al muelle', 'Ducha exterior', 'Chimenea de leña'],
    },
    {
      id: 'estudio-piedra',
      name: 'Estudio Piedra',
      size: '42 m² · 1–2 personas',
      image: 'renders/umbral.webp',
      alt: 'Patio de piedra con estanque y el pasaje de madera al fondo',
      summary: 'Abierto al patio de agua. Pensado para estancias largas, lectura y trabajo tranquilo.',
      features: ['Mesa de trabajo de roble', 'Vista al patio', 'Biblioteca de la casa'],
    },
  ],
};
