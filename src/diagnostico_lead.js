const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const lead = await prisma.lead.findFirst({
    where: {
      nombreCompleto: {
        contains: "Gerardo",
        mode: "insensitive"
      }
    },
    include: {
      hijos: true,
      notas: true
    }
  });

  console.log("=== LEAD DETECTADO ===");
  console.log(JSON.stringify(lead, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
