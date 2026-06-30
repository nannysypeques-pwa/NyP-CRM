const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando actualización de la regla de edades (desde 3 años) en la base de datos...");

  // Actualizar Precios, tarifas y condiciones económicas (ID: d8b8079d-cd7f-4cab-b8b8-4836de1965b7)
  const docPrecios = await prisma.documentoConocimiento.findUnique({
    where: { id: "d8b8079d-cd7f-4cab-b8b8-4836de1965b7" }
  });

  if (docPrecios) {
    let contentPrecios = docPrecios.contenido;
    
    // Buscar y reemplazar la regla de edad mayor de 3 años por 3 o más años
    const oldPhrase1 = "Si ambos niños son mayores de 3 años de edad Y sus edades son similares, es decir, la diferencia entre sus edades no rebasa los 2 años (ej. 4 y 6 años, o 5 y 7 años)";
    const newPhrase1 = "Si ambos niños tienen 3 o más años de edad Y sus edades son similares, es decir, la diferencia entre sus edades no rebasa los 2 años (ej. 3 y 5 años, 4 y 6 años, o 5 y 7 años)";
    
    const oldPhrase2 = "Si NO se cumple esta regla (es decir: uno de los dos niños es menor de 3 años, OR la diferencia de edad entre ambos es mayor a 2 años)";
    const newPhrase2 = "Si NO se cumple esta regla (es decir: al menos uno de los dos niños es menor de 3 años, OR la diferencia de edad entre ambos es mayor a 2 años)";

    if (contentPrecios.includes(oldPhrase1)) {
      contentPrecios = contentPrecios.replace(oldPhrase1, newPhrase1);
    } else {
      // Fallback in case of minor text variations
      contentPrecios = contentPrecios.replace(
        "Si ambos niños son mayores de 3 años de edad Y sus edades son similares",
        "Si ambos niños tienen 3 o más años de edad Y sus edades son similares"
      );
    }
    
    if (contentPrecios.includes(oldPhrase2)) {
      contentPrecios = contentPrecios.replace(oldPhrase2, newPhrase2);
    } else {
      contentPrecios = contentPrecios.replace(
        "uno de los dos niños es menor de 3 años",
        "al menos uno de los dos niños es menor de 3 años"
      );
    }

    await prisma.documentoConocimiento.update({
      where: { id: "d8b8079d-cd7f-4cab-b8b8-4836de1965b7" },
      data: { contenido: contentPrecios }
    });
    console.log("Documento Precios y tarifas (regla desde 3 años) actualizado con éxito.");
  } else {
    console.log("No se encontró el documento de precios y tarifas.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
