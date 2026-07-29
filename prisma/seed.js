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

  // 1. Obtener contraseñas seguras desde variables de entorno (con fallbacks solo para desarrollo local)
  const gerentePassword = process.env.SEED_GERENTE_PASSWORD || "gerardo123";
  const coordinadorPassword = process.env.SEED_COORDINADOR_PASSWORD || "ana123";
  const vendedorLauraPassword = process.env.SEED_VENDEDOR_LAURA_PASSWORD || "laura123";
  const vendedorCarlosPassword = process.env.SEED_VENDEDOR_CARLOS_PASSWORD || "carlos123";

  // Crear Usuarios base con Roles y Ciudades asignadas
  const gerenteGerardo = await prisma.usuario.create({
    data: {
      id: 'gerente-gerardo',
      nombre: 'Gerardo Pineda',
      email: 'gerardo@nannysypeques.com',
      contrasenaHash: hashPassword(gerentePassword),
      rol: 'GERENTE',
      estado: 'ACTIVE',
    }
  });

  const coordinadorAna = await prisma.usuario.create({
    data: {
      id: 'coordinador-ana',
      nombre: 'Ana Beltrán',
      email: 'ana@nannysypeques.com',
      contrasenaHash: hashPassword(coordinadorPassword),
      rol: 'COORDINADORA',
      estado: 'ACTIVE',
    }
  });

  const vendedorLaura = await prisma.usuario.create({
    data: {
      id: 'vendedor-laura',
      nombre: 'Laura Méndez',
      email: 'laura@nannysypeques.com',
      contrasenaHash: hashPassword(vendedorLauraPassword),
      rol: 'VENDEDORA',
      ciudad: 'Puebla',
      estado: 'ACTIVE',
    }
  });

  const vendedorCarlos = await prisma.usuario.create({
    data: {
      id: 'vendedor-carlos',
      nombre: 'Carlos Ruiz',
      email: 'carlos@nannysypeques.com',
      contrasenaHash: hashPassword(vendedorCarlosPassword),
      rol: 'VENDEDORA',
      ciudad: 'CDMX',
      estado: 'ACTIVE',
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
