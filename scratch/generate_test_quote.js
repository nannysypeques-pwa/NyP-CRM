const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const templatePath = "C:\\Users\\Gerardo Pineda\\.gemini\\antigravity\\brain\\f659baf8-eae9-4d57-a8f9-7b9796e714c8\\media__1782435130875.png";
const outputPath = "C:\\Users\\Gerardo Pineda\\.gemini\\antigravity\\brain\\f659baf8-eae9-4d57-a8f9-7b9796e714c8\\media__sample_quote.png";

async function generateSampleQuote() {
  try {
    const data = {
      fecha: "25/06/2026",
      cliente: "Gerardo Pineda",
      edadPeque: "4 años",
      horario: "Lunes a Viernes de 9:00am a 5:00pm (8 horas/día)",
      zona: "Lomas de Angelópolis",
      precio: "$2,800 MXN",
      precioDetalle: "(Precotización estimada semanal por 40 horas de servicio)",
      nota: "Servicio fijo semanal. No incluye IVA.",
      notaDetalle: "Las horas extra tienen un costo de $100 pesos c/u."
    };

    // Width = 791, Height = 1024
    // We create an SVG overlay with text elements positioned exactly
    // y-coordinates are adjusted to sit slightly above the underline lines
    const svgOverlay = `
      <svg width="791" height="1024" xmlns="http://www.w3.org/2000/svg">
        <style>
          .val {
            font-family: 'Segoe UI', 'Arial', sans-serif;
            font-size: 20px;
            font-weight: 600;
            fill: #3A3A3C;
          }
          .bold-val {
            font-family: 'Segoe UI', 'Arial', sans-serif;
            font-size: 22px;
            font-weight: 700;
            fill: #D53F8C; /* Pink brand color */
          }
          .sub-val {
            font-family: 'Segoe UI', 'Arial', sans-serif;
            font-size: 16px;
            font-weight: 500;
            fill: #718096;
            font-style: italic;
          }
        </style>
        
        <!-- Fecha -->
        <text x="120" y="200" class="val">${data.fecha}</text>
        
        <!-- Nombre del cliente -->
        <text x="350" y="340" class="val">${data.cliente}</text>
        
        <!-- Edad del peque -->
        <text x="310" y="390" class="val">${data.edadPeque}</text>
        
        <!-- Horario -->
        <text x="210" y="440" class="val">${data.horario}</text>
        
        <!-- Zona -->
        <text x="180" y="490" class="val">${data.zona}</text>
        
        <!-- Precio -->
        <text x="200" y="565" class="bold-val">${data.precio}</text>
        <text x="200" y="615" class="sub-val">${data.precioDetalle}</text>
        
        <!-- Nota -->
        <text x="170" y="670" class="val">${data.nota}</text>
        <text x="200" y="730" class="sub-val">${data.notaDetalle}</text>
      </svg>
    `;

    await sharp(templatePath)
      .composite([{
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0
      }])
      .toFile(outputPath);

    console.log("Sample quote image generated successfully at:", outputPath);
  } catch (err) {
    console.error("Error generating sample quote image:", err);
  }
}

generateSampleQuote();
