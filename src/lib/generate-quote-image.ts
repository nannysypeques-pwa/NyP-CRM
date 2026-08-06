/**
 * generate-quote-image.ts
 *
 * Genera la imagen PNG de una cotización a partir de los datos proporcionados
 * y la guarda como archivo estático permanente en public/cotizaciones/{id}.png.
 *
 * REGLA DE NEGOCIO CRÍTICA:
 *   - La imagen se genera UNA SOLA VEZ en el momento exacto del envío.
 *   - Una vez guardada, NO se puede editar ni regenerar.
 *   - Refleja exactamente los datos del momento en que se compartió con el cliente.
 */

import "../lib/initFontconfig";
import sharp from "sharp";
import path from "path";
import fs from "fs";

export interface QuoteImageData {
  id: string;
  creadoEn: Date;
  nombreCliente: string;
  edadPeque: string;
  dias: string;
  horaInicio: string;
  horaFin: string;
  horasPorDia: number;
  zona: string;
  total: number;
  notas: string | null;
  tipoServicio: string;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

/**
 * Genera la imagen PNG de la cotización y la guarda como archivo estático.
 * @returns La ruta URL pública del archivo guardado (ej: "/cotizaciones/{id}.png")
 *          o null si falló la generación.
 */
export async function generateAndSaveQuoteImage(data: QuoteImageData): Promise<string | null> {
  try {
    const templatePath = path.join(process.cwd(), "public", "images", "cotizacion_base.png");
    if (!fs.existsSync(templatePath)) {
      console.error("[QuoteImage] Plantilla base no encontrada:", templatePath);
      return null;
    }

    // Crear el directorio de salida si no existe
    const outputDir = path.join(process.cwd(), "public", "cotizaciones");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const rawFecha = new Date(data.creadoEn).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    const fecha = escapeXml(rawFecha.replace(/[\u200e\u200f\u202a-\u202e]/g, ""));
    const cliente = escapeXml(data.nombreCliente || "Por definir");
    const edadPeque = escapeXml(data.edadPeque || "Por definir");
    let horarioText = "";
    if (data.horaInicio && data.horaInicio !== "Por definir" && (!data.horaFin || data.horaFin === "Por definir" || data.horaFin === "")) {
      const parsedHrs = data.horasPorDia || (parseInt(data.horaInicio) || 0);
      horarioText = `${data.dias} • ${data.horaInicio} (${parsedHrs} ${parsedHrs === 1 ? 'hr' : 'hrs'}/día)`;
    } else {
      horarioText = `${data.dias} de ${data.horaInicio} a ${data.horaFin} (${data.horasPorDia} hrs/día)`;
    }
    const horario = escapeXml(horarioText);
    const zona = escapeXml(data.zona || "Por definir");
    const precio = escapeXml(`$${data.total.toLocaleString("es-MX")} MXN`);
    const precioDetalle = escapeXml(data.notas || "");
    const nota = escapeXml(data.tipoServicio || "Por definir");

    const svgOverlay = `
      <svg width="791" height="1024" xmlns="http://www.w3.org/2000/svg">
        <!-- Fecha -->
        <text x="145" y="210" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${fecha}</text>
        
        <!-- Nombre del cliente -->
        <text x="345" y="350" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${cliente}</text>
        
        <!-- Edad del peque -->
        <text x="305" y="400" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${edadPeque}</text>
        
        <!-- Horario -->
        <text x="210" y="450" font-family="Segoe UI, Arial, sans-serif" font-size="19" font-weight="600" fill="#3A3A3C">${horario}</text>
        
        <!-- Zona -->
        <text x="180" y="507" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${zona}</text>
        
        <!-- Precio -->
        <text x="200" y="562" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" fill="#D53F8C">${precio}</text>
        <text x="200" y="588" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="500" fill="#718096" font-style="italic">${precioDetalle}</text>
        
        <!-- Nota -->
        <text x="170" y="665" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="600" fill="#3A3A3C">${nota}</text>
      </svg>
    `;

    const pngBuffer = await sharp(templatePath)
      .composite([{
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0
      }])
      .png()
      .toBuffer();

    const outputPath = path.join(outputDir, `${data.id}.png`);
    fs.writeFileSync(outputPath, pngBuffer);

    const publicUrl = `/cotizaciones/${data.id}.png`;
    console.log(`[QuoteImage] ✅ Imagen congelada guardada: ${outputPath}`);
    return publicUrl;
  } catch (err: any) {
    console.error("[QuoteImage] ❌ Error al generar imagen de cotización:", err?.message || err);
    return null;
  }
}
