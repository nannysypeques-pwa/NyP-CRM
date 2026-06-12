const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

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

  // 1. Crear Usuarios base con Roles y Ciudades asignadas
  const gerenteGerardo = await prisma.usuario.create({
    data: {
      id: 'gerente-gerardo',
      nombre: 'Gerardo Pineda',
      email: 'gerardo@nannysypeques.com',
      contrasenaHash: hashPassword('gerardo123'),
      rol: 'GERENTE',
      estado: 'ACTIVE',
      urlAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    }
  });

  const coordinadorAna = await prisma.usuario.create({
    data: {
      id: 'coordinador-ana',
      nombre: 'Ana Beltrán',
      email: 'ana@nannysypeques.com',
      contrasenaHash: hashPassword('ana123'),
      rol: 'COORDINADOR',
      estado: 'ACTIVE',
      urlAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    }
  });

  const vendedorLaura = await prisma.usuario.create({
    data: {
      id: 'vendedor-laura',
      nombre: 'Laura Méndez',
      email: 'laura@nannysypeques.com',
      contrasenaHash: hashPassword('laura123'),
      rol: 'VENDEDOR',
      ciudad: 'Puebla',
      estado: 'ACTIVE',
      urlAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    }
  });

  const vendedorCarlos = await prisma.usuario.create({
    data: {
      id: 'vendedor-carlos',
      nombre: 'Carlos Ruiz',
      email: 'carlos@nannysypeques.com',
      contrasenaHash: hashPassword('carlos123'),
      rol: 'VENDEDOR',
      ciudad: 'CDMX',
      estado: 'ACTIVE',
      urlAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    }
  });

  console.log('Usuarios base creados con éxito.');
  console.log('Base de datos lista para pruebas de roles.');
}

main()
  .catch((e) => {
    console.error('Error durante la ejecución de la limpieza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
