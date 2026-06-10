const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando carga de datos semilla (seed)...');

  // Limpiar base de datos
  await prisma.mensaje.deleteMany();
  await prisma.conversacion.deleteMany();
  await prisma.seguimiento.deleteMany();
  await prisma.notaLead.deleteMany();
  await prisma.cotizacion.deleteMany();
  await prisma.hijo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.respuestaRapida.deleteMany();
  await prisma.documentoConocimiento.deleteMany();

  // 1. Crear Usuarios (Agentes)
  const agentLaura = await prisma.usuario.create({
    data: {
      id: 'agent-laura',
      nombre: 'Laura Méndez',
      email: 'laura@nannysypeques.com',
      contrasenaHash: 'cifrado_seguro_123',
      rol: 'VENTAS',
      estado: 'ACTIVE',
      urlAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    }
  });

  const agentCarlos = await prisma.usuario.create({
    data: {
      id: 'agent-carlos',
      nombre: 'Carlos Ruiz',
      email: 'carlos@nannysypeques.com',
      contrasenaHash: 'cifrado_seguro_123',
      rol: 'VENTAS',
      estado: 'ACTIVE',
      urlAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    }
  });

  const agentAna = await prisma.usuario.create({
    data: {
      id: 'agent-ana',
      nombre: 'Ana Beltrán',
      email: 'ana@nannysypeques.com',
      contrasenaHash: 'cifrado_seguro_123',
      rol: 'VENTAS',
      estado: 'ACTIVE',
      urlAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    }
  });

  console.log('Usuarios creados con éxito.');

  // 2. Crear Leads y Hijos
  const dateToday = new Date();
  const dateYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dateTwoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const dateWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Lead 1: Lucía Mendoza (Inbox)
  const leadLucia = await prisma.lead.create({
    data: {
      id: 'lead-lucia',
      nombreCompleto: 'Lucía Mendoza',
      telefono: '+52 55 1234 5678',
      email: 'lucia.mendoza@email.com',
      ciudad: 'Ciudad de México',
      zona: 'Polanco',
      origen: 'Instagram',
      interesServicio: 'Cuidado Premium Medio Tiempo',
      edadHijo: 3,
      cantidadHijos: 1,
      diasSolicitados: 'Lunes a Viernes',
      horaInicioSolicitada: '09:00',
      horaFinSolicitada: '14:00',
      fechaInicioDeseada: '2026-06-25',
      nivelUrgencia: 'ALTA',
      estado: 'CONTACTADO',
      idUsuarioAsignado: agentLaura.id,
      ultimoContactoEn: dateToday,
      resumenIA: 'Lucía busca una niñera de tiempo completo con experiencia en pedagogía Montessori. Su tono es formal pero urgente debido a un regreso al trabajo presencial en dos semanas.',
      datosFaltantes: JSON.stringify([
        'Edad exacta del segundo hijo',
        'Horario específico de los viernes'
      ]),
      hijos: {
        create: {
          nombre: 'Valentina',
          textoEdad: '3 años',
          necesidades: 'Apoyo en control de esfínteres, juegos de estimulación temprana.',
          instrucciones: 'Alérgica a las nueces. Muy sensible a ruidos fuertes.'
        }
      },
      notas: {
        create: {
          contenido: 'Busca flexibilidad de horario por trabajo remoto. Interesada en programa bilingüe.',
          nombreAgente: 'Laura Méndez'
        }
      },
      seguimientos: {
        create: {
          titulo: 'Llamada de Calificación',
          descripcion: 'Llamar para confirmar disponibilidad de horarios y detalles de cotización',
          fechaVencimiento: new Date(Date.now() + 20 * 60 * 60 * 1000), // Mañana a las 9:30 aprox
          estado: 'PENDIENTE',
        }
      }
    }
  });

  // Lead 2: Roberto Salas (Inbox)
  const leadRoberto = await prisma.lead.create({
    data: {
      id: 'lead-roberto',
      nombreCompleto: 'Roberto Salas',
      telefono: '+52 55 9876 5432',
      email: 'roberto.salas@email.com',
      ciudad: 'Monterrey',
      zona: 'San Pedro',
      origen: 'WhatsApp Directo',
      interesServicio: 'NANNY EVENTUAL',
      edadHijo: 5,
      cantidadHijos: 2,
      estado: 'CONTACTADO',
      idUsuarioAsignado: agentCarlos.id,
      ultimoContactoEn: dateYesterday,
      resumenIA: 'Roberto solicita informes sobre tarifas de fin de semana para dos niños.'
    }
  });

  // Lead 3: Carla Gómez (Inbox)
  const leadCarla = await prisma.lead.create({
    data: {
      id: 'lead-carla',
      nombreCompleto: 'Carla Gómez',
      telefono: '+52 55 1111 2222',
      email: 'carla.gomez@email.com',
      ciudad: 'Guadalajara',
      zona: 'Zapopan',
      origen: 'FB Ads',
      interesServicio: 'Cuidado Fijo',
      edadHijo: 2,
      cantidadHijos: 1,
      estado: 'NUEVO',
      idUsuarioAsignado: agentLaura.id,
      ultimoContactoEn: dateTwoDaysAgo,
      resumenIA: 'Carla quiere agendar una visita guiada para conocer el perfil de las niñeras.'
    }
  });

  // Lead 4: María Almagro (CRM list)
  await prisma.lead.create({
    data: {
      nombreCompleto: 'María Almagro',
      telefono: '+34 612 345 678',
      ciudad: 'Madrid',
      zona: 'Salamanca',
      origen: 'WhatsApp Directo',
      interesServicio: 'FIXA SEMANAL',
      estado: 'NUEVO',
      idUsuarioAsignado: agentLaura.id,
      ultimoContactoEn: dateToday,
      resumenIA: 'Interesada en servicio semanal para un bebé de 8 meses.'
    }
  });

  // Lead 5: Javier Portal (CRM list)
  await prisma.lead.create({
    data: {
      nombreCompleto: 'Javier Portal',
      telefono: '+34 689 123 456',
      ciudad: 'Barcelona',
      zona: 'Sarrià',
      origen: 'Instagram',
      interesServicio: 'NANNY EVENTUAL',
      estado: 'CONTACTADO',
      idUsuarioAsignado: agentCarlos.id,
      ultimoContactoEn: dateYesterday,
      resumenIA: 'Necesita nanny para el próximo sábado por la noche.'
    }
  });

  // Lead 6: Elena Gómez (CRM list - GANADO)
  await prisma.lead.create({
    data: {
      nombreCompleto: 'Elena Gómez',
      telefono: '+34 655 888 222',
      ciudad: 'Valencia',
      zona: 'El Carmen',
      origen: 'FB Ads',
      interesServicio: 'FIXA NOCTURNA',
      estado: 'GANADO',
      idUsuarioAsignado: agentLaura.id,
      ultimoContactoEn: dateTwoDaysAgo,
      resumenIA: 'Cerrado con éxito para servicio fijo nocturno de 22:00 a 06:00.'
    }
  });

  // Lead 7: Sonia Martín (CRM list - PERDIDO)
  await prisma.lead.create({
    data: {
      nombreCompleto: 'Sonia Martín',
      telefono: '+34 622 111 000',
      ciudad: 'Madrid',
      zona: 'Chamartín',
      origen: 'Instagram',
      interesServicio: 'FIXA INTERNA',
      estado: 'PERDIDO',
      idUsuarioAsignado: agentAna.id,
      motivoPerdida: 'Presupuesto elevado',
      ultimoContactoEn: dateWeekAgo,
      resumenIA: 'El cliente consideró que la tarifa mensual de nanny interna superaba su presupuesto.'
    }
  });

  console.log('Leads creados con éxito.');

  // 3. Crear Conversaciones y Mensajes
  
  // Conversación Lucía Mendoza
  const convLucia = await prisma.conversacion.create({
    data: {
      id: 'conv-lucia',
      idLead: 'lead-lucia',
      telefono: '+52 55 1234 5678',
      estado: 'IA_ACTIVA',
      idUsuarioAsignado: agentLaura.id,
      iaActiva: true,
      ultimoMensajeEn: dateToday,
    }
  });

  await prisma.mensaje.createMany({
    data: [
      {
        idConversacion: convLucia.id,
        direccion: 'INBOUND',
        tipoRemitente: 'CLIENT',
        contenido: 'Hola, vi su anuncio en Instagram. Estoy buscando una cuidadora para mi hija de 3 años.',
        creadoEn: new Date(Date.now() - 15 * 60 * 1000), // Hace 15 minutos
      },
      {
        idConversacion: convLucia.id,
        direccion: 'INBOUND',
        tipoRemitente: 'CLIENT',
        contenido: '¿Cuál es el costo mensual por medio tiempo?',
        creadoEn: new Date(Date.now() - 14 * 60 * 1000), // Hace 14 minutos
      },
      {
        idConversacion: convLucia.id,
        direccion: 'OUTBOUND',
        tipoRemitente: 'IA',
        contenido: '¡Hola Lucía! Qué gusto saludarte. Para una pequeña de 3 años, nuestro programa de \'Middle-Day\' es excelente. El costo mensual es de $450 USD. ¿Te gustaría agendar una cita para conocer nuestras instalaciones?',
        creadoEn: new Date(Date.now() - 13 * 60 * 1000), // Hace 13 minutos
      },
      {
        idConversacion: convLucia.id,
        direccion: 'INBOUND',
        tipoRemitente: 'CLIENT',
        contenido: 'Suena bien. ¿Qué incluye el programa?',
        creadoEn: new Date(Date.now() - 10 * 60 * 1000), // Hace 10 minutos
      }
    ]
  });

  // Conversación Roberto Salas
  const convRoberto = await prisma.conversacion.create({
    data: {
      id: 'conv-roberto',
      idLead: 'lead-roberto',
      telefono: '+52 55 9876 5432',
      estado: 'ABIERTA',
      idUsuarioAsignado: agentCarlos.id,
      iaActiva: false,
      ultimoMensajeEn: dateYesterday,
    }
  });

  await prisma.mensaje.createMany({
    data: [
      {
        idConversacion: convRoberto.id,
        direccion: 'INBOUND',
        tipoRemitente: 'CLIENT',
        contenido: 'Hola, buenas tardes. Me interesa el servicio de nanny eventual para este fin de semana.',
        creadoEn: new Date(dateYesterday.getTime() - 60 * 60 * 1000),
      },
      {
        idConversacion: convRoberto.id,
        direccion: 'OUTBOUND',
        tipoRemitente: 'AGENT',
        idRemitente: agentCarlos.id,
        contenido: 'Hola Roberto, con gusto te comparto tarifas. ¿De qué edades son tus niños?',
        creadoEn: new Date(dateYesterday.getTime() - 30 * 60 * 1000),
      },
      {
        idConversacion: convRoberto.id,
        direccion: 'INBOUND',
        tipoRemitente: 'CLIENT',
        contenido: 'Gracias por la información, lo hablo con mi esposa y te confirmo.',
        creadoEn: dateYesterday,
      }
    ]
  });

  // Conversación Carla Gómez
  const convCarla = await prisma.conversacion.create({
    data: {
      id: 'conv-carla',
      idLead: 'lead-carla',
      telefono: '+52 55 1111 2222',
      estado: 'ABIERTA',
      idUsuarioAsignado: agentLaura.id,
      iaActiva: true,
      ultimoMensajeEn: dateTwoDaysAgo,
    }
  });

  await prisma.mensaje.create({
    data: {
      idConversacion: convCarla.id,
      direccion: 'INBOUND',
      tipoRemitente: 'CLIENT',
      contenido: 'Me gustaría agendar una visita guiada.',
      creadoEn: dateTwoDaysAgo,
    }
  });

  console.log('Conversaciones y Mensajes cargados con éxito.');

  // 4. Crear Respuestas Rápidas (QuickReplies)
  await prisma.respuestaRapida.createMany({
    data: [
      {
        titulo: 'Horarios de Cuidado',
        categoria: 'Horarios',
        contenido: 'Nuestros horarios de servicio flexible son de Lunes a Viernes de 07:00 a 19:00. También contamos con servicio nocturno y de fin de semana previa reservación.',
      },
      {
        titulo: 'Tarifas Mensuales',
        categoria: 'Precios',
        contenido: 'El costo promedio de nuestro servicio de cuidado bilingüe es de $450 USD mensuales para medio tiempo (4 hrs diarias) y $800 USD para tiempo completo (8 hrs diarias). Las tarifas de niñeras eventuales son desde $15 USD por hora.',
      },
      {
        titulo: 'Nuestra Ubicación',
        categoria: 'Ubicación',
        contenido: 'Nuestras oficinas centrales de Nannys y Peques se encuentran en Polanco, Ciudad de México, y brindamos servicio en toda la zona metropolitana, Monterrey y Guadalajara.',
      },
      {
        titulo: 'Requisitos de Inicio',
        categoria: 'Requisitos',
        contenido: 'Para iniciar el servicio requerimos: 1) Entrevista de valoración inicial de los peques, 2) Ficha médica básica, 3) Firma de contrato digital de servicios y 4) Pago del primer mes de anticipo.',
      }
    ]
  });

  // 5. Crear Base de Conocimiento (Knowledge Base)
  await prisma.documentoConocimiento.createMany({
    data: [
      {
        titulo: 'Diferencias entre Nanny y Miss Nanny',
        categoria: 'Servicios',
        contenido: 'Las Nannys se enfocan en cuidado básico y asistencia diaria, mientras que las Miss Nannys tienen carrera en educación o psicología infantil y se enfocan en estimulación oportuna y apoyo académico.',
      },
      {
        titulo: 'Políticas de Cancelación de Servicios',
        categoria: 'Políticas',
        contenido: 'Los servicios eventuales cancelados con menos de 24 horas de anticipación generan un cargo del 50% de la tarifa contratada. Los servicios mensuales fijos requieren un preaviso de 15 días.',
      },
      {
        titulo: 'Protocolos de Emergencia Médica',
        categoria: 'Emergencias',
        contenido: 'Todas nuestras nannys cuentan con certificación activa en Primeros Auxilios Pediátricos. En caso de incidente, el protocolo inmediato es: 1) Brindar soporte inicial, 2) Contactar al pediatra de cabecera del cliente, 3) Avisar a los padres y 4) Coordinar traslado a centro médico si es necesario.',
      }
    ]
  });

  console.log('Respuestas rápidas y base de conocimiento creadas con éxito.');
  console.log('Carga de datos semilla completada satisfactoriamente.');
}

main()
  .catch((e) => {
    console.error('Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
