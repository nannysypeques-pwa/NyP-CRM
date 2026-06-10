const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando limpieza y preparación de base de datos limpia...');

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

  console.log('Base de datos limpiada con éxito.');

  // 1. Crear Usuarios base (Agentes comerciales)
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

  console.log('Usuarios agentes comerciales creados con éxito.');
  console.log('Base de datos lista para producción.');
}

main()
  .catch((e) => {
    console.error('Error durante la ejecución de la limpieza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
